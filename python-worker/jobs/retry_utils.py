"""
Retry utilities with exponential backoff and jitter
"""
import random
import math
from typing import Optional


def calculate_backoff(
    attempt: int,
    base_backoff_seconds: float = 30.0,
    max_backoff_seconds: float = 3600.0
) -> float:
    """
    Calculate exponential backoff with jitter.
    
    Formula: backoff = base * (2 ** (attempt - 1)) + random_jitter
    where random_jitter ∈ [0, base]
    
    Args:
        attempt: Current attempt number (1-indexed)
        base_backoff_seconds: Base backoff in seconds (default 30s)
        max_backoff_seconds: Maximum backoff in seconds (default 1 hour)
    
    Returns:
        Backoff time in seconds
    """
    if attempt < 1:
        attempt = 1
    
    # Exponential backoff: base * 2^(attempt-1)
    exponential = base_backoff_seconds * math.pow(2, attempt - 1)
    
    # Add jitter: random value between 0 and base_backoff_seconds
    jitter = random.uniform(0, base_backoff_seconds)
    
    # Total backoff
    total_backoff = exponential + jitter
    
    # Cap at max_backoff_seconds
    return min(total_backoff, max_backoff_seconds)


def should_retry(
    attempt: int,
    max_attempts: int,
    error: Exception
) -> bool:
    """
    Determine if a job should be retried based on attempt count and error type.
    
    Args:
        attempt: Current attempt number
        max_attempts: Maximum allowed attempts
        error: The exception that occurred
    
    Returns:
        True if job should be retried, False otherwise
    """
    if attempt >= max_attempts:
        return False
    
    # Don't retry on certain error types (e.g., validation errors)
    non_retryable_errors = (
        ValueError,
        TypeError,
        AttributeError,
    )
    
    if isinstance(error, non_retryable_errors):
        return False
    
    return True


def is_transient_error(error: Exception) -> bool:
    """
    Determine if an error is transient (should be retried).
    
    Args:
        error: The exception that occurred
    
    Returns:
        True if error is transient, False otherwise
    """
    # Transient errors that should be retried
    transient_error_messages = [
        'timeout',
        'connection',
        'network',
        'temporary',
        'rate limit',
        '503',
        '502',
        '504',
    ]
    
    error_str = str(error).lower()
    return any(msg in error_str for msg in transient_error_messages)


