"""Monte Carlo Simulation Job Handler - Enhanced with confidence intervals, tornado sensitivity, distributions"""
import json
import os
from datetime import datetime, timezone
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from scipy import stats
from utils.db import get_db_connection
from utils.s3 import upload_bytes_to_s3, download_from_s3
from utils.logger import setup_logger
from utils.timer import CPUTimer, get_cpu_time
from jobs.runner import check_cancel_requested, mark_cancelled, update_progress, extend_visibility, queue_job
from jobs.three_statement_engine import compute_three_statements

logger = setup_logger()

# Configuration from environment
WORKER_CONCURRENCY = int(os.getenv('WORKER_CONCURRENCY', '4'))
MONTECARLO_CHUNK_RAM_BYTES = int(os.getenv('MONTECARLO_CHUNK_RAM_BYTES', '1500000000'))  # 1.5GB
MONTECARLO_TEMP_DIR = os.getenv('MONTECARLO_TEMP_DIR', '/tmp/monte')
S3_BUCKET = os.getenv('S3_BUCKET_NAME')

# Ensure temp directory exists
os.makedirs(MONTECARLO_TEMP_DIR, exist_ok=True)

# Distribution definitions
DISTRIBUTION_DEFINITIONS = {
    'normal': {
        'name': 'Normal (Gaussian)',
        'params': ['mu', 'sigma'],
        'description': 'Symmetric bell curve distribution',
    },
    'lognormal': {
        'name': 'Log-Normal',
        'params': ['mu', 'sigma'],
        'description': 'Logarithm of values follows normal distribution',
    },
    'triangular': {
        'name': 'Triangular',
        'params': ['min', 'mode', 'max'],
        'description': 'Triangular distribution with min, mode, max',
    },
    'uniform': {
        'name': 'Uniform',
        'params': ['min', 'max'],
        'description': 'Uniform distribution between min and max',
    },
    'beta': {
        'name': 'Beta',
        'params': ['alpha', 'beta', 'min', 'max'],
        'description': 'Beta distribution scaled to [min, max]',
    },
    'gamma': {
        'name': 'Gamma',
        'params': ['shape', 'scale'],
        'description': 'Gamma distribution for positive values',
    },
}


def sample_distribution(dist_type: str, params: Dict, size: Tuple[int, ...], rng: np.random.Generator) -> np.ndarray:
    """
    Sample from a distribution with robust error handling.
    
    Args:
        dist_type: Distribution type (normal, lognormal, triangular, uniform, beta, gamma)
        params: Distribution parameters
        size: Output shape
        rng: NumPy random generator
    
    Returns:
        Array of samples
    """
    try:
        if dist_type == 'normal':
            mu = float(params.get('mu', 0))
            sigma = max(float(params.get('sigma', 1)), 1e-10)  # Avoid zero sigma
            return rng.normal(mu, sigma, size=size)
        
        elif dist_type == 'lognormal':
            mu = float(params.get('mu', 0))
            sigma = max(float(params.get('sigma', 1)), 1e-10)
            return np.exp(rng.normal(mu, sigma, size=size))
        
        elif dist_type == 'triangular':
            left = float(params.get('min', 0))
            mode = float(params.get('mode', 0.5))
            right = float(params.get('max', 1))
            if not (left <= mode <= right):
                raise ValueError(f"Invalid triangular params: min={left}, mode={mode}, max={right}")
            return rng.triangular(left, mode, right, size=size)
        
        elif dist_type == 'uniform':
            low = float(params.get('min', 0))
            high = float(params.get('max', 1))
            if high <= low:
                raise ValueError(f"Invalid uniform params: min={low}, max={high}")
            return rng.uniform(low, high, size=size)
        
        elif dist_type == 'beta':
            alpha = max(float(params.get('alpha', 2)), 1e-10)
            beta = max(float(params.get('beta', 2)), 1e-10)
            min_val = float(params.get('min', 0))
            max_val = float(params.get('max', 1))
            # Sample from standard beta [0, 1], then scale
            samples = rng.beta(alpha, beta, size=size)
            return samples * (max_val - min_val) + min_val
        
        elif dist_type == 'gamma':
            shape = max(float(params.get('shape', 2)), 1e-10)
            scale = max(float(params.get('scale', 1)), 1e-10)
            return rng.gamma(shape, scale, size=size)
        
        else:
            # Default: constant value
            value = float(params.get('value', 0))
            return np.full(size, value)
    
    except Exception as e:
        logger.warning(f"Error sampling {dist_type} distribution: {str(e)}, falling back to constant")
        value = float(params.get('value', 0))
        return np.full(size, value)


