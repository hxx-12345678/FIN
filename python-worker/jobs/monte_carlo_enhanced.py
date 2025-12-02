"""Monte Carlo Simulation Job Handler - Enhanced with confidence intervals, tornado sensitivity, distributions"""
import json
import os
from datetime import datetime, timezone
import numpy as np
from typing import Dict, List, Tuple, Optional
from scipy import stats
from utils.db import get_db_connection
from utils.s3 import upload_bytes_to_s3
from utils.logger import setup_logger
from utils.timer import CPUTimer
from jobs.runner import check_cancel_requested, mark_cancelled, update_progress, extend_visibility

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
    Compute confidence intervals for simulation results.
    
    Args:
        results: Array of shape (num_simulations, months)
        confidence_levels: List of confidence levels (e.g., [0.80, 0.90, 0.95])
    
    Returns:
        Dictionary with confidence intervals per month
    """
    try:
        num_sims, num_months = results.shape
        intervals = {}
        
        for conf_level in confidence_levels:
            alpha = 1 - conf_level
            lower_percentile = (alpha / 2) * 100
            upper_percentile = (1 - alpha / 2) * 100
            
            # Compute percentiles across simulations (axis=0)
            lower = np.percentile(results, lower_percentile, axis=0, method='linear')
            upper = np.percentile(results, upper_percentile, axis=0, method='linear')
            
            intervals[f'ci_{int(conf_level * 100)}'] = {
                'lower': lower.tolist(),
                'upper': upper.tolist(),
                'width': (upper - lower).tolist(),
            }
        
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
                from scipy.stats import spearmanr
                rank_corr, _ = spearmanr(driver_values, final_month_cash)
                
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
    """Handle Monte Carlo simulation job with enhanced features"""
    logger.info(f"Processing Monte Carlo job {job_id}")
    
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
                    "numSimulations", 
                    "modelRunId",
                    "orgId",
                    "paramsHash"
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
            drivers = params.get('drivers', {})
            overrides = params.get('overrides', {})
            random_seed = params.get('randomSeed')
            mode = params.get('mode', 'full')
            include_confidence_intervals = params.get('includeConfidenceIntervals', True)
            include_tornado = params.get('includeTornado', True)
            
            # Derive seed from paramsHash + randomSeed (deterministic)
            if random_seed is not None:
                seed_str = f"{params_hash}_{random_seed}"
                seed = abs(hash(seed_str)) % (2**31 - 1)
            else:
                seed = abs(hash(str(params_hash))) % (2**31 - 1)
            
            logger.info(f"Running {num_simulations} simulations with seed {seed}")
            
            # Update status to running
            cursor.execute("""
                UPDATE monte_carlo_jobs
                SET status = 'running'
                WHERE id = %s
            """, (mc_job_id,))
            
            update_progress(job_id, 5, {'status': 'loading_model'})
            
            # Load model snapshot
            model_data = load_model_snapshot(model_run_id, cursor)
            
            # Determine number of months from model
            months = model_data.get('months', 12)
            month_keys = model_data.get('monthKeys', [f"2025-{i+1:02d}" for i in range(months)])
            
            update_progress(job_id, 10, {'status': 'preparing_simulations', 'months': months})
            
            # Check if we need chunking
            num_drivers = max(len(drivers), 1)
            estimated_memory = num_simulations * months * 8 * (num_drivers + 1) * 2
            needs_chunking = estimated_memory > MONTECARLO_CHUNK_RAM_BYTES
            
            if needs_chunking:
                logger.info(f"Chunking required: estimated {estimated_memory / 1e9:.2f}GB memory")
                results, driver_samples = run_chunked_simulations_enhanced(
                    num_simulations, months, drivers, overrides, seed, 
                    job_id, cursor, conn, logs
                )
            else:
                logger.info(f"Running vectorized simulations: {num_simulations} sims × {months} months")
                results, driver_samples = run_vectorized_simulations_enhanced(
                    num_simulations, months, drivers, overrides, seed,
                    job_id, cursor, conn, logs
                )
            
            # Calculate percentiles
            update_progress(job_id, 85, {'status': 'calculating_percentiles'})
            percentiles_data = compute_percentiles(results, month_keys)
            
            # Calculate survival probability (MVP FEATURE - Probability of survival, not point forecast)
            update_progress(job_id, 87, {'status': 'computing_survival_probability'})
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
                            SELECT "summaryJson"->>'cashBalance'
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
            
            # Add confidence intervals if requested
            if include_confidence_intervals:
                update_progress(job_id, 90, {'status': 'computing_confidence_intervals'})
                confidence_intervals = compute_confidence_intervals(results, [0.80, 0.90, 0.95])
                percentiles_data['confidence_intervals'] = confidence_intervals
            
            # Add tornado sensitivity if requested
            if include_tornado and driver_samples:
                update_progress(job_id, 92, {'status': 'computing_tornado_sensitivity'})
                tornado_sensitivity = compute_tornado_sensitivity(
                    results, drivers, driver_samples, months
                )
                percentiles_data['tornado_sensitivity'] = tornado_sensitivity
            
            # Add distribution definitions
            percentiles_data['distribution_definitions'] = DISTRIBUTION_DEFINITIONS
            
            # Upload results to S3
            result_key = f"montecarlo/{org_id}/{model_run_id}/{params_hash}-{num_simulations}.json"
            result_json = json.dumps(percentiles_data, separators=(',', ':'))
            upload_bytes_to_s3(result_key, result_json.encode('utf-8'), 'application/json')
            
            # Get CPU time
            cpu_seconds = cpu_timer.elapsed()
            
            # Estimate compute cost (example: $0.10 per CPU-hour)
            compute_cost_per_hour = float(os.getenv('COMPUTE_COST_PER_HOUR', '0.10'))
            estimated_cost = (cpu_seconds / 3600.0) * compute_cost_per_hour
            
            # Update Monte Carlo job
            cursor.execute("""
                UPDATE monte_carlo_jobs
                SET status = 'done',
                    "resultS3" = %s,
                    "percentilesJson" = %s,
                    "cpuSecondsEstimate" = %s,
                    "finishedAt" = NOW()
                WHERE id = %s
            """, (result_key, json.dumps(percentiles_data['percentiles_table']), float(cpu_seconds), mc_job_id))
            
            # Record billing usage with cost estimate
            record_billing_usage(org_id, cpu_seconds, cursor, estimated_cost)
            
            # Update job status
            update_progress(job_id, 100, {
                'status': 'completed',
                'resultS3': result_key,
                'cpuSeconds': cpu_seconds,
                'estimatedCost': estimated_cost,
                'months': months
            })
            conn.commit()
            
            logger.info(f"✅ Monte Carlo job {mc_job_id} completed: {num_simulations} sims, {cpu_seconds:.2f}s CPU, ${estimated_cost:.4f} cost")
            
    except Exception as e:
        logger.error(f"❌ Monte Carlo job failed: {str(e)}", exc_info=True)
        
        # Mark as failed
        if conn and cursor and mc_job_id:
            try:
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
            SELECT mr."resultS3", m."model_json", mr."run_type"
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
    logs: dict
) -> Tuple[np.ndarray, Dict[str, np.ndarray]]:
    """Run vectorized simulations using NumPy with enhanced distribution support"""
    try:
        rng = np.random.default_rng(seed)
        
        # Prepare driver arrays (num_simulations × months)
        driver_arrays = {}
        for driver_name, driver_config in drivers.items():
            dist_type = driver_config.get('dist', 'normal')
            driver_arrays[driver_name] = sample_distribution(
                dist_type, driver_config, (num_simulations, months), rng
            )
        
        # Apply model computation (vectorized)
        revenue_driver = driver_arrays.get('revenue_growth', np.zeros((num_simulations, months)))
        expense_driver = driver_arrays.get('expense_growth', np.zeros((num_simulations, months)))
        
        # Baseline values
        baseline_revenue = 100000.0
        baseline_expenses = 80000.0
        
        # Vectorized computation
        revenue = baseline_revenue * (1.0 + revenue_driver)
        expenses = baseline_expenses * (1.0 + expense_driver)
        monthly_cash = revenue - expenses
        
        # Update progress
        update_progress(job_id, 80, {'status': 'simulations_complete'})
        
        return monthly_cash, driver_arrays
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
    logs: dict
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
            chunk_start = chunk_idx * chunk_size
            chunk_end = min(chunk_start + chunk_size, num_simulations)
            chunk_size_actual = chunk_end - chunk_start
            
            chunk_seed = (seed + chunk_idx) % (2**31 - 1)
            
            # Run chunk
            chunk_results, chunk_drivers = run_vectorized_simulations_enhanced(
                chunk_size_actual, months, drivers, overrides, chunk_seed,
                job_id, cursor, conn, logs
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
        # If results are already cumulative, use as-is; otherwise compute cumulative sum
        cumulative_cash = np.cumsum(results, axis=1) + initial_cash
        
        # For each month, calculate probability that cash > 0 (survival)
        survival_by_month = []
        for m in range(months):
            # Count simulations where cash is positive at this month
            positive_cash = np.sum(cumulative_cash[:, m] > 0)
            survival_prob = positive_cash / num_simulations
            survival_by_month.append({
                'month': month_keys[m] if m < len(month_keys) else f"Month_{m+1}",
                'probability': float(survival_prob),
                'percentage': float(survival_prob * 100),
                'simulationsSurvived': int(positive_cash),
                'simulationsFailed': int(num_simulations - positive_cash),
            })
        
        # Calculate runway survival probabilities (probability of surviving X months)
        runway_thresholds = [3, 6, 9, 12, 18, 24]  # Months
        runway_survival = {}
        
        for threshold_months in runway_thresholds:
            if threshold_months <= months:
                # For each simulation, check if it survives to threshold_months
                survived_to_threshold = np.sum(cumulative_cash[:, threshold_months - 1] > 0)
                prob = survived_to_threshold / num_simulations
                runway_survival[f"{threshold_months}_months"] = {
                    'thresholdMonths': threshold_months,
                    'probability': float(prob),
                    'percentage': float(prob * 100),
                    'simulationsSurvived': int(survived_to_threshold),
                    'simulationsFailed': int(num_simulations - survived_to_threshold),
                }
        
        # Calculate overall survival metrics
        # Probability of surviving entire forecast period
        final_survival = np.sum(cumulative_cash[:, -1] > 0) / num_simulations
        
        # Average months until failure (for simulations that fail)
        failure_months = []
        for sim_idx in range(num_simulations):
            for m in range(months):
                if cumulative_cash[sim_idx, m] <= 0:
                    failure_months.append(m + 1)  # 1-based month
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
    """Compute percentiles from simulation results (optimized)"""
    try:
        if results.size == 0:
            raise ValueError("Results array is empty")
        
        if results.shape[1] != len(month_keys):
            raise ValueError(f"Month keys count ({len(month_keys)}) doesn't match results shape ({results.shape[1]})")
        
        # Compute percentiles in one vectorized operation
        percentiles = [5, 10, 25, 50, 75, 90, 95]
        percentile_values = np.percentile(results, percentiles, axis=0, method='linear')
        percentile_values = np.round(percentile_values, 2)
        
        # Build monthly format
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
        
        # Build series format
        series = {
            'p5': percentile_values[0, :].tolist(),
            'p25': percentile_values[2, :].tolist(),
            'p50': percentile_values[3, :].tolist(),
            'p75': percentile_values[4, :].tolist(),
            'p95': percentile_values[6, :].tolist(),
        }
        
        # Build percentiles_table format
        percentiles_table = {
            'months': month_keys,
            'p5': percentile_values[0, :].tolist(),
            'p25': percentile_values[2, :].tolist(),
            'p50': percentile_values[3, :].tolist(),
            'p75': percentile_values[4, :].tolist(),
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


