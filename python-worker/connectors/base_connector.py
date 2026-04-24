"""
Base Connector Class

Provides common functionality for all financial platform connectors:
- Deduplication logic with hash-based duplicate detection
- Atomic upsert operations (all-or-nothing transactions)
- Audit logging with trace IDs for provenance tracking
- OAuth2 token refresh handling
- Error handling and retry logic
- Rate limiting cooperation
"""

import hashlib
import json
import logging
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
import asyncio
import aiohttp

from .unified_schema import (
    UnifiedTransaction,
    DeduplicationResult,
    SyncResult,
    TransactionStatus,
    TransactionCategory,
)
from utils.db import get_db_connection
from utils.logger import setup_logger


class BaseConnector(ABC):
    """
    Abstract base class for all financial platform connectors.
    
    Subclasses must implement:
    - fetch_transactions(): Retrieve raw transaction data from platform
    - transform_to_unified(): Convert platform-specific format to UnifiedTransaction
    - parse_fees(): Extract and reconcile fees (critical for payment platforms)
    - handle_rate_limiting(): Implement backoff strategy for this platform
    - validate_config(): Verify required credentials are present
    """
    
    def __init__(self, org_id: str, connector_id: str, encrypted_config: Dict[str, Any]):
        """
        Initialize connector.
        
        Args:
            org_id: Organization ID in FinaPilot
            connector_id: Connector record ID in database
            encrypted_config: Decrypted credentials/config from Connector.encryptedConfig
        """
        self.org_id = org_id
        self.connector_id = connector_id
        self.config = encrypted_config
        self.trace_id = str(uuid.uuid4())  # Unique trace ID for this sync
        
        self.logger = setup_logger()
        self.db = get_db_connection()
        
        # Sync statistics
        self.sync_result = SyncResult(
            connector_type=self.platform_name,
            org_id=org_id,
            trace_id=self.trace_id,
        )
        
        # Deduplication cache (loaded during sync)
        self.existing_hashes: Dict[str, str] = {}  # Maps hash -> internal_id
    
    @property
    @abstractmethod
    def platform_name(self) -> str:
        """Platform identifier (e.g., 'stripe', 'quickbooks')."""
        pass
    
    @abstractmethod
    async def validate_config(self) -> Tuple[bool, str]:
        """
        Validate that required credentials are present and valid.
        
        Returns:
            (is_valid, error_message)
        """
        pass
    
    @abstractmethod
    async def fetch_transactions(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch raw transaction data from platform API.
        
        Platform-specific implementation that handles:
        - Pagination
        - Date filtering
        - Rate limiting
        - Token refresh if needed
        
        Returns:
            List of raw transaction objects from platform API
        """
        pass
    
    @abstractmethod
    def transform_to_unified(
        self,
        raw_transaction: Dict[str, Any],
    ) -> Optional[UnifiedTransaction]:
        """
        Transform platform-specific transaction to UnifiedTransaction.
        
        Returns:
            UnifiedTransaction or None if record should be skipped
            
        Subclass should:
        - Extract all relevant fields from platform format
        - Handle status mapping
        - Parse date formats
        - Reconcile fees from commission/processing fee fields
        - Categorize transaction
        """
        pass
    
    def parse_fees(self, raw_transaction: Dict[str, Any]) -> Decimal:
        """
        Extract fees from transaction.
        
        Override in subclass for platform-specific fee extraction.
        Common patterns:
        - Stripe: charges.application_fee_amount or balance_transaction.fee
        - Razorpay: fee field
        - QuickBooks: no fees in transaction, added separately
        
        Default: Returns Decimal(0)
        """
        return Decimal(0)
    
    async def handle_rate_limiting(self, retry_after: Optional[int] = None):
        """
        Handle rate limit backoff.
        
        Override in subclass for platform-specific rate limiting.
        """
        default_backoff = 60  # 60 seconds by default
        wait_time = retry_after or default_backoff
        self.logger.warning(
            f"Rate limit hit for {self.platform_name}. "
            f"Backing off for {wait_time}s. Trace: {self.trace_id}"
        )
        await asyncio.sleep(wait_time)
    
    async def refresh_oauth_token(self) -> Tuple[bool, Optional[str]]:
        """
        Refresh OAuth2 token if expired.
        
        For SAP, Oracle, and other OAuth-protected platforms.
        Override in subclass with platform-specific refresh logic.
        
        Returns:
            (success, error_message)
        """
        return (True, None)
    
    # ========================================================================
    # Deduplication & Data Integrity (Core Anti-Duplication Layer)
    # ========================================================================
    
    async def load_existing_hashes(self):
        """
        Load all existing transaction hashes for this org.
        
        Used during sync to detect duplicates before database operations.
        This is more efficient than querying per-record.
        """
        query = """
            SELECT source_id, internal_id, audit_hash
            FROM raw_transactions
            WHERE org_id = %s AND connector_id = %s
        """
        
        try:
            cursor = self.db.cursor()
            cursor.execute(query, (self.org_id, self.connector_id))
            rows = cursor.fetchall()
            
            for row in rows:
                source_id, internal_id, audit_hash = row
                if audit_hash:
                    self.existing_hashes[audit_hash] = internal_id
            
            self.logger.info(
                f"Loaded {len(self.existing_hashes)} existing hashes for "
                f"{self.platform_name} org {self.org_id}. Trace: {self.trace_id}"
            )
        except Exception as e:
            self.logger.error(f"Failed to load existing hashes: {e}")
            self.sync_result.add_error("hash_load_error", str(e))
    
    def validate_and_dedupe(
        self,
        transaction: UnifiedTransaction,
    ) -> DeduplicationResult:
        """
        Validate transaction and check for duplicates.
        
        Implements the "Anti-Duplication Layer" that prevents:
        1. Double-counting when users manually export + auto-sync
        2. Duplicate records from connector retries
        3. Data corruption from partial syncs
        
        Returns:
            DeduplicationResult with is_duplicate flag and details
        """
        # Validate transaction data
        if not transaction.audit_hash:
            return DeduplicationResult(
                is_duplicate=False,
                message="No audit hash generated"
            )
        
        # Check if this exact hash already exists
        if transaction.audit_hash in self.existing_hashes:
            return DeduplicationResult(
                is_duplicate=True,
                existing_hash=transaction.audit_hash,
                conflict_type='exact_match',
                confidence=1.0,
                message=f"Exact duplicate detected (hash: {transaction.audit_hash})"
            )
        
        # Check for partial duplicates (same source_id)
        query = """
            SELECT internal_id, audit_hash FROM raw_transactions
            WHERE org_id = %s AND connector_id = %s AND source_id = %s
        """
        
        try:
            cursor = self.db.cursor()
            cursor.execute(query, (self.org_id, self.connector_id, transaction.source_id))
            row = cursor.fetchone()
            
            if row:
                existing_internal_id, existing_hash = row
                # Same source_id but different hash - data might have been modified
                return DeduplicationResult(
                    is_duplicate=True,
                    existing_hash=existing_hash,
                    conflict_type='partial_match',
                    confidence=0.8,
                    message=f"Source ID already exists (existing: {existing_hash})"
                )
        except Exception as e:
            self.logger.error(f"Duplicate check error: {e}")
            self.sync_result.add_error("dedup_check_error", str(e))
        
        # Not a duplicate
        return DeduplicationResult(is_duplicate=False)
    
    # ========================================================================
    # Atomic Sync Operations (All-or-Nothing Upsert)
    # ========================================================================
    
    async def upsert_transactions(
        self,
        transactions: List[UnifiedTransaction],
    ) -> Tuple[int, int, int]:  # inserted, updated, skipped
        """
        Atomically insert or update transactions.
        
        Ensures database consistency:
        - All records inserted or all rolled back (atomic)
        - Deduplication happens BEFORE write
        - Update existing records if source_id matches
        - Skip duplicates
        
        Returns:
            (inserted_count, updated_count, skipped_count)
        """
        inserted = 0
        updated = 0
        skipped = 0
        
        cursor = self.db.cursor()
        try:
            # Start transaction
            self.db.begin()
            
            for transaction in transactions:
                # Validate and check for duplicates
                dedup_result = self.validate_and_dedupe(transaction)
                
                if dedup_result.is_duplicate:
                    self.logger.debug(
                        f"Skipping duplicate: {dedup_result.message} "
                        f"(trace: {self.trace_id})"
                    )
                    skipped += 1
                    self.sync_result.total_duplicates_detected += 1
                    continue
                
                # Generate internal_id if not set
                if not transaction.internal_id:
                    transaction.internal_id = str(uuid.uuid4())
                
                # Ensure audit_hash is set
                if not transaction.audit_hash:
                    transaction.audit_hash = transaction._generate_audit_hash()
                
                # Set trace_id for audit trail
                if not transaction.trace_id:
                    transaction.trace_id = self.trace_id
                
                # Upsert logic: update if exists, else insert
                upsert_query = """
                    INSERT INTO raw_transactions (
                        id, org_id, connector_id, source_id, date, amount,
                        currency, category, description, raw_payload,
                        imported_at, is_duplicate, audit_hash, trace_id
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (org_id, source_id) DO UPDATE SET
                        amount = EXCLUDED.amount,
                        currency = EXCLUDED.currency,
                        category = EXCLUDED.category,
                        description = EXCLUDED.description,
                        raw_payload = EXCLUDED.raw_payload,
                        is_duplicate = EXCLUDED.is_duplicate
                """
                
                cursor.execute(upsert_query, (
                    transaction.internal_id,
                    self.org_id,
                    self.connector_id,
                    transaction.source_id,
                    transaction.transaction_date.date(),
                    str(transaction.net_amount),
                    transaction.currency,
                    transaction.category.value if transaction.category else None,
                    transaction.description,
                    json.dumps(transaction.raw_payload) if transaction.raw_payload else None,
                    datetime.utcnow(),
                    dedup_result.is_duplicate,
                    transaction.audit_hash,
                    transaction.trace_id,
                ))
                
                if cursor.rowcount > 1:
                    updated += 1
                else:
                    inserted += 1
                
                # Add to hash cache for rest of sync
                if transaction.audit_hash:
                    self.existing_hashes[transaction.audit_hash] = transaction.internal_id
            
            # Commit entire batch atomically
            self.db.commit()
            self.logger.info(
                f"Atomic upsert completed: {inserted} inserted, {updated} updated, "
                f"{skipped} skipped for {self.platform_name}. Trace: {self.trace_id}"
            )
            
        except Exception as e:
            # Rollback entire batch on any error (all-or-nothing)
            self.db.rollback()
            self.logger.error(
                f"Atomic upsert failed, rolled back all changes: {e}. "
                f"Trace: {self.trace_id}"
            )
            self.sync_result.add_error("upsert_error", str(e))
            raise
        
        return inserted, updated, skipped
    
    # ========================================================================
    # Audit Logging & Provenance
    # ========================================================================
    
    async def log_sync_event(
        self,
        event_type: str,
        endpoint: str,
        status_code: int,
        records_processed: int,
        details: Optional[Dict[str, Any]] = None,
    ):
        """
        Log API call for audit trail and provenance tracking.
        
        This supports FinaPilot's "Governance and Provenance" feature:
        - Every API call is logged with timestamp and status
        - Enables "one-click proof" during audits
        - Trace ID links all related records
        """
        query = """
            INSERT INTO audit_logs (
                "orgId", action, object_type, object_id,
                meta_json, created_at
            ) VALUES (%s, %s, %s, %s, %s, NOW())
        """
        
        try:
            cursor = self.db.cursor()
            meta_json = {
                'event_type': event_type,
                'endpoint': endpoint,
                'status_code': status_code,
                'records_processed': records_processed,
                'platform': self.platform_name,
                'trace_id': self.trace_id,
                **(details or {})
            }
            
            cursor.execute(query, (
                self.org_id,
                f'{self.platform_name}_sync',
                'connector',
                self.connector_id,
                json.dumps(meta_json),
            ))
            
            self.db.commit()
        except Exception as e:
            self.logger.error(f"Failed to log sync event: {e}")
    
    # ========================================================================
    # Main Sync Orchestration
    # ========================================================================
    
    async def sync(self) -> SyncResult:
        """
        Execute complete connector sync.
        
        Orchestrates:
        1. Validate config and refresh tokens
        2. Load existing hashes for deduplication
        3. Fetch transactions from platform
        4. Transform to unified schema
        5. Atomic upsert to database
        6. Log audit events
        7. Return sync results
        """
        self.sync_result.started_at = datetime.utcnow()
        self.sync_result.status = "running"
        
        try:
            self.logger.info(
                f"Starting sync for {self.platform_name} (org: {self.org_id}). "
                f"Trace: {self.trace_id}"
            )
            
            # Step 1: Validate config
            is_valid, error = await self.validate_config()
            if not is_valid:
                self.sync_result.add_error("validation_error", error)
                self.sync_result.status = "failed"
                return self.sync_result
            
            # Step 2: Refresh OAuth token if needed
            success, error = await self.refresh_oauth_token()
            if not success:
                self.sync_result.add_error("token_refresh_error", error)
                self.sync_result.status = "failed"
                return self.sync_result
            
            # Step 3: Load existing hashes for deduplication
            await self.load_existing_hashes()
            
            # Step 4: Fetch transactions
            raw_transactions = await self.fetch_transactions()
            self.sync_result.total_records_fetched = len(raw_transactions)
            
            # Step 5: Transform to unified schema
            unified_transactions = []
            for raw_txn in raw_transactions:
                try:
                    unified = self.transform_to_unified(raw_txn)
                    if unified:
                        unified_transactions.append(unified)
                        self.sync_result.total_records_processed += 1
                except Exception as e:
                    self.logger.error(
                        f"Failed to transform transaction: {e}. "
                        f"Trace: {self.trace_id}"
                    )
                    self.sync_result.add_error(
                        "transform_error",
                        str(e),
                        {'raw_transaction': raw_txn}
                    )
            
            # Step 6: Atomic upsert
            if unified_transactions:
                inserted, updated, skipped = await self.upsert_transactions(
                    unified_transactions
                )
                self.sync_result.total_records_inserted = inserted
                self.sync_result.total_records_updated = updated
                self.sync_result.total_records_skipped = skipped
            
            # Step 7: Log completion
            await self.log_sync_event(
                event_type='sync_completed',
                endpoint='multiple',
                status_code=200,
                records_processed=self.sync_result.total_records_processed,
                details={
                    'inserted': self.sync_result.total_records_inserted,
                    'updated': self.sync_result.total_records_updated,
                    'skipped': self.sync_result.total_records_skipped,
                }
            )
            
            self.sync_result.status = "completed"
            self.logger.info(
                f"Sync completed for {self.platform_name}. "
                f"Inserted: {self.sync_result.total_records_inserted}, "
                f"Updated: {self.sync_result.total_records_updated}, "
                f"Skipped: {self.sync_result.total_records_skipped}. "
                f"Trace: {self.trace_id}"
            )
            
        except Exception as e:
            self.logger.error(
                f"Sync failed for {self.platform_name}: {e}. "
                f"Trace: {self.trace_id}"
            )
            self.sync_result.add_error("sync_error", str(e))
            self.sync_result.status = "failed"
        
        finally:
            self.sync_result.completed_at = datetime.utcnow()
        
        return self.sync_result