def compute_confidence_intervals(results: np.ndarray, confidence_levels: List[float] = [0.80, 0.90, 0.95]) -> Dict:
    """
    Compute confidence intervals for simulation results (optimized with error handling).
    
    Args:
        results: Array of shape (num_simulations, months)
        confidence_levels: List of confidence levels (e.g., [0.80, 0.90, 0.95])
    
    Returns:
        Dictionary with confidence intervals per month
    """
    try:
        # Validate input
        if results.size == 0:
            logger.warning("Empty results array for confidence intervals")
            return {}
        
        if len(results.shape) != 2:
            logger.error(f"Results must be 2D array, got shape {results.shape}")
            return {}
        
        num_sims, num_months = results.shape
        
        # Ensure float64 for numerical stability
        if results.dtype != np.float64:
            results = results.astype(np.float64)
        
        # Check for NaN/Inf
        if np.any(np.isnan(results)) or np.any(np.isinf(results)):
            logger.warning("NaN or Inf values detected in results for CI, replacing with zeros")
            results = np.nan_to_num(results, nan=0.0, posinf=0.0, neginf=0.0)
        
        intervals = {}
        
        for conf_level in confidence_levels:
            try:
                if not (0 < conf_level < 1):
                    logger.warning(f"Invalid confidence level: {conf_level}, skipping")
                    continue
                
                alpha = 1 - conf_level
                lower_percentile = (alpha / 2) * 100
                upper_percentile = (1 - alpha / 2) * 100
                
                # Compute percentiles across simulations (axis=0) - vectorized
                try:
                    lower = np.percentile(results, lower_percentile, axis=0, method='linear')
                    upper = np.percentile(results, upper_percentile, axis=0, method='linear')
                except Exception as e:
                    logger.warning(f"Error computing percentiles for CI {conf_level}: {str(e)}, using fallback")
                    lower = np.percentile(results, lower_percentile, axis=0)
                    upper = np.percentile(results, upper_percentile, axis=0)
                
                # Round for consistency
                lower = np.round(lower, 2)
                upper = np.round(upper, 2)
                
                intervals[f'ci_{int(conf_level * 100)}'] = {
                    'lower': lower.tolist(),
                    'upper': upper.tolist(),
                    'width': np.round(upper - lower, 2).tolist(),
                }
            except Exception as e:
                logger.warning(f"Error computing CI for level {conf_level}: {str(e)}")
                continue
        
        return intervals
    except Exception as e:
        logger.error(f"Error computing confidence intervals: {str(e)}", exc_info=True)
        return {}


def compute_tornado_sensitivity(
    results: np.ndarray,
    drivers: Dict[str, Dict],
    driver_samples: Dict[str, np.ndarray],
    months: int
) -> Dict:
    """
    Compute tornado sensitivity analysis (correlation between drivers and outcomes).
    
    Args:
        results: Array of shape (num_simulations, months)
        drivers: Driver definitions
        driver_samples: Dictionary of driver sample arrays
        months: Number of months
    
    Returns:
        Dictionary with sensitivity metrics per driver
    """
    try:
        num_sims = results.shape[0]
        sensitivity = {}
        
        # For each driver, compute correlation with final month cash
        final_month_cash = results[:, -1]  # Last month
        
        for driver_name, driver_config in drivers.items():
            if driver_name not in driver_samples:
                continue
            
            driver_values = driver_samples[driver_name][:, -1]  # Last month values
            
            # Compute Pearson correlation
            if len(driver_values) > 1 and np.std(driver_values) > 1e-10:
                correlation = np.corrcoef(driver_values, final_month_cash)[0, 1]
                
                # Compute rank correlation (Spearman) for robustness
                try:
                    from scipy.stats import spearmanr
                    rank_corr, _ = spearmanr(driver_values, final_month_cash)
                except:
                    rank_corr = correlation
                
                sensitivity[driver_name] = {
                    'pearson_correlation': float(correlation) if not np.isnan(correlation) else 0.0,
                    'spearman_correlation': float(rank_corr) if not np.isnan(rank_corr) else 0.0,
                    'abs_correlation': float(abs(correlation)) if not np.isnan(correlation) else 0.0,
                }
        
        # Sort by absolute correlation (most sensitive first)
        sorted_sensitivity = dict(sorted(
            sensitivity.items(),
            key=lambda x: x[1]['abs_correlation'],
            reverse=True
        ))
        
        return sorted_sensitivity
    except Exception as e:
        logger.error(f"Error computing tornado sensitivity: {str(e)}", exc_info=True)
        return {}


