"""Logging utilities"""
import logging
import sys
import io
from datetime import datetime

class UTF8StreamHandler(logging.StreamHandler):
    """Stream handler that encodes output as UTF-8, handling Windows console encoding issues"""
    def __init__(self, stream=None):
        if stream is None:
            stream = sys.stdout
        # Wrap stream to handle encoding
        if hasattr(stream, 'buffer'):
            # For stdout/stderr, use the underlying buffer with UTF-8 encoding
            stream = io.TextIOWrapper(stream.buffer, encoding='utf-8', errors='replace', line_buffering=True)
        super().__init__(stream)
    
    def emit(self, record):
        try:
            msg = self.format(record)
            stream = self.stream
            # Ensure message is properly encoded
            if hasattr(stream, 'write'):
                stream.write(msg + self.terminator)
                self.flush()
        except UnicodeEncodeError:
            # Fallback: replace problematic characters
            try:
                msg = self.format(record)
                # Replace emojis and other problematic Unicode with ASCII equivalents
                msg = msg.encode('ascii', errors='replace').decode('ascii')
                stream.write(msg + self.terminator)
                self.flush()
            except Exception:
                self.handleError(record)

def setup_logger(name='finapilot-worker', level=logging.INFO):
    """Setup logger with formatting and UTF-8 encoding support"""
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    if not logger.handlers:
        # Use UTF-8 handler to avoid encoding errors on Windows
        handler = UTF8StreamHandler(sys.stdout)
        handler.setLevel(level)
        
        formatter = logging.Formatter(
            '[%(asctime)s] [%(levelname)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger

