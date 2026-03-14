"""
QuickBooks Online Connector

Syncs accounting data from QuickBooks Online via OAuth2.

Key OAuth Trap: QuickBooks requires realm ID along with access tokens.
Tokens expire after ~1 hour, requiring refresh. Also handles automatic 
token refresh on 401 responses.

API Reference: https://developer.intuit.com/app/developer/qbo/docs
"""

import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
import aiohttp
import json

from .base_connector import BaseConnector
from .unified_schema import (
    UnifiedTransaction,
    TransactionStatus,
    TransactionCategory,
)


class QuickBooksConnector(BaseConnector):
    """QuickBooks Online connector with OAuth2 token refresh."""
    
    @property
    def platform_name(self) -> str:
        return "quickbooks"
    
    async def validate_config(self) -> Tuple[bool, str]:
        """Validate QuickBooks OAuth credentials."""
        if not self.config.get('accessToken'):
            return False, "QuickBooks access token not found"
        if not self.config.get('realmId'):
            return False, "QuickBooks realm ID not found"
        
        try:
            # Test by fetching company info
            success = await self._test_connection()
            if success:
                return True, ""
            else:
                return False, "Failed to connect to QuickBooks API"
        except Exception as e:
            return False, f"QuickBooks validation error: {str(e)}"
        
        return False, "Failed to validate QuickBooks configuration"
    
    async def _test_connection(self) -> bool:
        """Test QuickBooks API connection."""
        try:
            realm_id = self.config.get('realmId')
            access_token = self.config.get('accessToken')
            
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f"Bearer {access_token}",
                    'Accept': 'application/json',
                }
                url = f"https://quickbooks.api.intuit.com/v2/company/{realm_id}/companyinfo/{realm_id}"
                
                async with session.get(
                    url,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    return resp.status == 200
        except Exception as e:
            self.logger.error(f"QuickBooks connection test failed: {e}")
            return False
        
        return False
    
    async def refresh_oauth_token(self) -> Tuple[bool, Optional[str]]:
        """
        Refresh OAuth2 token if expired.
        
        QuickBooks tokens expire after ~1 hour and require refresh.
        This is called before sync to ensure valid token.
        """
        if not self.config.get('refreshToken'):
            return True, None  # No refresh token, assume still valid
        
        # Check if token is close to expiration
        expires_at = self.config.get('expiresAt')
        if expires_at:
            try:
                exp_time = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                # If more than 5 minutes left, don't refresh
                if datetime.utcnow() < (exp_time - timedelta(minutes=5)):
                    return True, None
            except:
                pass
        
        try:
            refresh_token = self.config.get('refreshToken')
            client_id = self.config.get('clientId')
            client_secret = self.config.get('clientSecret')
            
            async with aiohttp.ClientSession() as session:
                data = {
                    'grant_type': 'refresh_token',
                    'refresh_token': refresh_token,
                }
                auth = aiohttp.BasicAuth(client_id, client_secret)
                
                async with session.post(
                    'https://oauth.platform.intuit.com/oauth2/tokens/bearer',
                    data=data,
                    auth=auth,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        token_data = await resp.json()
                        self.config['accessToken'] = token_data['access_token']
                        self.config['refreshToken'] = token_data.get('refresh_token', refresh_token)
                        
                        if 'expires_in' in token_data:
                            expires_at = datetime.utcnow() + timedelta(seconds=token_data['expires_in'])
                            self.config['expiresAt'] = expires_at.isoformat()
                        
                        # Save updated config to database
                        await self._update_config()
                        
                        self.logger.info(f"QuickBooks token refreshed. Trace: {self.trace_id}")
                        return True, None
                    else:
                        error_msg = f"Token refresh failed: HTTP {resp.status}"
                        return False, error_msg
        except Exception as e:
            return False, f"Token refresh error: {str(e)}"
        
        return False, "Unknown token refresh error"
    
    async def _update_config(self):
        """Update encrypted config in database with new tokens."""
        from utils.crypto import encrypt
        
        try:
            config_json = json.dumps(self.config)
            encrypted = encrypt(config_json)
            
            query = """
                UPDATE connectors
                SET encrypted_config = %s, config_json = %s
                WHERE id = %s
            """
            cursor = self.db.cursor()
            cursor.execute(query, (
                encrypted.encode(),
                json.dumps(self.config),
                self.connector_id,
            ))
            self.db.commit()
        except Exception as e:
            self.logger.error(f"Failed to update QuickBooks config: {e}")
    
    async def fetch_transactions(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch transactions from QuickBooks.
        
        Fetches both invoices (revenue) and expenses to build complete picture.
        """
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        all_invoices = await self._fetch_invoices(start_date, end_date)
        all_expenses = await self._fetch_expenses(start_date, end_date)
        all_bills = await self._fetch_bills(start_date, end_date)
        
        transactions = all_invoices + all_expenses + all_bills
        
        self.logger.info(
            f"Fetched {len(all_invoices)} invoices, {len(all_expenses)} expenses, "
            f"{len(all_bills)} bills from QuickBooks. Trace: {self.trace_id}"
        )
        
        return transactions
    
    async def _fetch_invoices(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch QuickBooks invoices."""
        realm_id = self.config.get('realmId')
        access_token = self.config.get('accessToken')
        
        # QuickBooks uses QQL (Query Language)
        query = (
            f"select * from Invoice where "
            f"TxnDate >= '{start_date.date()}' and "
            f"TxnDate <= '{end_date.date()}'"
        )
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f"Bearer {access_token}",
                    'Accept': 'application/json',
                }
                params = {'query': query}
                
                async with session.get(
                    f"https://quickbooks.api.intuit.com/v2/company/{realm_id}/query",
                    params=params,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        invoices = data.get('QueryResponse', {}).get('Invoice', [])
                        # Ensure each item has the correct entityType for transformation
                        for inv in invoices:
                            inv['entityType'] = 'Invoice'
                        return invoices
                    elif resp.status == 401:
                        # Token expired, refresh and retry
                        success, error = await self.refresh_oauth_token()
                        if success:
                            return await self._fetch_invoices(start_date, end_date)
                        else:
                            self.logger.error(f"Token refresh failed: {error}")
                            return []
                    else:
                        self.logger.error(f"Failed to fetch invoices: {resp.status}")
                        return []
        except Exception as e:
            self.logger.error(f"Error fetching QuickBooks invoices: {e}")
            return []
        
        return []
    
    async def _fetch_expenses(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch QuickBooks expenses (journal entries, checks, etc)."""
        realm_id = self.config.get('realmId')
        access_token = self.config.get('accessToken')
        
        # Get both checks and journal entries
        all_expenses = []
        
        # Fetch checks
        check_query = (
            f"select * from Check where "
            f"TxnDate >= '{start_date.date()}' and "
            f"TxnDate <= '{end_date.date()}'"
        )
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f"Bearer {access_token}",
                    'Accept': 'application/json',
                }
                params = {'query': check_query}
                
                async with session.get(
                    f"https://quickbooks.api.intuit.com/v2/company/{realm_id}/query",
                    params=params,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        checks = data.get('QueryResponse', {}).get('Check', [])
                        for check in checks:
                            check['entityType'] = 'Check'
                        all_expenses.extend(checks)
        except Exception as e:
            self.logger.warning(f"Error fetching checks: {e}")
        
        # Fetch journal entries
        journal_query = (
            f"select * from JournalEntry where "
            f"TxnDate >= '{start_date.date()}' and "
            f"TxnDate <= '{end_date.date()}'"
        )
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f"Bearer {access_token}",
                    'Accept': 'application/json',
                }
                params = {'query': journal_query}
                
                async with session.get(
                    f"https://quickbooks.api.intuit.com/v2/company/{realm_id}/query",
                    params=params,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        entries = data.get('QueryResponse', {}).get('JournalEntry', [])
                        for je in entries:
                            je['entityType'] = 'JournalEntry'
                        all_expenses.extend(entries)
        except Exception as e:
            self.logger.warning(f"Error fetching journal entries: {e}")
        
        return all_expenses
    
    async def _fetch_bills(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch QuickBooks bills (accounts payable)."""
        realm_id = self.config.get('realmId')
        access_token = self.config.get('accessToken')
        
        query = (
            f"select * from Bill where "
            f"TxnDate >= '{start_date.date()}' and "
            f"TxnDate <= '{end_date.date()}'"
        )
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f"Bearer {access_token}",
                    'Accept': 'application/json',
                }
                params = {'query': query}
                
                async with session.get(
                    f"https://quickbooks.api.intuit.com/v2/company/{realm_id}/query",
                    params=params,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        bills = data.get('QueryResponse', {}).get('Bill', [])
                        for bill in bills:
                            bill['entityType'] = 'Bill'
                        return bills
                    else:
                        self.logger.error(f"Failed to fetch bills: {resp.status}")
                        return []
        except Exception as e:
            self.logger.error(f"Error fetching QuickBooks bills: {e}")
            return []
        
        return []
    
    def transform_to_unified(
        self,
        raw_transaction: Dict[str, Any],
    ) -> Optional[UnifiedTransaction]:
        """Transform QuickBooks transaction to unified schema."""
        
        entity_type = raw_transaction.get('entityType')
        source_id = raw_transaction.get('Id')
        
        if not source_id:
            return None
        
        if entity_type == 'Invoice':
            return self._transform_invoice(raw_transaction, source_id)
        elif entity_type == 'Bill':
            return self._transform_bill(raw_transaction, source_id)
        elif entity_type in ['Check', 'JournalEntry']:
            return self._transform_expense(raw_transaction, source_id)
        
        return None
    
    def _transform_invoice(
        self,
        raw_txn: Dict[str, Any],
        source_id: str,
    ) -> Optional[UnifiedTransaction]:
        """Transform QBO invoice to unified schema."""
        
        # Status mapping
        docstatus = raw_txn.get('DocStatus', 'Draft')
        status = TransactionStatus.COMPLETED if docstatus == 'Submitted' else TransactionStatus.PENDING
        
        # Amount
        total_amount = Decimal(raw_txn.get('TotalAmt', 0))
        
        # Date
        txn_date_str = raw_txn.get('TxnDate')
        transaction_date = datetime.fromisoformat(txn_date_str) if txn_date_str else datetime.utcnow()
        
        # Customer
        customer_ref = raw_txn.get('CustomerRef', {})
        customer_id = customer_ref.get('value')
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=source_id,
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=total_amount,
            gross_amount=total_amount,
            currency='USD',  # QBO defaults to USD, might need to check
            status=status,
            category=TransactionCategory.REVENUE,
            description=raw_txn.get('DocNumber', ''),
            counterparty_id=customer_id,
            counterparty_name=None,
            metadata={
                'invoice_id': source_id,
                'customer_id': customer_id,
                'due_date': raw_txn.get('DueDate'),
                'terms': raw_txn.get('Terms'),
            },
            raw_payload=raw_txn,
        )
    
    def _transform_bill(
        self,
        raw_txn: Dict[str, Any],
        source_id: str,
    ) -> Optional[UnifiedTransaction]:
        """Transform QBO bill to unified schema."""
        
        docstatus = raw_txn.get('DocStatus', 'Draft')
        status = TransactionStatus.COMPLETED if docstatus == 'Submitted' else TransactionStatus.PENDING
        
        total_amount = Decimal(raw_txn.get('TotalAmt', 0))
        
        txn_date_str = raw_txn.get('TxnDate')
        transaction_date = datetime.fromisoformat(txn_date_str) if txn_date_str else datetime.utcnow()
        
        vendor_ref = raw_txn.get('VendorRef', {})
        vendor_id = vendor_ref.get('value')
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=source_id,
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=total_amount,
            gross_amount=total_amount,
            currency='USD',
            status=status,
            category=TransactionCategory.EXPENSE,
            description=raw_txn.get('DocNumber', ''),
            counterparty_id=vendor_id,
            counterparty_name=None,
            metadata={
                'bill_id': source_id,
                'vendor_id': vendor_id,
                'due_date': raw_txn.get('DueDate'),
            },
            raw_payload=raw_txn,
        )
    
    def _transform_expense(
        self,
        raw_txn: Dict[str, Any],
        source_id: str,
    ) -> Optional[UnifiedTransaction]:
        """Transform QBO check or journal entry to unified schema."""
        
        txn_type = raw_txn.get('entityType', 'Expense')
        total_amount = Decimal(raw_txn.get('TotalAmt', 0))
        
        txn_date_str = raw_txn.get('TxnDate')
        transaction_date = datetime.fromisoformat(txn_date_str) if txn_date_str else datetime.utcnow()
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=source_id,
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=total_amount,
            gross_amount=total_amount,
            currency='USD',
            status=TransactionStatus.COMPLETED,
            category=TransactionCategory.EXPENSE,
            description=f"{txn_type}: {raw_txn.get('DocNumber', '')}",
            counterparty_id=raw_txn.get('EntityRef', {}).get('value'),
            counterparty_name=None,
            metadata={
                'expense_id': source_id,
                'type': txn_type,
            },
            raw_payload=raw_txn,
        )