def handle_monte_carlo(job_id: str, org_id: str, object_id: str, logs: dict):
    """Handle Monte Carlo simulation job with vectorized NumPy"""
    logger.info(f"Processing Monte Carlo job {job_id}")
    
    from jobs.runner import check_cancel_requested, mark_cancelled, update_progress, extend_visibility
    
    conn = None
    cursor = None
    cpu_timer = CPUTimer()
    mc_job_id = None
    
    try:
        # Check for cancellation before starting
        if check_cancel_requested(job_id):
            mark_cancelled(job_id)
            return
        
        with cpu_timer:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            mc_job_id = object_id
            if not mc_job_id:
                mc_job_id = logs.get('params', {}).get('monteCarloJobId')
            
            if not mc_job_id:
                raise ValueError("Monte Carlo job ID not found")
            
            # Get Monte Carlo job with all parameters
            cursor.execute("""
                SELECT 
                    num_simulations, 
                    "modelRunId",
                    "orgId",
                    params_hash
                FROM monte_carlo_jobs
                WHERE id = %s
            """, (mc_job_id,))
            
            mc_job = cursor.fetchone()
            if not mc_job:
                raise ValueError(f"Monte Carlo job {mc_job_id} not found")
            
            num_simulations = mc_job[0]
            model_run_id = mc_job[1]
            org_id = mc_job[2]
            params_hash = mc_job[3]
            
            # Get job parameters from logs
            params = logs.get('params', {})
            drivers_raw = params.get('drivers', {})
            overrides = params.get('overrides', {})
            random_seed = params.get('randomSeed')
            mode = params.get('mode', 'full')
            
            # Normalize drivers to dictionary format
            # Handle both list and dict formats
            if isinstance(drivers_raw, list):
                # Convert list of driver objects to dict
                drivers = {}
                for driver in drivers_raw:
                    if isinstance(driver, dict):
                        # Try to find a suitable key: id, name, key, or driver field
                        driver_name = (driver.get('id') or 
                                      driver.get('name') or 
                                      driver.get('key') or 
                                      driver.get('driver') or
                                      driver.get('driverName'))
                        if driver_name:
                            # Use the driver_name as key, and store the full driver config
                            # Ensure it has the expected structure for distribution sampling
                            drivers[str(driver_name)] = {
                                'dist': driver.get('distribution') or driver.get('dist') or 'normal',
                                'mean': driver.get('mean') or driver.get('mu') or 0.0,
                                'std': driver.get('stdDev') or driver.get('std') or driver.get('sigma') or 1.0,
                                'min': driver.get('min'),
                                'max': driver.get('max'),
                                **driver  # Include all other fields
                            }
                        else:
                            # If no name/id, use index
                            drivers[f"driver_{len(drivers)}"] = {
                                'dist': driver.get('distribution') or driver.get('dist') or 'normal',
                                'mean': driver.get('mean') or driver.get('mu') or 0.0,
                                'std': driver.get('stdDev') or driver.get('std') or driver.get('sigma') or 1.0,
                                'min': driver.get('min'),
                                'max': driver.get('max'),
                                **driver
                            }
                    else:
                        # If it's not a dict, skip it
                        logger.warning(f"Skipping invalid driver format: {type(driver)}")
                if not drivers:
                    # If list is empty or couldn't parse, use empty dict
                    logger.warning("No valid drivers found after normalization, using empty dict")
                    drivers = {}
                else:
                    logger.info(f"Normalized {len(drivers_raw)} drivers from list to dict with {len(drivers)} entries")
            elif isinstance(drivers_raw, dict):
                drivers = drivers_raw
            else:
                # If it's neither list nor dict, default to empty dict
                logger.warning(f"Drivers format not recognized: {type(drivers_raw)}, using empty dict")
                drivers = {}
            
            # Derive seed from paramsHash + randomSeed (deterministic)
            # Use hash of params_hash string to ensure reproducibility
            if random_seed is not None:
                # Combine params_hash and random_seed for deterministic seed
                seed_str = f"{params_hash}_{random_seed}"
                seed = abs(hash(seed_str)) % (2**31 - 1)  # Use positive seed (max 2^31-1)
            else:
                seed = abs(hash(str(params_hash))) % (2**31 - 1)  # Use positive seed
            
            logger.info(f"Running {num_simulations} simulations with seed {seed}")
            
            # Update status to running
            try:
                cursor.execute("""
                    UPDATE monte_carlo_jobs
                    SET status = 'running'
                    WHERE id = %s
                """, (mc_job_id,))
                
                cursor.execute("""
                    UPDATE jobs 
                    SET progress = 5, updated_at = NOW(), logs = %s 
                    WHERE id = %s
                """, (json.dumps({**logs, 'status': 'loading_model'}), job_id))
                conn.commit()
            except Exception as status_error:
                # Rollback and retry
                try:
                    conn.rollback()
                    cursor.execute("""
                        UPDATE monte_carlo_jobs
                        SET status = 'running'
                        WHERE id = %s
                    """, (mc_job_id,))
                    cursor.execute("""
                        UPDATE jobs 
                        SET progress = 5, updated_at = NOW(), logs = %s 
                        WHERE id = %s
                    """, (json.dumps({**logs, 'status': 'loading_model'}), job_id))
                    conn.commit()
                except Exception as retry_error:
                    logger.error(f"Failed to update status even after retry: {str(retry_error)}")
                    raise
            
            # Load model snapshot (simplified - in production, load from S3 or DB)
            # For MVP, we'll use a simple model structure
            model_data = load_model_snapshot(model_run_id, cursor)
            
            # Determine number of months from model
            months = model_data.get('months', 12)  # Default 12 months
            month_keys = model_data.get('monthKeys', [f"2025-{i+1:02d}" for i in range(months)])
            
            # Update progress
            try:
                cursor.execute("""
                    UPDATE jobs 
                    SET progress = 10, updated_at = NOW(), logs = %s 
                    WHERE id = %s
                """, (json.dumps({**logs, 'status': 'preparing_simulations', 'months': months}), job_id))
                conn.commit()
            except Exception as progress_error:
                # Rollback and continue - progress update is non-critical
                try:
                    conn.rollback()
                except:
                    pass
                logger.warning(f"Error updating progress (non-critical): {str(progress_error)}")
            
            # Check if we need chunking (more accurate memory estimation)
            # Estimate: num_sims × months × num_drivers × 8 bytes (float64) + overhead
            num_drivers = max(len(drivers), 1)
            # Account for intermediate arrays (driver arrays + result arrays)
            estimated_memory = num_simulations * months * 8 * (num_drivers + 1) * 2  # 2x for intermediate arrays
            needs_chunking = estimated_memory > MONTECARLO_CHUNK_RAM_BYTES
            
            if needs_chunking:
                logger.info(f"Chunking required: estimated {estimated_memory / 1e9:.2f}GB memory")
                results, driver_samples = run_chunked_simulations_enhanced(
                    num_simulations, months, drivers, overrides, seed, 
                    job_id, cursor, conn, logs, model_data
                )
            else:
                logger.info(f"Running vectorized simulations: {num_simulations} sims × {months} months")
                results, driver_samples = run_vectorized_simulations_enhanced(
                    num_simulations, months, drivers, overrides, seed,
                    job_id, cursor, conn, logs, model_data
                )
            
            # Calculate percentiles and confidence intervals
            try:
                cursor.execute("""
                    UPDATE jobs 
                    SET progress = 85, updated_at = NOW(), logs = %s 
                    WHERE id = %s
                """, (json.dumps({**logs, 'status': 'calculating_percentiles'}), job_id))
                conn.commit()
            except Exception as progress_error:
                # Rollback and continue - progress update is non-critical
                try:
                    conn.rollback()
                except:
                    pass
                logger.warning(f"Error updating progress (non-critical): {str(progress_error)}")
            
            percentiles_data = compute_percentiles(results, month_keys)
            
            # Calculate survival probability (MVP FEATURE - Probability of survival, not point forecast)
            try:
                # Get initial cash from model data
                initial_cash = 0.0
                if model_data:
                    baseline = model_data.get('baseline', {})
                    if isinstance(baseline, dict):
                        initial_cash = float(baseline.get('cash', baseline.get('cashBalance', baseline.get('initialCash', 0.0))))
                    # Also try to get from summary_json if available
                    if initial_cash == 0.0:
                        try:
                            cursor.execute("""
                                SELECT summary_json->>'cashBalance'
                                FROM model_runs
                                WHERE id = %s
                            """, (model_run_id,))
                            summary_row = cursor.fetchone()
                            if summary_row and summary_row[0]:
                                initial_cash = float(summary_row[0])
                        except:
                            pass
                
                survival_probability = compute_survival_probability(results, month_keys, initial_cash)
                percentiles_data['survival_probability'] = survival_probability
            except Exception as e:
                logger.warning(f"Error computing survival probability: {str(e)}")
                percentiles_data['survival_probability'] = {}
            
            # Calculate confidence intervals
            try:
                confidence_intervals = compute_confidence_intervals(results, [0.80, 0.90, 0.95])
                percentiles_data['confidence_intervals'] = confidence_intervals
            except Exception as e:
                logger.warning(f"Error computing confidence intervals: {str(e)}")
                percentiles_data['confidence_intervals'] = {}
            
            # Calculate tornado sensitivity using driver samples
            tornado_sensitivity = {}
            sensitivity_json_str = json.dumps([], separators=(',', ':'))  # Initialize to empty array
            
            try:
                if driver_samples and len(driver_samples) > 0:
                    tornado_sensitivity = compute_tornado_sensitivity(
                        results, drivers, driver_samples, months
                    )
                    percentiles_data['tornado_sensitivity'] = tornado_sensitivity
                    
                    # Also format for sensitivity_json field (array format for frontend)
                    # Convert dict format to array format for easier frontend consumption
                    sensitivity_array = []
                    for driver_name, sensitivity_data in tornado_sensitivity.items():
                        # Calculate p-value using statistical test
                        try:
                            from scipy.stats import pearsonr
                            if driver_name in driver_samples:
                                driver_values = driver_samples[driver_name][:, -1]  # Last month
                                final_cash = results[:, -1]
                                if len(driver_values) > 2 and np.std(driver_values) > 1e-10:
                                    _, p_value = pearsonr(driver_values, final_cash)
                                else:
                                    p_value = 1.0
                            else:
                                p_value = 1.0
                        except Exception as p_error:
                            logger.warning(f"Error calculating p-value for {driver_name}: {str(p_error)}")
                            p_value = 1.0
                        
                        sensitivity_array.append({
                            'driver': driver_name,
                            'correlation': sensitivity_data.get('pearson_correlation', 0.0),
                            'spearman_correlation': sensitivity_data.get('spearman_correlation', 0.0),
                            'abs_correlation': sensitivity_data.get('abs_correlation', 0.0),
                            'p_value': float(p_value) if not np.isnan(p_value) else 1.0,
                        })
                    
                    # Store as JSON string for sensitivity_json field
                    sensitivity_json_str = json.dumps(sensitivity_array, separators=(',', ':'))
                    logger.info(f"Computed sensitivity for {len(sensitivity_array)} drivers")
                else:
                    logger.warning("No driver_samples available for sensitivity analysis")
                    percentiles_data['tornado_sensitivity'] = {}
            except Exception as e:
                logger.warning(f"Error computing tornado sensitivity: {str(e)}", exc_info=True)
                percentiles_data['tornado_sensitivity'] = {}
                sensitivity_json_str = json.dumps([], separators=(',', ':'))
            
            # Add distribution definitions metadata
            percentiles_data['distribution_definitions'] = DISTRIBUTION_DEFINITIONS
            
            # Upload results to S3 (optional - fallback to database if S3 not configured)
            result_key = None
            result_json = json.dumps(percentiles_data, separators=(',', ':'))
            
            if S3_BUCKET:
                try:
                    result_key = f"montecarlo/{org_id}/{model_run_id}/{params_hash}-{num_simulations}.json"
                    upload_bytes_to_s3(result_key, result_json.encode('utf-8'), 'application/json')
                    logger.info(f"Uploaded Monte Carlo results to S3: {result_key}")
                except Exception as s3_error:
                    logger.warning(f"Failed to upload to S3 (storing in DB instead): {str(s3_error)}")
                    result_key = None
            else:
                logger.info("S3 not configured, storing results in database only")
            
            # Get CPU time
            cpu_seconds = cpu_timer.elapsed()
            
            # Store full results in percentiles_json (always store in DB, S3 is optional)
            # Store the complete percentiles_data, not just percentiles_table
            percentiles_json_full = json.dumps(percentiles_data, separators=(',', ':'))
            
            # Update Monte Carlo job - CRITICAL: Commit this first
            # Save sensitivity_json separately for frontend access
            try:
                cursor.execute("""
                    UPDATE monte_carlo_jobs
                    SET status = 'done',
                        result_s3 = %s,
                        percentiles_json = %s::jsonb,
                        sensitivity_json = %s::jsonb,
                        cpu_seconds_estimate = %s,
                        cpu_seconds_actual = %s,
                        finished_at = NOW()
                    WHERE id = %s
                """, (result_key, percentiles_json_full, sensitivity_json_str, float(cpu_seconds), float(cpu_seconds), mc_job_id))
                conn.commit()
                logger.info(f"Monte Carlo job {mc_job_id} marked as done and committed with sensitivity data")
            except Exception as update_error:
                # Rollback and retry
                conn.rollback()
                logger.warning(f"Error updating monte_carlo_jobs, retrying: {str(update_error)}")
                try:
                    cursor.execute("""
                        UPDATE monte_carlo_jobs
                        SET status = 'done',
                            result_s3 = %s,
                            percentiles_json = %s::jsonb,
                            sensitivity_json = %s::jsonb,
                            cpu_seconds_estimate = %s,
                            cpu_seconds_actual = %s,
                            finished_at = NOW()
                        WHERE id = %s
                    """, (result_key, percentiles_json_full, sensitivity_json_str, float(cpu_seconds), float(cpu_seconds), mc_job_id))
                    conn.commit()
                except Exception as retry_error:
                    logger.error(f"Failed to update monte_carlo_jobs even after retry: {str(retry_error)}")
                    # Try without sensitivity_json as fallback
                    try:
                        cursor.execute("""
                            UPDATE monte_carlo_jobs
                            SET status = 'done',
                                result_s3 = %s,
                                percentiles_json = %s::jsonb,
                                cpu_seconds_estimate = %s,
                                finished_at = NOW()
                            WHERE id = %s
                        """, (result_key, percentiles_json_full, float(cpu_seconds), mc_job_id))
                        conn.commit()
                        logger.warning(f"Updated monte_carlo_jobs without sensitivity_json due to error")
                    except Exception as fallback_error:
                        logger.error(f"Failed even fallback update: {str(fallback_error)}")
                        raise
            
            # Record billing usage (non-critical - use separate transaction)
            try:
                record_billing_usage(org_id, cpu_seconds, cursor)
                conn.commit()
            except Exception as billing_error:
                try:
                    conn.rollback()
                except:
                    pass
                logger.warning(f"Error recording billing usage (non-critical, job already saved): {str(billing_error)}")
            
            # Update job status (non-critical - use separate transaction)
            # CRITICAL: Set progress to 100 for completed jobs
            try:
                cursor.execute("""
                    UPDATE jobs 
                    SET progress = 100, status = 'done', updated_at = NOW(), finished_at = NOW(), logs = %s::jsonb
                    WHERE id = %s
                """, (json.dumps({
                    **logs, 
                    'status': 'completed',
                    'resultS3': result_key,
                    'cpuSeconds': cpu_seconds,
                    'cpuSecondsActual': cpu_seconds,
                    'months': months,
                    'numSimulations': num_simulations,
                    'hasSensitivity': len(tornado_sensitivity) > 0,
                    'sensitivityDrivers': len(tornado_sensitivity),
                }), job_id))
                conn.commit()
                logger.info(f"Job {job_id} marked as done with progress 100%")
            except Exception as job_update_error:
                try:
                    conn.rollback()
                    # Retry with simpler log structure
                    cursor.execute("""
                        UPDATE jobs 
                        SET progress = 100, status = 'done', updated_at = NOW(), finished_at = NOW(), logs = %s::jsonb
                        WHERE id = %s
                    """, (json.dumps({
                        'status': 'completed',
                        'resultS3': result_key,
                    }), job_id))
                    conn.commit()
                    logger.info(f"Job {job_id} updated on retry with progress 100%")
                except Exception as retry_error:
                    logger.warning(f"Error updating job status (non-critical, monte carlo job already saved): {str(retry_error)}")
            
            logger.info(f"✅ Monte Carlo job {mc_job_id} completed: {num_simulations} sims, {cpu_seconds:.2f}s CPU")
            
            # Trigger alert check
            try:
                # Use model_run_id as object_id for alert check
                queue_job('alert_check', org_id, model_run_id, {'source': 'monte_carlo', 'monteCarloJobId': mc_job_id})
                logger.info(f"Triggered alert check for monte carlo run {mc_job_id}")
            except Exception as e:
                logger.warning(f"Failed to trigger alert check: {str(e)}")
            
    except Exception as e:
        logger.error(f"❌ Monte Carlo job failed: {str(e)}", exc_info=True)
        
        # Mark as failed (only if we have connection)
        if conn and cursor and mc_job_id:
            try:
                # Rollback any failed transaction first
                try:
                    conn.rollback()
                except:
                    pass
                
                error_logs = {**logs, 'error': str(e), 'failed_at': datetime.now(timezone.utc).isoformat()}
                cursor.execute("""
                    UPDATE monte_carlo_jobs
                    SET status = 'failed'
                    WHERE id = %s
                """, (mc_job_id,))
                
                cursor.execute("""
                    UPDATE jobs 
                    SET status = 'failed', updated_at = NOW(), logs = %s 
                    WHERE id = %s
                """, (json.dumps(error_logs), job_id))
                conn.commit()
            except Exception as db_error:
                logger.error(f"Failed to update job status: {str(db_error)}")
                try:
                    conn.rollback()
                except:
                    pass
        
        raise
    finally:
        # Clean up resources
        if cursor:
            try:
                cursor.close()
            except:
                pass
        if conn:
            try:
                conn.close()
            except:
                pass


