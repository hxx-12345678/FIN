from fastapi import FastAPI, HTTPException, BackgroundTasks, Header, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
import uuid
import threading
import time

app = FastAPI(title="FinaPilot Worker API")

# Security: Shared Secret Logic (SOC 2 CC7.1)
def verify_worker_secret(x_worker_secret: Optional[str] = Header(None)):
    secret = os.getenv("WORKER_SECRET")
    if secret and x_worker_secret != secret:
        raise HTTPException(status_code=403, detail="Invalid worker secret")
    return x_worker_secret

from jobs import runner as job_runner
from utils.logger import setup_logger
from utils.db import get_db_connection
from worker import JOB_HANDLERS

# Global state
polling_active = False
active_jobs = {}
polling_thread = None
from worker import JOB_HANDLERS  # Import handlers for polling
from jobs.hyperblock_engine import HyperblockEngine
from jobs.forecasting_engine import ForecastingEngine
from jobs.risk_engine import RiskEngine
from jobs.reasoning_engine import ModelReasoningEngine

# Setup global logger
logger = setup_logger()

# Model Cache for Real-time Recalculation
# model_id -> HyperblockEngine instance
hyperblock_cache: Dict[str, HyperblockEngine] = {}


class QueueJobRequest(BaseModel):
    jobType: str
    orgId: str
    objectId: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    queue: Optional[str] = "default"
    priority: Optional[int] = 50


class RunJobDirectRequest(BaseModel):
    jobType: str
    orgId: str
    objectId: Optional[str] = None
    params: Optional[Dict[str, Any]] = None


@app.get("/health", dependencies=[Depends(verify_worker_secret)])
def health():
    return {"status": "ok"}


@app.get("/status", dependencies=[Depends(verify_worker_secret)])
def status():
    """Check worker status including DB connection and polling"""
    try:
        # Test DB connection
        conn = get_db_connection()
        conn.close()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "ok",
        "database": db_status,
        "polling_active": polling_active,
        "active_jobs": len(active_jobs) if 'active_jobs' in globals() else 0,
    }


