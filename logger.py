"""Centralized logging configuration with file rotation and console toggle."""
import os
import logging
import re
from logging.handlers import RotatingFileHandler
from pathlib import Path


class SanitizedFormatter(logging.Formatter):
    """Formatter that sanitizes sensitive data from log messages."""
    
    SENSITIVE_PATTERNS = [
        (r'(password|passwd|pwd)\s*[:=]\s*\S+', r'\1: [REDACTED]'),
        (r'smtpPassword["\']?\s*[:=]\s*["\']?[^"\']+', 'smtpPassword: [REDACTED]'),
        (r'(client_secret|refresh_token|token)\s*[:=]\s*\S+', r'\1: [REDACTED]'),
        (r'(api[_-]?key|secret[_-]?key)\s*[:=]\s*\S+', r'\1: [REDACTED]'),
    ]
    
    def format(self, record):
        """Format log record and sanitize sensitive data."""
        msg = super().format(record)
        for pattern, replacement in self.SENSITIVE_PATTERNS:
            msg = re.sub(pattern, replacement, msg, flags=re.IGNORECASE)
        return msg


def setup_logger(name: str = __name__, log_to_console: bool = None) -> logging.Logger:
    """
    Set up a logger with file rotation and optional console output.
    
    Args:
        name: Logger name (typically __name__)
        log_to_console: Whether to log to console. If None, reads from LOG_TO_CONSOLE env var.
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    
    # Don't add handlers if logger already configured
    if logger.handlers:
        return logger
    
    # Set log level from environment
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    logger.setLevel(getattr(logging, log_level, logging.INFO))
    
    # Get log directory from environment
    log_dir = Path(os.getenv('LOG_DIR', './logs'))
    log_dir.mkdir(parents=True, exist_ok=True)
    
    # File handler with rotation
    log_file = log_dir / 'app.log'
    max_bytes = int(os.getenv('LOG_MAX_SIZE', 10 * 1024 * 1024))  # Default 10MB
    backup_count = int(os.getenv('LOG_MAX_FILES', 5))  # Default 5 backup files
    
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    file_formatter = SanitizedFormatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)
    
    # Console handler (optional)
    if log_to_console is None:
        log_to_console = os.getenv('LOG_TO_CONSOLE', 'false').lower() in ('true', '1', 'yes')
    
    if log_to_console:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        console_formatter = SanitizedFormatter(
            '%(asctime)s - %(levelname)s - %(message)s',
            datefmt='%H:%M:%S'
        )
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
    
    return logger