def load_model_snapshot(model_run_id: str, cursor) -> dict:
    """Load model snapshot from model_run or model"""
    try:
        cursor.execute("""
            SELECT mr.result_s3, m.model_json, mr.run_type
            FROM model_runs mr
            JOIN models m ON mr."modelId" = m.id
            WHERE mr.id = %s
        """, (model_run_id,))
        
        row = cursor.fetchone()
        if not row:
            raise ValueError(f"Model run {model_run_id} not found")
        
        result_s3 = row[0]
        model_json = row[1]
        run_type = row[2]
        
        # Extract months from model_json if available
        months = 12  # Default
        if model_json and isinstance(model_json, dict):
            if 'timeHorizon' in model_json:
                months = int(model_json.get('timeHorizon', 12))
            elif 'months' in model_json:
                months = int(model_json.get('months', 12))
            elif 'periods' in model_json:
                months = int(model_json.get('periods', 12))
        
        # Generate month keys
        current_year = datetime.now().year
        month_keys = [f"{current_year}-{i+1:02d}" for i in range(months)]
        
        return {
            'months': months,
            'monthKeys': month_keys,
            'baseline': model_json if model_json else {},
            'resultS3': result_s3,
            'runType': run_type,
        }
    except Exception as e:
        logger.error(f"Error loading model snapshot: {str(e)}", exc_info=True)
        raise