@app.post("/queue_job", dependencies=[Depends(verify_worker_secret)])
def queue_job(req: QueueJobRequest):
    logger = setup_logger()
    logger.info(f"📥 Queue job request: {req.jobType} for org {req.orgId}")
    try:
        job_id = job_runner.queue_job(
            job_type=req.jobType,
            org_id=req.orgId,
            object_id=req.objectId,
            params=req.params,
            queue=req.queue or 'default',
            priority=req.priority or 50,
        )
        if not job_id:
            logger.error("❌ Failed to queue job in DB")
            raise HTTPException(status_code=500, detail="Failed to queue job")
        logger.info(f"✅ Job queued: {job_id}")
        return {"job_id": job_id}
    except ValueError as e:
        # Typically thrown when DATABASE_URL missing or invalid
        logger.error(f"❌ Queue job error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Unexpected queue job error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def _run_reserved_job_sync(queue: str = 'default'):
    """Reserve one job from the DB and run it synchronously (blocking)."""
    job = job_runner.reserve_job(queue)
    if not job:
        return None
    # Determine handler from jobType
    job_type = job.get('jobType')
    # Map to handler - worker defines handlers; import dynamically to avoid circular imports
    from worker import JOB_HANDLERS
    handler = JOB_HANDLERS.get(job_type)
    if not handler:
        # Mark as failed via runner.fail_job
        from jobs.runner import fail_job
        fail_job(job['id'], ValueError(f"Unknown job type: {job_type}"))
        return job

    # Run with built-in retry and DB updates
    job_runner.run_job_with_retry(job, handler)
    return job


@app.post("/run_next", dependencies=[Depends(verify_worker_secret)])
def run_next(queue: Optional[str] = 'default', background: Optional[bool] = False, background_tasks: BackgroundTasks = None):
    """Reserve the next job from the given queue and process it.
    If `background=true` the job will be processed in background and the endpoint returns immediately.
    """
    try:
        if background:
            # Run in a background thread to keep request fast
            background_tasks.add_task(_run_reserved_job_sync, queue)
            return JSONResponse({"status": "scheduled"}, status_code=202)
        else:
            job = _run_reserved_job_sync(queue)
            if job is None:
                return JSONResponse({"status": "no_job"}, status_code=204)
            return {"status": "processed", "job_id": job.get('id')}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/run_job_direct", dependencies=[Depends(verify_worker_secret)])
def run_job_direct(req: RunJobDirectRequest, background: Optional[bool] = False, background_tasks: BackgroundTasks = None):
    """Directly invoke a handler for immediate execution without inserting into DB.
    Note: Many handlers expect DB S3 etc. and may raise errors if environment not configured.
    """
    # Build a fake job dict compatible with run_job_with_retry
    job_id = f"manual-{uuid.uuid4()}"
    logs = {'params': req.params or {}}
    job = {
        'id': job_id,
        'jobType': req.jobType,
        'orgId': req.orgId,
        'objectId': req.objectId,
        'logs': logs,
        'attempts': 0,
        'maxAttempts': 5,
    }

    # Resolve handler from worker mapping
    try:
        from worker import JOB_HANDLERS
        handler = JOB_HANDLERS.get(req.jobType)
        if not handler:
            raise HTTPException(status_code=400, detail=f"Unknown jobType: {req.jobType}")

        if background:
            background_tasks.add_task(job_runner.run_job_with_retry, job, handler)
            return JSONResponse({"status": "scheduled", "job_id": job_id}, status_code=202)
        else:
            # Run synchronously (blocking)
            job_runner.run_job_with_retry(job, handler)
            return {"status": "completed", "job_id": job_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/release_stuck_jobs", dependencies=[Depends(verify_worker_secret)])
def release_stuck(queue: Optional[str] = 'default'):
    try:
        released = job_runner.release_stuck_jobs(queue)
        return {"released": released}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class HyperblockComputeRequest(BaseModel):
    modelId: str
    orgId: str
    months: List[str]
    dimensions: Optional[List[Dict[str, Any]]] = None # [{name, members}]
    nodes: List[Dict[str, Any]] # {id, name, formula, category, dims: []}
    update: Optional[Dict[str, Any]] = None # {nodeId, values: [{month, value, coords}], userId}

class ForecastRequest(BaseModel):
    history: List[float]
    steps: int
    method: str = "auto" # auto|arima|trend|seasonal|regression
    period: int = 12
    drivers_history: Optional[List[List[float]]] = None
    drivers_forecast: Optional[List[List[float]]] = None
    driver_names: Optional[List[str]] = None

class BacktestRequest(BaseModel):
    history: List[float]
    window: int = 12

class RiskRequest(BaseModel):
    modelId: str
    months: List[str]
    dimensions: Optional[List[Dict[str, Any]]] = None
    nodes: List[Dict[str, Any]]
    distributions: Dict[str, Dict[str, Any]] # {nodeId: {dist, params}}
    numSimulations: int = 1000

@app.post("/compute/hyperblock", dependencies=[Depends(verify_worker_secret)])
def compute_hyperblock(req: HyperblockComputeRequest):
    """
    High-performance real-time recompute using HyperblockEngine.
    Supports incremental recompute and tracing.
    """
    cache_key = f"{req.orgId}:{req.modelId}"
    
    # Get or initialize engine
    if cache_key not in hyperblock_cache:
        logger.info(f"🚀 Initializing HyperblockEngine for {cache_key}")
        engine = HyperblockEngine(req.modelId)
        # Load dimensions
        if req.dimensions:
            for dim in req.dimensions:
                engine.define_dimension(dim['name'], dim['members'])
        
        engine.initialize_horizon(req.months)
        
        # Load nodes and formulas
        for node in req.nodes:
            engine.add_metric(node['id'], node['name'], node.get('category', 'operational'), node.get('dims'))
            if node.get('formula'):
                engine.set_formula(node['id'], node['formula'])
        
        hyperblock_cache[cache_key] = engine
    else:
        engine = hyperblock_cache[cache_key]
        # Verify if horizon changed
        if engine.months != req.months:
            engine.initialize_horizon(req.months)
            
    # Apply update if provided
    affected_nodes = []
    if req.update:
        node_id = req.update['nodeId']
        values = req.update['values']
        user_id = req.update.get('userId', 'system')
        
        logger.info(f"⚡ Incremental update: {node_id} by {user_id}")
        
        # Normalize values if it's a dictionary {month: value}
        if isinstance(values, dict):
            normalized_values = []
            for month, val in values.items():
                normalized_values.append({
                    "month": month,
                    "value": float(val),
                    "coords": {}
                })
            values = normalized_values
            
        affected_nodes = engine.update_input(node_id, values, user_id)
    else:
        # Full recompute if no specific update
        logger.info("⚡ Full recompute requested")
        engine.full_recompute()
        affected_nodes = list(engine.graph.nodes())

    # Get results and trace
    results = engine.get_results()
    trace = engine.get_trace(limit=5)
    
    return {
        "status": "success",
        "results": results,
        "affectedNodes": affected_nodes,
        "trace": trace,
        "metrics": {
            "nodeCount": len(engine.graph.nodes()),
            "edgeCount": len(engine.graph.edges()),
            "computeTimeMs": trace[-1]['duration_ms'] if trace else 0
        }
    }

@app.post("/compute/forecast", dependencies=[Depends(verify_worker_secret)])
def compute_forecast(req: ForecastRequest):
    """
    Industrial scale forecasting endpoint.
    Returns flat forecast array + confidence bands for bracket testing.
    """
    try:
        explanation = {}
        raw_result = None
        
        if req.method == "arima":
            raw_result = ForecastingEngine.forecast_arima(req.history, req.steps)
            explanation = {"info": "ARIMA(1,1,1) model fitted to historical trend."}
        elif req.method == "seasonal":
            raw_result = ForecastingEngine.forecast_seasonal(req.history, req.steps, req.period)
            explanation = {"info": f"Seasonal decomposition (period={req.period}) applied."}
        elif req.method == "trend":
            raw_result = ForecastingEngine.forecast_trend(req.history, req.steps)
            explanation = {"info": "Linear regression trend projection."}
        elif req.method == "regression" and req.drivers_history:
            raw_result = ForecastingEngine.forecast_regression(req.history, req.steps, req.drivers_history, req.drivers_forecast)
            explanation = {"info": "Multi-variate regression using operational drivers."}
            if req.driver_names:
                explanation["drivers"] = req.driver_names
        else: # auto
            if req.drivers_history:
                raw_result = ForecastingEngine.forecast_regression(req.history, req.steps, req.drivers_history, req.drivers_forecast)
                explanation = {"info": "Auto-selected multi-variate regression."}
            elif len(req.history) >= req.period * 2:
                raw_result = ForecastingEngine.forecast_seasonal(req.history, req.steps, req.period)
                explanation = {"info": "Auto-selected seasonal model due to sufficient history."}
            else:
                raw_result = ForecastingEngine.forecast_arima(req.history, req.steps)
                explanation = {"info": "Auto-selected ARIMA model for short history."}
        
        # Normalize: methods now return {mean, lower, upper} dicts
        if isinstance(raw_result, dict):
            forecast_flat = raw_result.get('mean', [])
            confidence_bands = {
                "lower": raw_result.get('lower', []),
                "upper": raw_result.get('upper', [])
            }
        else:
            # Legacy fallback (shouldn't happen)
            forecast_flat = raw_result if raw_result else []
            confidence_bands = {"lower": forecast_flat, "upper": forecast_flat}
        
        # Calculate fitting accuracy on history (MAPE)
        fit_forecast = ForecastingEngine.forecast_trend(req.history, 0)
        # forecast_trend(h, 0) returns the mean list for backward compat
        backtest = ForecastingEngine.calculate_metrics(req.history, fit_forecast)
        
        return {
            "status": "success",
            "forecast": forecast_flat,
            "confidenceBands": confidence_bands,
            "method": req.method,
            "explanation": explanation,
            "metrics": backtest
        }
    except Exception as e:
        logger.error(f"❌ Forecast failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/compute/forecast/backtest", dependencies=[Depends(verify_worker_secret)])
def compute_backtest(req: BacktestRequest):
    """
    Accuracy validation via backtesting.
    """
    try:
        results = ForecastingEngine.run_backtest(req.history, req.window)
        return {
            "status": "success",
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/compute/risk", dependencies=[Depends(verify_worker_secret)])
def compute_risk(req: RiskRequest):
    """
    Stochastic risk analysis using Monte Carlo simulations.
    """
    try:
        engine = RiskEngine(req.modelId, req.months, req.dimensions)
        results = engine.run_risk_analysis(req.nodes, req.distributions, req.numSimulations)
        
        return {
            "status": "success",
            "results": results
        }
    except Exception as e:
        logger.error(f"Risk analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ReasoningRequest(BaseModel):
    modelId: str
    target: str
    nodes: Optional[List[Dict[str, Any]]] = None
    data: Optional[Dict[str, Any]] = None
    goal: str = "increase"
    num_months: int = 12
    months: Optional[List[str]] = None
    period_a: Optional[int] = None
    period_b: Optional[int] = None

@app.post("/compute/reasoning", dependencies=[Depends(verify_worker_secret)])
def compute_reasoning(req: ReasoningRequest):
    """
    Suggests improvements and explains model logic. Includes Waterfall Variance analysis.
    """
    try:
        engine = ModelReasoningEngine(req.modelId)
        if req.nodes:
            engine.hydrate_from_json(req.nodes, req.data, req.months)
        
        analysis = engine.analyze_drivers(req.target)
        suggestions = engine.suggest_strategic_improvements(req.target)
        explanation = engine.explain_metric_logic(req.target)
        weak_assumptions = engine.detect_weak_assumptions()
        
        # Variance Analysis (answering "Why did X change?")
        variance_analysis = None
        if req.period_a is not None and req.period_b is not None:
            variance_analysis = engine.explain_variance(req.target, req.period_a, req.period_b)
        
        return {
            "status": "success",
            "analysis": analysis,
            "suggestions": suggestions,
            "explanation": explanation,
            "weakAssumptions": weak_assumptions,
            "varianceAnalysis": variance_analysis
        }
    except Exception as e:
        logger.error(f"Reasoning failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ScenarioRequest(BaseModel):
    modelId: str
    target: str
    overrides: Dict[str, float]

@app.post("/compute/scenario", dependencies=[Depends(verify_worker_secret)])
def compute_scenario(req: ScenarioRequest):
    """
    Quickly visualizes the impact of changes on a target metric.
    """
    try:
        engine = ModelReasoningEngine(req.modelId)
        result = engine.simulate_scenario(req.target, req.overrides)
        return { "status": "success", "result": result }
    except Exception as e:
        logger.error(f"Scenario simulation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# ENTERPRISE FINANCIAL CONTROL LAYER ENDPOINTS
# =============================================================================

from jobs.financial_control_layer import (
    DebtScheduleEngine, EquityDilutionEngine, TaxLogicEngine,
    DeferredRevenueEngine, WorkingCapitalEngine, ReconciliationEngine,
    run_financial_controls
)
from jobs.forecasting_engine_v2 import (
    RegimeDetector, FeatureAwareForecast, HybridForecast,
    SensitivityRanker, ModelConfidenceEngine, EnhancedBacktester,
    run_enterprise_forecast
)
from jobs.constraint_solver import (
    AccountingConstraintSolver, SparseMatrixOptimizer,
    CircularReferenceResolver, CrossSheetConstraints
)
from jobs.ai_modeling_pipeline import (
    DataProfilingAgent, ModelSelectionAgent, AssumptionGenerator,
    AdaptiveParameterMode, run_ai_modeling_pipeline
)


class FinancialControlsRequest(BaseModel):
    statements: Dict[str, Any]  # 3-statement output
    debtInstruments: Optional[List[Dict[str, Any]]] = None
    equityConfig: Optional[Dict[str, Any]] = None
    taxConfig: Optional[Dict[str, Any]] = None
    contracts: Optional[List[Dict[str, Any]]] = None
    workingCapitalConfig: Optional[Dict[str, Any]] = None


@app.post("/compute/financial-controls", dependencies=[Depends(verify_worker_secret)])
def compute_financial_controls(req: FinancialControlsRequest):
    """
    Run the complete Financial Control Layer:
    - Debt schedule computation & covenant checking
    - Working capital dynamics (DSO/DPO/DIO)
    - Deferred revenue scheduling (ASC 606)
    - Balance sheet reconciliation & constraint enforcement
    """
    try:
        result = run_financial_controls(
            statements=req.statements,
            debt_instruments=req.debtInstruments,
            contracts=req.contracts,
            working_capital_config=req.workingCapitalConfig
        )
        return {"status": "success", "result": result}
    except Exception as e:
        logger.error(f"Financial controls failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


class EnterpriseForecastRequest(BaseModel):
    history: List[float]
    steps: int
    features: Optional[Dict[str, List[float]]] = None
    featuresForecast: Optional[Dict[str, List[float]]] = None
    drivers: Optional[Dict[str, Any]] = None
    driverOverrides: Optional[Dict[int, float]] = None
    assumptions: Optional[Dict[str, float]] = None
    industryBenchmarks: Optional[Dict[str, List[float]]] = None


@app.post("/compute/forecast/enterprise", dependencies=[Depends(verify_worker_secret)])
def compute_enterprise_forecast(req: EnterpriseForecastRequest):
    """
    Enterprise forecasting pipeline with regime detection,
    hybrid statistical+driver-based, feature-aware, confidence scoring,
    and comprehensive backtesting.
    """
    try:
        benchmarks = None
        if req.industryBenchmarks:
            benchmarks = {k: tuple(v) for k, v in req.industryBenchmarks.items()}

        result = run_enterprise_forecast(
            history=req.history,
            steps=req.steps,
            features=req.features,
            features_forecast=req.featuresForecast,
            drivers=req.drivers,
            driver_overrides=req.driverOverrides,
            assumptions=req.assumptions,
            industry_benchmarks=benchmarks
        )
        return {"status": "success", "result": result}
    except Exception as e:
        logger.error(f"Enterprise forecast failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


class RegimeDetectionRequest(BaseModel):
    history: List[float]
    method: str = "auto"
    sensitivity: float = 2.0


@app.post("/compute/forecast/regime", dependencies=[Depends(verify_worker_secret)])
def compute_regime_detection(req: RegimeDetectionRequest):
    """Detect structural breaks / regime shifts in time series."""
    try:
        result = RegimeDetector.detect_regimes(req.history, req.method, req.sensitivity)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ConfidenceRequest(BaseModel):
    history: List[float]
    forecast: List[float]
    assumptions: Optional[Dict[str, float]] = None
    industryBenchmarks: Optional[Dict[str, List[float]]] = None


@app.post("/compute/forecast/confidence", dependencies=[Depends(verify_worker_secret)])
def compute_model_confidence(req: ConfidenceRequest):
    """Compute comprehensive model confidence score."""
    try:
        benchmarks = None
        if req.industryBenchmarks:
            benchmarks = {k: tuple(v) for k, v in req.industryBenchmarks.items()}

        result = ModelConfidenceEngine.compute_confidence(
            history=req.history,
            forecast=req.forecast,
            assumptions=req.assumptions,
            industry_benchmarks=benchmarks
        )
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ConstraintValidationRequest(BaseModel):
    incomeStatement: Dict[str, Dict]
    cashFlow: Dict[str, Dict]
    balanceSheet: Dict[str, Dict]


@app.post("/compute/constraints/validate", dependencies=[Depends(verify_worker_secret)])
def compute_constraint_validation(req: ConstraintValidationRequest):
    """
    Validate accounting constraints and cross-sheet consistency.
    """
    try:
        # Cross-sheet validation
        cross_sheet = CrossSheetConstraints.enforce_cross_sheet(
            income_statement=req.incomeStatement,
            cash_flow=req.cashFlow,
            balance_sheet=req.balanceSheet
        )

        # Reconciliation
        recon = ReconciliationEngine.reconcile(
            income_statement=req.incomeStatement,
            cash_flow=req.cashFlow,
            balance_sheet=req.balanceSheet
        )

        return {
            "status": "success",
            "crossSheet": cross_sheet,
            "reconciliation": recon,
            "allValid": cross_sheet['valid'] and recon['reconciled']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AIPipelineRequest(BaseModel):
    data: Dict[str, List[float]]
    targetMetric: str = "revenue"
    businessContext: Optional[Dict[str, Any]] = None
    industryBenchmarks: Optional[Dict[str, Dict]] = None


@app.post("/compute/ai-pipeline", dependencies=[Depends(verify_worker_secret)])
def compute_ai_pipeline(req: AIPipelineRequest):
    """
    Run the 5-step AI modeling pipeline:
    1. Data Profiling
    2. Model Selection
    3. Assumption Generation
    4. → Returns for human review
    5. → Executed after approval via /compute/hyperblock
    """
    try:
        result = run_ai_modeling_pipeline(
            data=req.data,
            business_context=req.businessContext,
            industry_benchmarks=req.industryBenchmarks,
            target_metric=req.targetMetric
        )
        return {"status": "success", "result": result}
    except Exception as e:
        logger.error(f"AI pipeline failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


class SensitivityRequest(BaseModel):
    history: List[float]
    steps: int
    assumptions: Dict[str, float]
    targetMetric: str = "revenue"
    perturbation: float = 0.10


@app.post("/compute/sensitivity", dependencies=[Depends(verify_worker_secret)])
def compute_sensitivity_ranking(req: SensitivityRequest):
    """
    Auto-rank which assumptions impact target metric the most.
    Uses perturbation-based sensitivity analysis.
    """
    try:
        from jobs.forecasting_engine import ForecastingEngine

        def compute_fn(assumptions):
            # Use trend forecast with growth-adjusted history
            growth = assumptions.get('revenue_growth', 0.08)
            simulated = [
                req.history[-1] * (1 + growth) ** (i + 1)
                for i in range(req.steps)
            ]
            return {'revenue': sum(simulated) / len(simulated) if simulated else 0}

        result = SensitivityRanker.rank_sensitivities(
            base_assumptions=req.assumptions,
            compute_fn=compute_fn,
            target_metric=req.targetMetric,
            perturbation=req.perturbation
        )
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ParameterModeRequest(BaseModel):
    hasConnector: bool = False
    hasCsv: bool = False
    hasTransactions: bool = False
    transactionMonths: int = 0


@app.post("/compute/parameter-mode", dependencies=[Depends(verify_worker_secret)])
def compute_parameter_mode(req: ParameterModeRequest):
    """
    Detect which frontend parameter mode to use (Enterprise / CSV / Startup).
    """
    try:
        result = AdaptiveParameterMode.detect_mode(
            has_connector=req.hasConnector,
            has_csv=req.hasCsv,
            has_transactions=req.hasTransactions,
            transaction_months=req.transactionMonths
        )
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Background polling
polling_active = False
polling_thread = None

def polling_loop():
    """Background polling loop similar to worker.py"""
    global polling_active, active_jobs
    logger = setup_logger()
    logger.info("🚀 Background polling started")
    while polling_active:
        try:
            # Check capacity
            if len(active_jobs) >= 4:
                time.sleep(0.5)
                continue
            
            # Poll all queues
            for queue in ['default', 'exports', 'montecarlo', 'connectors']:
                job = job_runner.reserve_job(queue)
                if job:
                    logger.info(f"🎯 Reserved job {job['id']} ({job.get('jobType')}) from queue {queue}")
                    # Process the job
                    job_type = job.get('jobType')
                    handler = JOB_HANDLERS.get(job_type)
                    if handler:
                        active_jobs[job['id']] = threading.current_thread()
                        try:
                            logger.info(f"▶️ Starting job {job['id']}")
                            job_runner.run_job_with_retry(job, handler)
                            logger.info(f"✅ Completed job {job['id']}")
                        finally:
                            if job['id'] in active_jobs:
                                del active_jobs[job['id']]
                    else:
                        logger.error(f"❌ Unknown job type: {job_type} for job {job['id']}")
                        job_runner.fail_job(job['id'], ValueError(f"Unknown job type: {job_type}"))
                    break  # Process one job per poll cycle
            else:
                logger.debug("No jobs in any queue")
                time.sleep(0.5)  # No jobs, wait
        except Exception as e:
            logger.error(f"❌ Polling error: {str(e)}", exc_info=True)
            time.sleep(0.5)

@app.on_event("startup")
def startup_event():
    """Start background polling on app startup"""
    global polling_active, polling_thread
    polling_active = True
    polling_thread = threading.Thread(target=polling_loop, daemon=True)
    polling_thread.start()

@app.on_event("shutdown")
def shutdown_event():
    """Stop background polling on shutdown"""
    global polling_active
    polling_active = False
    if polling_thread:
        polling_thread.join(timeout=5)
