"""CPU timing utilities for Monte Carlo jobs"""
import time
import os

def get_cpu_time():
    """Get CPU time in seconds using process_time (most accurate for CPU-bound work)"""
    return time.process_time()

def get_cpu_times():
    """Get detailed CPU times using os.times()"""
    times = os.times()
    return {
        'user': times.user,      # User CPU time
        'system': times.system,   # System CPU time
        'total': times.user + times.system,  # Total CPU time
        'elapsed': times.elapsed,  # Wall-clock time
    }

class CPUTimer:
    """Context manager for timing CPU usage"""
    def __init__(self):
        self.start_time = None
        self.end_time = None
        self.cpu_seconds = None
    
    def __enter__(self):
        self.start_time = get_cpu_time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = get_cpu_time()
        self.cpu_seconds = self.end_time - self.start_time
        return False
    
    def elapsed(self):
        """Get elapsed CPU seconds"""
        if self.cpu_seconds is not None:
            return self.cpu_seconds
        if self.start_time is not None:
            return get_cpu_time() - self.start_time
        return 0.0