def run_vectorized_simulations_enhanced(
    num_simulations: int,
    months: int,
    drivers: Dict[str, Dict],
    overrides: Dict,
    seed: int,
    job_id: str,
    cursor,
    conn,
    logs: dict,
    model_data: Dict = None
) -> Tuple[np.ndarray, Dict[str, np.ndarray]]:
    """
    Run vectorized simulations using NumPy with enhanced distribution support.
    Optimized for performance with proper error handling.
    """
    try:
        # Validate inputs
        if num_simulations <= 0 or months <= 0:
            raise ValueError(f"Invalid dimensions: num_simulations={num_simulations}, months={months}")
        
        # Initialize random number generator with seed
        try:
            rng = np.random.default_rng(seed)
        except Exception as e:
            logger.warning(f"Error initializing RNG with seed {seed}, using default: {str(e)}")
            rng = np.random.default_rng()
        
        # Prepare results array: we want to track Ending Cash as the primary output
        results = np.zeros((num_simulations, months), dtype=np.float64)
        
        # Prepare driver arrays (num_simulations × months) using enhanced distribution sampling
        driver_arrays = {}
        try:
            for driver_name, driver_config in drivers.items():
                dist_type = driver_config.get('dist', 'normal')
                driver_arrays[driver_name] = sample_distribution(
                    dist_type, driver_config, (num_simulations, months), rng
                )
        except Exception as e:
            logger.error(f"Error preparing driver arrays: {str(e)}", exc_info=True)
            raise
        
        # Apply model computation using ThreeStatementEngine for EACH path
        # This ensures full 3-statement integrity for every simulation
        try:
            # Get baseline values and assumptions
            baseline = model_data.get('baseline', {}) if model_data else {}
            initial_values = {
                'cash': float(baseline.get('cash', baseline.get('cashBalance', 1000000))),
                'revenue': float(baseline.get('revenue', 100000)),
                'accountsReceivable': float(baseline.get('accountsReceivable', 50000)),
                'accountsPayable': float(baseline.get('accountsPayable', 30000)),
                'inventory': float(baseline.get('inventory', 20000)),
                'ppe': float(baseline.get('ppe', 500000)),
                'debt': float(baseline.get('debt', 200000)),
                'equity': float(baseline.get('equity', 1000000)),
                'retainedEarnings': float(baseline.get('retainedEarnings', 0))
            }
            
            base_growth = {
                'revenueGrowth': 0.05,
                'cogsPercentage': 0.40,
                'opexPercentage': 0.30,
                'taxRate': 0.25,
                'depreciationRate': 0.01,
                'arDays': 45,
                'apDays': 30,
                'capexPercentage': 0.05,
                'dio': 45
            }
            
            # Map drivers to growth assumptions
            # Driver keys from frontend might be like "revenue_growth" or "opex_percentage"
            driver_mapping = {
                'revenue_growth': 'revenueGrowth',
                'cogs_percentage': 'cogsPercentage',
                'opex_percentage': 'opexPercentage',
                'ar_days': 'arDays',
                'ap_days': 'apDays',
                'dio': 'dio'
            }
            
            start_month_str = datetime.now().strftime('%Y-%m')
            
            for s in range(num_simulations):
                # Build assumptions for THIS simulation path
                sim_assumptions = base_growth.copy()
                for d_name, d_array in driver_arrays.items():
                    # Map driver name to assumption key
                    mapped_key = driver_mapping.get(d_name, d_name)
                    # Use the average value of the driver for this simulation path
                    # or the value at the specific month if we wanted time-varying (simpler to use mean for now)
                    sim_assumptions[mapped_key] = float(np.mean(d_array[s, :]))
                
                # Run the full 3-statement model
                sim_res = compute_three_statements(
                    start_month=start_month_str,
                    horizon_months=months,
                    initial_values=initial_values,
                    growth_assumptions=sim_assumptions,
                    monthly_overrides=overrides
                )
                
                # Extract ending cash for each month
                monthly_cf = sim_res['cashFlow']['monthly']
                for m_idx, (m_key, cf_data) in enumerate(monthly_cf.items()):
                    if m_idx < months:
                        results[s, m_idx] = cf_data['endingCash']
                
                # Periodically update progress within simulation
                if s % 500 == 0 and s > 0:
                    prog_val = 10 + int((s / num_simulations) * 70)
                    update_progress(job_id, prog_val, {'status': 'simulating', 'path': s})
            
            # Validate results (check for NaN or Inf)
            if np.any(np.isnan(results)) or np.any(np.isinf(results)):
                logger.warning("NaN or Inf values detected in results, replacing with zeros")
                results = np.nan_to_num(results, nan=0.0, posinf=0.0, neginf=0.0)
            
        except Exception as e:
            logger.error(f"Error in ThreeStatementEngine Monte Carlo loop: {str(e)}", exc_info=True)
            raise
        
        # Update progress
        try:
            update_progress(job_id, 80, {'status': 'simulations_complete'})
        except Exception as e:
            logger.warning(f"Error updating progress: {str(e)}")
        
        return results, driver_arrays
        
    except Exception as e:
        logger.error(f"Error in vectorized simulations: {str(e)}", exc_info=True)
        raise


