"""
Prometheus metrics exporter for job queue
Provides metrics for monitoring job processing
"""
import time
from typing import Dict
from utils.logger import setup_logger

logger = setup_logger()

# In-memory metrics store (in production, use Prometheus client library)
_metrics: Dict[str, float] = {
    'jobs_queued': 0.0,
    'jobs_running': 0.0,
    'jobs_completed': 0.0,
    'jobs_failed': 0.0,
    'jobs_retrying': 0.0,
    'jobs_dead_letter': 0.0,
    'job_duration_seconds': 0.0,
    'job_retries_total': 0.0,
    'worker_active_jobs': 0.0,
}


def increment_counter(metric_name: str, value: float = 1.0):
    """Increment a counter metric"""
    if metric_name not in _metrics:
        _metrics[metric_name] = 0.0
    _metrics[metric_name] += value


def set_gauge(metric_name: str, value: float):
    """Set a gauge metric"""
    _metrics[metric_name] = value


def observe_duration(metric_name: str, duration_seconds: float):
    """Observe a duration/histogram metric"""
    if metric_name not in _metrics:
        _metrics[metric_name] = 0.0
    _metrics[metric_name] = duration_seconds  # For simplicity, store last value


def get_metrics() -> Dict[str, float]:
    """Get all current metrics"""
    return _metrics.copy()


def get_metrics_prometheus_format() -> str:
    """
    Get metrics in Prometheus text format.
    In production, use prometheus_client library.
    """
    lines = []
    for metric_name, value in _metrics.items():
        lines.append(f"# HELP {metric_name} Job queue metric")
        lines.append(f"# TYPE {metric_name} gauge")
        lines.append(f"{metric_name} {value}")
    return "\n".join(lines)


def record_job_started(job_type: str):
    """Record that a job started"""
    increment_counter('jobs_running')
    set_gauge('worker_active_jobs', _metrics.get('jobs_running', 0))


def record_job_completed(job_type: str, duration_seconds: float):
    """Record that a job completed"""
    increment_counter('jobs_completed')
    increment_counter('jobs_running', -1.0)
    observe_duration('job_duration_seconds', duration_seconds)
    set_gauge('worker_active_jobs', _metrics.get('jobs_running', 0))


def record_job_failed(job_type: str):
    """Record that a job failed"""
    increment_counter('jobs_failed')
    increment_counter('jobs_running', -1.0)
    set_gauge('worker_active_jobs', _metrics.get('jobs_running', 0))


def record_job_retry(job_type: str):
    """Record that a job is being retried"""
    increment_counter('jobs_retrying')
    increment_counter('job_retries_total')
    increment_counter('jobs_running', -1.0)


def record_job_dead_letter(job_type: str):
    """Record that a job moved to dead letter queue"""
    increment_counter('jobs_dead_letter')
    increment_counter('jobs_retrying', -1.0)


def update_queue_metrics(job_counts: Dict[str, int]):
    """Update queue metrics from database counts"""
    _metrics['jobs_queued'] = float(job_counts.get('queued', 0))
    _metrics['jobs_running'] = float(job_counts.get('running', 0))
    _metrics['jobs_retrying'] = float(job_counts.get('retrying', 0))
    _metrics['jobs_dead_letter'] = float(job_counts.get('dead_letter', 0))


