"""
Export Utilities
Provides defensive checks, data sanitization, and watermarking for exports
"""

import json
import math
from typing import Any, Dict, Optional
from datetime import datetime, timezone


def sanitize_value(value: Any, default: Any = 0) -> Any:
    """
    Sanitize a value to ensure it's not NaN, None, or undefined.
    
    Args:
        value: The value to sanitize
        default: Default value if value is invalid
    
    Returns:
        Sanitized value
    """
    if value is None:
        return default
    
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return default
        return value
    
    if isinstance(value, int):
        return value
    
    if isinstance(value, str):
        # Try to parse as number
        try:
            num = float(value)
            if math.isnan(num) or math.isinf(num):
                return default
            return num
        except (ValueError, TypeError):
            return value if value else default
    
    # For dict/list, recursively sanitize
    if isinstance(value, dict):
        return {k: sanitize_value(v, default) for k, v in value.items()}
    
    if isinstance(value, list):
        return [sanitize_value(item, default) for item in value]
    
    return value if value is not None else default


def sanitize_summary_json(summary_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize entire summary JSON to remove NaN, None, undefined values.
    
    Args:
        summary_json: Model run summary JSON
    
    Returns:
        Sanitized summary JSON
    """
    if not summary_json:
        return {
            'totalRevenue': 0,
            'totalExpenses': 0,
            'netIncome': 0,
            'cashBalance': 0,
            'burnRate': 0,
            'runwayMonths': 0,
            'monthlyProjections': [],
        }
    
    sanitized = {}
    
    # Sanitize top-level metrics
    sanitized['totalRevenue'] = sanitize_value(summary_json.get('totalRevenue'), 0)
    sanitized['totalExpenses'] = sanitize_value(summary_json.get('totalExpenses'), 0)
    sanitized['netIncome'] = sanitize_value(summary_json.get('netIncome'), 0)
    sanitized['cashBalance'] = sanitize_value(summary_json.get('cashBalance'), 0)
    sanitized['burnRate'] = sanitize_value(summary_json.get('burnRate'), 0)
    sanitized['runwayMonths'] = sanitize_value(summary_json.get('runwayMonths'), 0)
    
    # Sanitize monthly projections
    monthly_projections = summary_json.get('monthlyProjections', [])
    if isinstance(monthly_projections, list):
        sanitized['monthlyProjections'] = [
            {
                'month': sanitize_value(proj.get('month'), ''),
                'revenue': sanitize_value(proj.get('revenue'), 0),
                'expenses': sanitize_value(proj.get('expenses'), 0),
                'netIncome': sanitize_value(proj.get('netIncome'), 0),
                'cashFlow': sanitize_value(proj.get('cashFlow'), 0),
                'cashBalance': sanitize_value(proj.get('cashBalance'), 0),
            }
            for proj in monthly_projections
        ]
    else:
        sanitized['monthlyProjections'] = []
    
    # Preserve other fields
    for key, value in summary_json.items():
        if key not in sanitized:
            sanitized[key] = sanitize_value(value, None)
    
    return sanitized


def format_currency(value: Any, currency: str = 'USD') -> str:
    """
    Format a value as currency, handling NaN/None.
    
    Args:
        value: Numeric value
        currency: Currency code (USD, EUR, etc.)
    
    Returns:
        Formatted currency string
    """
    sanitized = sanitize_value(value, 0)
    
    if currency == 'USD':
        return f"${sanitized:,.2f}"
    elif currency == 'EUR':
        return f"€{sanitized:,.2f}"
    elif currency == 'GBP':
        return f"£{sanitized:,.2f}"
    elif currency == 'INR':
        return f"₹{sanitized:,.2f}"
    else:
        return f"{sanitized:,.2f} {currency}"


def format_percentage(value: Any, decimals: int = 1) -> str:
    """
    Format a value as percentage, handling NaN/None.
    
    Args:
        value: Numeric value (0-1 or 0-100)
        decimals: Number of decimal places
    
    Returns:
        Formatted percentage string
    """
    sanitized = sanitize_value(value, 0)
    
    # If value is between 0 and 1, assume it's a decimal (0.08 = 8%)
    if 0 <= sanitized <= 1:
        sanitized = sanitized * 100
    
    return f"{sanitized:.{decimals}f}%"


def generate_watermark_text(is_demo: bool = False, is_free: bool = False) -> str:
    """
    Generate watermark text for exports.
    
    Args:
        is_demo: Whether this is a demo account
        is_free: Whether this is a free tier account
    
    Returns:
        Watermark text
    """
    if is_demo:
        return "DEMO - FinaPilot"
    elif is_free:
        return "FinaPilot Free"
    else:
        return "FinaPilot"


def validate_export_data(summary_json: Dict[str, Any]) -> tuple[bool, list[str]]:
    """
    Validate export data for issues.
    
    Args:
        summary_json: Model run summary JSON
    
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []
    
    if not summary_json:
        errors.append("Summary JSON is empty")
        return False, errors
    
    # Check for required fields
    required_fields = ['totalRevenue', 'totalExpenses', 'netIncome', 'cashBalance']
    for field in required_fields:
        if field not in summary_json:
            errors.append(f"Missing required field: {field}")
        else:
            value = summary_json[field]
            if value is None:
                errors.append(f"Field {field} is None")
            elif isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
                errors.append(f"Field {field} contains NaN or Inf")
    
    # Check monthly projections
    monthly_projections = summary_json.get('monthlyProjections', [])
    if not isinstance(monthly_projections, list):
        errors.append("monthlyProjections is not a list")
    elif len(monthly_projections) == 0:
        errors.append("monthlyProjections is empty")
    else:
        # Check first few projections
        for i, proj in enumerate(monthly_projections[:3]):
            if not isinstance(proj, dict):
                errors.append(f"Monthly projection {i} is not a dict")
                continue
            
            for field in ['revenue', 'expenses', 'netIncome']:
                if field in proj:
                    value = proj[field]
                    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
                        errors.append(f"Monthly projection {i}.{field} contains NaN or Inf")
    
    return len(errors) == 0, errors


def truncate_text(text: str, max_length: int = 100) -> str:
    """
    Truncate text to prevent overflow in slides/documents.
    
    Args:
        text: Text to truncate
        max_length: Maximum length
    
    Returns:
        Truncated text
    """
    if not text:
        return ""
    
    if len(text) <= max_length:
        return text
    
    return text[:max_length - 3] + "..."


def safe_get_nested(data: Dict[str, Any], *keys: str, default: Any = None) -> Any:
    """
    Safely get nested dictionary value.
    
    Args:
        data: Dictionary
        keys: Path to value
        default: Default value if not found
    
    Returns:
        Value or default
    """
    current = data
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return default
    return sanitize_value(current, default)

