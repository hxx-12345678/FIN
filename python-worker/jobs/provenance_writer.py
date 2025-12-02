"""
Provenance Writer Helper
Used by model_run and monte_carlo jobs to write provenance entries
"""
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from utils.db import get_db_connection
from utils.logger import setup_logger

logger = setup_logger()


def write_provenance_entry(
    model_run_id: str,
    org_id: str,
    cell_key: str,
    source_type: str,  # 'txn' | 'assumption' | 'prompt'
    source_ref: Any,  # JSON-serializable (list of txn IDs, assumption object, etc.)
    prompt_id: Optional[str] = None,
    confidence_score: Optional[float] = None,
    prompt_influence_metadata: Optional[Dict[str, Any]] = None,
    cursor=None,
    commit: bool = True
):
    """
    Write a single provenance entry to the database.
    
    Args:
        model_run_id: UUID of the model run
        org_id: UUID of the organization
        cell_key: Canonical cell key (e.g., "2026-03:opEx:Salaries")
        source_type: One of 'txn', 'assumption', 'prompt'
        source_ref: JSON-serializable reference (list of transaction IDs, assumption object, etc.)
        prompt_id: Optional UUID of the prompt that generated this
        confidence_score: Optional confidence score (0.0-1.0)
        prompt_influence_metadata: Optional dict with prompt influence metadata:
            - influence_weight: float (0.0-1.0)
            - prompt_version: str
            - model_used: str
            - tokens_used: int
            - response_confidence: float
        cursor: Optional database cursor (if provided, won't create new connection)
        commit: Whether to commit the transaction (default True)
    
    Returns:
        The created provenance entry ID
    """
    should_close = False
    if cursor is None:
        conn = get_db_connection()
        cursor = conn.cursor()
        should_close = True
    
    try:
        # Serialize source_ref to JSON
        source_ref_json = json.dumps(source_ref) if source_ref else None
        
        # Merge prompt_influence_metadata into source_ref if provided
        if prompt_influence_metadata and source_ref_json:
            try:
                source_ref_obj = json.loads(source_ref_json) if isinstance(source_ref_json, str) else source_ref_json
                if isinstance(source_ref_obj, dict):
                    source_ref_obj['prompt_influence'] = prompt_influence_metadata
                    source_ref_json = json.dumps(source_ref_obj)
            except:
                pass  # If merge fails, use original source_ref
        
        # Insert provenance entry
        cursor.execute("""
            INSERT INTO provenance_entries (
                "modelRunId", "orgId", "cell_key", "source_type", 
                "source_ref", "promptId", "confidence_score", "created_at"
            )
            VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, NOW())
            RETURNING id
        """, (
            model_run_id,
            org_id,
            cell_key,
            source_type,
            source_ref_json,
            prompt_id,
            float(confidence_score) if confidence_score is not None else None,
        ))
        
        result = cursor.fetchone()
        entry_id = result[0] if result else None
        
        if commit and should_close:
            conn.commit()
        
        logger.debug(f"Created provenance entry {entry_id} for cell {cell_key}")
        return entry_id
        
    except Exception as e:
        if should_close:
            conn.rollback()
        logger.error(f"Failed to write provenance entry: {str(e)}", exc_info=True)
        raise
    finally:
        if should_close:
            cursor.close()
            conn.close()


def write_provenance_batch(
    model_run_id: str,
    org_id: str,
    entries: List[Dict[str, Any]],
    cursor=None,
    commit: bool = True
):
    """
    Write multiple provenance entries in a single batch operation.
    
    Args:
        model_run_id: UUID of the model run
        org_id: UUID of the organization
        entries: List of entry dictionaries with keys:
            - cell_key: str
            - source_type: str ('txn' | 'assumption' | 'prompt')
            - source_ref: Any (JSON-serializable)
            - prompt_id: Optional[str]
            - confidence_score: Optional[float]
            - prompt_influence_metadata: Optional[dict]
        cursor: Optional database cursor
        commit: Whether to commit the transaction
    
    Returns:
        Number of entries created
    """
    should_close = False
    if cursor is None:
        conn = get_db_connection()
        cursor = conn.cursor()
        should_close = True
    
    try:
        created_count = 0
        
        for entry in entries:
            cell_key = entry['cell_key']
            source_type = entry['source_type']
            source_ref = entry.get('source_ref')
            prompt_id = entry.get('prompt_id')
            confidence_score = entry.get('confidence_score')
            prompt_influence_metadata = entry.get('prompt_influence_metadata')
            
            # Serialize source_ref and merge prompt_influence_metadata if provided
            source_ref_json = json.dumps(source_ref) if source_ref else None
            if prompt_influence_metadata and source_ref_json:
                try:
                    source_ref_obj = json.loads(source_ref_json) if isinstance(source_ref_json, str) else source_ref_json
                    if isinstance(source_ref_obj, dict):
                        source_ref_obj['prompt_influence'] = prompt_influence_metadata
                        source_ref_json = json.dumps(source_ref_obj)
                except:
                    pass  # If merge fails, use original source_ref
            
            try:
                cursor.execute("""
                    INSERT INTO provenance_entries (
                        "modelRunId", "orgId", "cell_key", "source_type",
                        "source_ref", "promptId", "confidence_score", "created_at"
                    )
                    VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, NOW())
                    ON CONFLICT DO NOTHING
                """, (
                    model_run_id,
                    org_id,
                    cell_key,
                    source_type,
                    source_ref_json,
                    prompt_id,
                    float(confidence_score) if confidence_score is not None else None,
                ))
                created_count += cursor.rowcount
            except Exception as e:
                logger.warning(f"Failed to insert provenance entry for {cell_key}: {str(e)}")
                # Continue with other entries
        
        if commit and should_close:
            conn.commit()
        
        logger.info(f"Created {created_count} provenance entries for model run {model_run_id}")
        return created_count
        
    except Exception as e:
        if should_close:
            conn.rollback()
        logger.error(f"Failed to write provenance batch: {str(e)}", exc_info=True)
        raise
    finally:
        if should_close:
            cursor.close()
            conn.close()


def create_cell_key(year: int, month: int, item: str, subitem: Optional[str] = None) -> str:
    """
    Create a canonical cell key in the format: YYYY-MM:item:subitem
    
    Args:
        year: Year (e.g., 2026)
        month: Month (1-12)
        item: Main item name (e.g., "opEx", "revenue")
        subitem: Optional subitem name (e.g., "Salaries", "Marketing")
    
    Returns:
        Canonical cell key string
    """
    month_str = f"{year}-{month:02d}"
    if subitem:
        return f"{month_str}:{item}:{subitem}"
    return f"{month_str}:{item}"


def extract_transaction_ids(source_ref: Any) -> List[str]:
    """
    Extract transaction IDs from a source_ref.
    
    Args:
        source_ref: JSON-serializable reference (list of IDs, or list of objects with 'id')
    
    Returns:
        List of transaction UUID strings
    """
    if not source_ref:
        return []
    
    if isinstance(source_ref, list):
        ids = []
        for item in source_ref:
            if isinstance(item, str):
                ids.append(item)
            elif isinstance(item, dict) and 'id' in item:
                ids.append(item['id'])
        return ids
    
    if isinstance(source_ref, dict) and 'id' in source_ref:
        return [source_ref['id']]
    
    return []