def run_chunked_simulations_enhanced(
    num_simulations: int,
    months: int,
    drivers: Dict[str, Dict],
    overrides: Dict,
    seed: int,
    job_id: str,
    cursor,
    conn,
    logs: dict,
    model_data: Dict = None
) -> Tuple[np.ndarray, Dict[str, np.ndarray]]:
    """Run simulations in chunks to manage memory efficiently"""
    try:
        num_drivers = max(len(drivers), 1)
        bytes_per_sim = months * 8 * num_drivers
        safe_memory = int(MONTECARLO_CHUNK_RAM_BYTES * 0.8)
        chunk_size = min(num_simulations, max(100, int(safe_memory / bytes_per_sim)))
        
        logger.info(f"Chunking: {num_simulations} sims in chunks of {chunk_size}")
        
        all_results = []
        all_driver_samples = {name: [] for name in drivers.keys()}
        num_chunks = (num_simulations + chunk_size - 1) // chunk_size
        
        for chunk_idx in range(num_chunks):
            # Check for cancellation during chunking
            if check_cancel_requested(job_id):
                mark_cancelled(job_id)
                raise InterruptedError("Job cancelled during chunk processing")
            
            chunk_start = chunk_idx * chunk_size
            chunk_end = min(chunk_start + chunk_size, num_simulations)
            chunk_size_actual = chunk_end - chunk_start
            
            chunk_seed = (seed + chunk_idx) % (2**31 - 1)
            
            # Run chunk
            chunk_results, chunk_drivers = run_vectorized_simulations_enhanced(
                chunk_size_actual, months, drivers, overrides, chunk_seed,
                job_id, cursor, conn, logs, model_data
            )
            
            all_results.append(chunk_results)
            for name, samples in chunk_drivers.items():
                all_driver_samples[name].append(samples)
            
            # Update progress
            progress = 10 + int((chunk_idx + 1) / num_chunks * 70)
            update_progress(job_id, progress, {
                'status': 'processing_chunks',
                'chunk': chunk_idx + 1,
                'total_chunks': num_chunks,
            })
        
        # Concatenate all chunks
        logger.info(f"Concatenating {num_chunks} chunks...")
        final_results = np.concatenate(all_results, axis=0)
        final_drivers = {
            name: np.concatenate(samples_list, axis=0)
            for name, samples_list in all_driver_samples.items()
        }
        
        return final_results, final_drivers
    except Exception as e:
        logger.error(f"Error in chunked simulations: {str(e)}", exc_info=True)
        raise


