"""
Model Cache Utilities
Provides caching logic for model runs to avoid redundant computations
"""

import json
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from utils.db import get_db_connection
from utils.logger import setup_logger

logger = setup_logger()

CACHE_TTL_HOURS = 24
CACHE_TTL_SECONDS = CACHE_TTL_HOURS * 60 * 60


def generate_input_hash(assumptions: Dict[str, Any], params: Dict[str, Any]) -> str:
    """
    Generate input hash from model assumptions and parameters.
    
    Args:
        assumptions: Model assumptions
        params: Run parameters
    
    Returns:
        SHA256 hash (first 16 characters)
    """
    input_string = json.dumps({
        'assumptions': assumptions or {},
        'params': params or {},
    }, sort_keys=True)
    
    hash_obj = hashlib.sha256(input_string.encode('utf-8'))
    return hash_obj.hexdigest()[:16]


def get_cached_model_run(
    org_id: str,
    input_hash: str,
    model_version: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Get cached model run result if available and not expired.
    
    Args:
        org_id: Organization ID
        input_hash: Input hash
        model_version: Optional model version
    
    Returns:
        Cached model run dict or None
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build query - use camelCase "orgId" as per Prisma schema
        query = """
            SELECT id, summary_json, created_at, params_json
            FROM model_runs
            WHERE "orgId" = %s
            AND status = 'done'
            AND params_json::jsonb->>'inputHash' = %s
        """
        params = [org_id, input_hash]
        
        if model_version:
            query += " AND params_json::jsonb->>'modelVersion' = %s"
            params.append(model_version)
        
        query += " ORDER BY created_at DESC LIMIT 1"
        
        cursor.execute(query, params)
        row = cursor.fetchone()
        
        if not row:
            cursor.close()
            conn.close()
            return None
        
        model_run_id, summary_json, created_at, params_json = row
        
        # Check if cache is still valid
        created_at_dt = created_at if isinstance(created_at, datetime) else datetime.fromisoformat(str(created_at))
        expires_at = created_at_dt + timedelta(seconds=CACHE_TTL_SECONDS)
        now = datetime.now(timezone.utc)
        
        if now > expires_at:
            logger.info(f"Cache expired for org {org_id}, hash {input_hash}")
            cursor.close()
            conn.close()
            return None
        
        # Parse summary JSON
        if isinstance(summary_json, str):
            try:
                summary_json = json.loads(summary_json)
            except:
                summary_json = {}

        # Normalize cached payload for backward compatibility across frontend expectations.
        # Some older summaries only had totalRevenue/totalExpenses; newer clients may read revenue/expenses.
        if isinstance(summary_json, dict):
            if 'revenue' not in summary_json and 'totalRevenue' in summary_json:
                summary_json['revenue'] = summary_json.get('totalRevenue', 0)
            if 'expenses' not in summary_json and 'totalExpenses' in summary_json:
                summary_json['expenses'] = summary_json.get('totalExpenses', 0)

        # Guardrail: never serve a cache entry that doesn't include a usable monthly series.
        # Older runs (or runs that hit computation errors) may have summary_json.monthly = {}.
        # If we return those from cache, we propagate "empty model" UX even when the computation
        # can succeed on a fresh run.
        try:
            monthly = None
            if isinstance(summary_json, dict):
                monthly = summary_json.get('monthly')
                if (not monthly) and isinstance(summary_json.get('fullResult'), dict):
                    monthly = summary_json['fullResult'].get('monthly')
            if not (isinstance(monthly, dict) and len(monthly.keys()) > 0):
                logger.info(f"Cache entry missing monthly series; treating as cache miss (org {org_id}, hash {input_hash})")
                cursor.close()
                conn.close()
                return None
        except Exception:
            # If anything about validation fails, prefer recomputing
            logger.info(f"Cache validation failed; treating as cache miss (org {org_id}, hash {input_hash})")
            cursor.close()
            conn.close()
            return None
        
        cursor.close()
        conn.close()
        
        logger.info(f"Cache hit for org {org_id}, hash {input_hash}")
        return {
            'modelRunId': model_run_id,
            'summaryJson': summary_json,
            'cachedAt': created_at_dt,
            'expiresAt': expires_at,
        }
    except Exception as e:
        logger.error(f"Failed to get cached model run: {str(e)}")
        return None


def cache_model_run(
    model_run_id: str,
    org_id: str,
    input_hash: str,
    model_version: Optional[str] = None
) -> None:
    """
    Store model run in cache by updating params_json with cache metadata.
    
    Args:
        model_run_id: Model run ID
        org_id: Organization ID
        input_hash: Input hash
        model_version: Optional model version
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get current params
        cursor.execute("""
            SELECT params_json FROM model_runs WHERE id = %s
        """, (model_run_id,))
        
        row = cursor.fetchone()
        if not row:
            cursor.close()
            conn.close()
            return
        
        params_json = row[0]
        if isinstance(params_json, str):
            try:
                params_json = json.loads(params_json)
            except:
                params_json = {}
        
        # Update with cache metadata
        params_json = params_json or {}
        params_json['inputHash'] = input_hash
        if model_version:
            params_json['modelVersion'] = model_version
        params_json['cachedAt'] = datetime.now(timezone.utc).isoformat()
        
        # Update model run
        cursor.execute("""
            UPDATE model_runs
            SET params_json = %s::jsonb
            WHERE id = %s
        """, (json.dumps(params_json), model_run_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info(f"Cached model run: {model_run_id} (org: {org_id}, hash: {input_hash})")
    except Exception as e:
        logger.error(f"Failed to cache model run: {str(e)}")
        # Don't throw - caching is non-critical