def compute_survival_probability(results: np.ndarray, month_keys: List[str], initial_cash: float = 0.0) -> dict:
    """
    Compute survival probability - MVP FEATURE: Probability of survival, not point forecast.
    
    Survival probability = P(cash remains positive at each time point)
    This is the key probabilistic metric that shows likelihood of survival, not just a single forecast.
    
    Args:
        results: Array of shape (num_simulations, months) with cash flow results
        month_keys: List of month identifiers
        initial_cash: Starting cash balance (default 0, assumes results are cumulative)
    
    Returns:
        Dictionary with survival probabilities at each time point and runway thresholds
    """
    try:
        if results.size == 0:
            raise ValueError("Results array is empty")
        
        num_simulations = results.shape[0]
        months = results.shape[1]
        
        # Compute cumulative cash for each simulation
        cumulative_cash = np.cumsum(results, axis=1) + initial_cash
        
        # For each month, calculate probability that cash > 0 (survival)
        survival_by_month = []
        for m in range(months):
            positive_cash = np.sum(cumulative_cash[:, m] > 0)
            survival_prob = positive_cash / num_simulations
            survival_by_month.append({
                'month': month_keys[m] if m < len(month_keys) else f"Month_{m+1}",
                'probability': float(survival_prob),
                'percentage': float(survival_prob * 100),
                'simulationsSurvived': int(positive_cash),
                'simulationsFailed': int(num_simulations - positive_cash),
            })
        
        # Calculate runway survival probabilities
        runway_thresholds = [3, 6, 9, 12, 18, 24]
        runway_survival = {}
        
        for threshold_months in runway_thresholds:
            if threshold_months <= months:
                survived_to_threshold = np.sum(cumulative_cash[:, threshold_months - 1] > 0)
                prob = survived_to_threshold / num_simulations
                runway_survival[f"{threshold_months}_months"] = {
                    'thresholdMonths': threshold_months,
                    'probability': float(prob),
                    'percentage': float(prob * 100),
                    'simulationsSurvived': int(survived_to_threshold),
                    'simulationsFailed': int(num_simulations - survived_to_threshold),
                }
        
        # Overall survival metrics
        final_survival = np.sum(cumulative_cash[:, -1] > 0) / num_simulations
        
        failure_months = []
        for sim_idx in range(num_simulations):
            for m in range(months):
                if cumulative_cash[sim_idx, m] <= 0:
                    failure_months.append(m + 1)
                    break
        
        avg_months_to_failure = float(np.mean(failure_months)) if failure_months else float(months)
        median_months_to_failure = float(np.median(failure_months)) if failure_months else float(months)
        
        return {
            'byMonth': survival_by_month,
            'runwayThresholds': runway_survival,
            'overall': {
                'probabilitySurvivingFullPeriod': float(final_survival),
                'percentageSurvivingFullPeriod': float(final_survival * 100),
                'averageMonthsToFailure': avg_months_to_failure,
                'medianMonthsToFailure': median_months_to_failure,
                'totalSimulations': int(num_simulations),
                'simulationsSurvived': int(np.sum(cumulative_cash[:, -1] > 0)),
                'simulationsFailed': int(np.sum(cumulative_cash[:, -1] <= 0)),
            },
            'summary': {
                'keyMessage': f"Probability of survival: {final_survival * 100:.1f}% chance of surviving the full {months}-month forecast period",
                'riskLevel': 'high' if final_survival < 0.5 else 'medium' if final_survival < 0.8 else 'low',
            },
        }
    except Exception as e:
        logger.error(f"Error computing survival probability: {str(e)}", exc_info=True)
        raise


def compute_percentiles(results: np.ndarray, month_keys: List[str]) -> dict:
    """
    Compute percentiles from simulation results (optimized with error handling).
    Uses vectorized numpy operations for performance.
    """
    try:
        # Validate input
        if results.size == 0:
            raise ValueError("Results array is empty")
        
        if len(results.shape) != 2:
            raise ValueError(f"Results must be 2D array, got shape {results.shape}")
        
        if results.shape[1] != len(month_keys):
            raise ValueError(f"Month keys count ({len(month_keys)}) doesn't match results shape ({results.shape[1]})")
        
        # Ensure float64 for numerical stability
        if results.dtype != np.float64:
            results = results.astype(np.float64)
        
        # Check for NaN/Inf and handle
        if np.any(np.isnan(results)) or np.any(np.isinf(results)):
            logger.warning("NaN or Inf values detected in results, replacing with zeros")
            results = np.nan_to_num(results, nan=0.0, posinf=0.0, neginf=0.0)
        
        # Compute percentiles in one vectorized operation (much faster)
        # results shape: (num_simulations, months)
        percentiles = [5, 10, 25, 50, 75, 90, 95]
        try:
            percentile_values = np.percentile(results, percentiles, axis=0, method='linear')
        except Exception as e:
            logger.error(f"Error computing percentiles: {str(e)}", exc_info=True)
            # Fallback to slower method if linear fails
            percentile_values = np.percentile(results, percentiles, axis=0)
        
        # Round to 2 decimal places (vectorized)
        percentile_values = np.round(percentile_values, 2)
        
        # Build monthly format (optimized with dict comprehension)
        monthly = {
            month_key: {
                'p5': float(percentile_values[0, m]),
                'p10': float(percentile_values[1, m]),
                'p25': float(percentile_values[2, m]),
                'p50': float(percentile_values[3, m]),
                'p75': float(percentile_values[4, m]),
                'p90': float(percentile_values[5, m]),
                'p95': float(percentile_values[6, m]),
            }
            for m, month_key in enumerate(month_keys)
        }
        
        # Build series format (vectorized conversion - much faster than list comprehension)
        # Include P10 and P90 for frontend display
        series = {
            'p5': percentile_values[0, :].tolist(),
            'p10': percentile_values[1, :].tolist(),  # P10 added
            'p25': percentile_values[2, :].tolist(),
            'p50': percentile_values[3, :].tolist(),
            'p75': percentile_values[4, :].tolist(),
            'p90': percentile_values[5, :].tolist(),  # P90 added
            'p95': percentile_values[6, :].tolist(),
        }
        
        # Build percentiles_table format
        # Include P10 and P90 for frontend display
        percentiles_table = {
            'months': month_keys,
            'p5': percentile_values[0, :].tolist(),
            'p10': percentile_values[1, :].tolist(),  # P10 added
            'p25': percentile_values[2, :].tolist(),
            'p50': percentile_values[3, :].tolist(),
            'p75': percentile_values[4, :].tolist(),
            'p90': percentile_values[5, :].tolist(),  # P90 added
            'p95': percentile_values[6, :].tolist(),
        }
        
        return {
            'meta': {
                'numSimulations': int(results.shape[0]),
                'months': len(month_keys),
                'generatedAt': datetime.now(timezone.utc).isoformat(),
            },
            'monthly': monthly,
            'series': series,
            'percentiles_table': percentiles_table,
        }
    except Exception as e:
        logger.error(f"Error computing percentiles: {str(e)}", exc_info=True)
        raise


def record_billing_usage(org_id: str, cpu_seconds: float, cursor, estimated_cost: float = 0.0):
    """Record CPU usage to billing_usage table with cost estimate"""
    try:
        bucket_time = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        
        # Record CPU seconds
        cursor.execute("""
            INSERT INTO billing_usage ("orgId", metric, value, bucket_time)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (org_id, 'monte_carlo_cpu_seconds', float(cpu_seconds), bucket_time))
        
        # Record estimated cost if provided
        if estimated_cost > 0:
            cursor.execute("""
                INSERT INTO billing_usage ("orgId", metric, value, bucket_time)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (org_id, 'monte_carlo_compute_cost', float(estimated_cost), bucket_time))
    except Exception as e:
        logger.error(f"Error recording billing usage: {str(e)}", exc_info=True)
        # Don't raise - billing is non-critical
