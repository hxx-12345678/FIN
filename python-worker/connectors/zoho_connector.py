"""
Zoho Books Connector

Syncs accounting data from Zoho Books (popular in India and Southeast Asia).

API Reference: https://www.zoho.com/books/api/v3/
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


class ZohoBooksConnector(BaseConnector):
    """Zoho Books accounting connector."""
    
    @property
    def platform_name(self) -> str:
        return "zoho"
    
    async def validate_config(self) -> Tuple[bool, str]:
        """Validate Zoho Books credentials."""
        if not self.config.get('accessToken'):
            return False, "Zoho Books access token not found"
        if not self.config.get('organizationId'):
            return False, "Zoho Books organization ID not found"
        
        try:
            success = await self._test_connection()
            return (True, "") if success else (False, "Failed to connect to Zoho Books")
        except Exception as e:
            return False, f"Zoho Books validation error: {str(e)}"
    
    async def _test_connection(self) -> bool:
        """Test Zoho Books API connection."""
        try:
            access_token = self.config.get('accessToken')
            org_id = self.config.get('organizationId')
            
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Zoho-oauthtoken {access_token}',
                    'Accept': 'application/json',
                }
                params = {'organization_id': org_id}
                
                async with session.get(
                    'https://books.zoho.com/api/v3/invoices',
                    headers=headers,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    return resp.status == 200
        except Exception as e:
            self.logger.error(f"Zoho Books connection test failed: {e}")
            return False
        
        return False
    
    async def refresh_oauth_token(self) -> Tuple[bool, Optional[str]]:
        """Refresh Zoho OAuth token."""
        if not self.config.get('refreshToken'):
            return True, None
        
        expires_at = self.config.get('expiresAt')
        if expires_at:
            try:
                exp_time = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
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
                    'client_id': client_id,
                    'client_secret': client_secret,
                }
                
                async with session.post(
                    'https://accounts.zoho.com/oauth/v2/token',
                    data=data,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        token_data = await resp.json()
                        self.config['accessToken'] = token_data['access_token']
                        await self._update_config()
                        return True, None
                    else:
                        return False, f"Token refresh failed: HTTP {resp.status}"
        except Exception as e:
            return False, f"Token refresh error: {str(e)}"
        
        return False, "Unknown token refresh error"
    
    async def _update_config(self):
        """Update config in database."""
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
            cursor.execute(query, (encrypted.encode(), json.dumps(self.config), self.connector_id))
            self.db.commit()
        except Exception as e:
            self.logger.error(f"Failed to update Zoho Books config: {e}")
    
    async def fetch_transactions(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch transactions from Zoho Books."""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        all_invoices = await self._fetch_invoices(start_date, end_date)
        all_bills = await self._fetch_bills(start_date, end_date)
        all_expenses = await self._fetch_expenses(start_date, end_date)
        
        transactions = all_invoices + all_bills + all_expenses
        
        self.logger.info(
            f"Fetched {len(all_invoices)} invoices, {len(all_bills)} bills, "
            f"{len(all_expenses)} expenses from Zoho Books. Trace: {self.trace_id}"
        )
        
        return transactions
    
    async def _fetch_invoices(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch Zoho Books invoices."""
        access_token = self.config.get('accessToken')
        org_id = self.config.get('organizationId')
        
        invoices = []
        page = 1
        
        while True:
            try:
                async with aiohttp.ClientSession() as session:
                    headers = {
                        'Authorization': f'Zoho-oauthtoken {access_token}',
                        'Accept': 'application/json',
                    }
                    params = {
                        'organization_id': org_id,
                        'page': page,
                        'per_page': 100,
                    }
                    
                    async with session.get(
                        'https://books.zoho.com/api/v3/invoices',
                        headers=headers,
                        params=params,
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            items = data.get('invoices', [])
                            if not items:
                                break
                            invoices.extend(items)
                            page += 1
                        else:
                            self.logger.error(f"Failed to fetch Zoho invoices: {resp.status}")
                            break
                
                await asyncio.sleep(0.1)
            except Exception as e:
                self.logger.error(f"Error fetching Zoho invoices: {e}")
                break
        
        return invoices
    
    async def _fetch_bills(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch Zoho Books bills."""
        access_token = self.config.get('accessToken')
        org_id = self.config.get('organizationId')
        
        bills = []
        page = 1
        
        while True:
            try:
                async with aiohttp.ClientSession() as session:
                    headers = {
                        'Authorization': f'Zoho-oauthtoken {access_token}',
                        'Accept': 'application/json',
                    }
                    params = {
                        'organization_id': org_id,
                        'page': page,
                        'per_page': 100,
                    }
                    
                    async with session.get(
                        'https://books.zoho.com/api/v3/bills',
                        headers=headers,
                        params=params,
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            items = data.get('bills', [])
                            if not items:
                                break
                            bills.extend(items)
                            page += 1
                        else:
                            self.logger.error(f"Failed to fetch Zoho bills: {resp.status}")
                            break
                
                await asyncio.sleep(0.1)
            except Exception as e:
                self.logger.error(f"Error fetching Zoho bills: {e}")
                break
        
        return bills
    
    async def _fetch_expenses(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch Zoho Books expense transactions."""
        access_token = self.config.get('accessToken')
        org_id = self.config.get('organizationId')
        
        expenses = []
        page = 1
        
        while True:
            try:
                async with aiohttp.ClientSession() as session:
                    headers = {
                        'Authorization': f'Zoho-oauthtoken {access_token}',
                        'Accept': 'application/json',
                    }
                    params = {
                        'organization_id': org_id,
                        'page': page,
                        'per_page': 100,
                    }
                    
                    async with session.get(
                        'https://books.zoho.com/api/v3/expenses',
                        headers=headers,
                        params=params,
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            items = data.get('expenses', [])
                            if not items:
                                break
                            expenses.extend(items)
                            page += 1
                        else:
                            self.logger.error(f"Failed to fetch Zoho expenses: {resp.status}")
                            break
                
                await asyncio.sleep(0.1)
            except Exception as e:
                self.logger.error(f"Error fetching Zoho expenses: {e}")
                break
        
        return expenses
    
    def transform_to_unified(
        self,
        raw_transaction: Dict[str, Any],
    ) -> Optional[UnifiedTransaction]:
        """Transform Zoho Books transaction to unified schema."""
        
        # Determine type from object structure
        if 'invoice_number' in raw_transaction:
            return self._transform_invoice(raw_transaction)
        elif 'bill_number' in raw_transaction:
            return self._transform_bill(raw_transaction)
        elif 'reference_number' in raw_transaction:
            return self._transform_expense(raw_transaction)
        
        return None
    
    def _transform_invoice(self, raw_txn: Dict[str, Any]) -> Optional[UnifiedTransaction]:
        """Transform Zoho invoice."""
        source_id = raw_txn.get('invoice_id')
        if not source_id:
            return None
        
        status_map = {
            'draft': TransactionStatus.PENDING,
            'sent': TransactionStatus.PENDING,
            'viewed': TransactionStatus.PENDING,
            'paid': TransactionStatus.COMPLETED,
            'overdue': TransactionStatus.COMPLETED,
            'cancelled': TransactionStatus.CANCELLED,
        }
        status = status_map.get(raw_txn.get('status', 'draft').lower(), TransactionStatus.PENDING)
        
        total = Decimal(str(raw_txn.get('total', 0)))
        tax_total = Decimal(str(raw_txn.get('tax', 0)))
        net_amount = total - tax_total
        
        date_str = raw_txn.get('invoice_date')
        transaction_date = datetime.fromisoformat(date_str) if date_str else datetime.utcnow()
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=str(source_id),
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=net_amount,
            gross_amount=total,
            tax_amount=tax_total,
            currency=raw_txn.get('currency_code', 'INR').upper(),
            status=status,
            category=TransactionCategory.REVENUE,
            description=f"Invoice: {raw_txn.get('reference_number', '')}",
            counterparty_id=raw_txn.get('customer_id'),
            counterparty_name=raw_txn.get('customer_name'),
            metadata={
                'invoice_id': source_id,
                'customer_id': raw_txn.get('customer_id'),
            },
            raw_payload=raw_txn,
        )
    
    def _transform_bill(self, raw_txn: Dict[str, Any]) -> Optional[UnifiedTransaction]:
        """Transform Zoho bill."""
        source_id = raw_txn.get('bill_id')
        if not source_id:
            return None
        
        status_map = {
            'draft': TransactionStatus.PENDING,
            'sent': TransactionStatus.PENDING,
            'viewed': TransactionStatus.PENDING,
            'paid': TransactionStatus.COMPLETED,
            'overdue': TransactionStatus.COMPLETED,
            'cancelled': TransactionStatus.CANCELLED,
        }
        status = status_map.get(raw_txn.get('status', 'draft').lower(), TransactionStatus.PENDING)
        
        total = Decimal(str(raw_txn.get('total', 0)))
        tax_total = Decimal(str(raw_txn.get('tax', 0)))
        net_amount = total - tax_total
        
        date_str = raw_txn.get('bill_date')
        transaction_date = datetime.fromisoformat(date_str) if date_str else datetime.utcnow()
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=str(source_id),
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=net_amount,
            gross_amount=total,
            tax_amount=tax_total,
            currency=raw_txn.get('currency_code', 'INR').upper(),
            status=status,
            category=TransactionCategory.EXPENSE,
            description=f"Bill: {raw_txn.get('reference_number', '')}",
            counterparty_id=raw_txn.get('vendor_id'),
            counterparty_name=raw_txn.get('vendor_name'),
            metadata={
                'bill_id': source_id,
                'vendor_id': raw_txn.get('vendor_id'),
            },
            raw_payload=raw_txn,
        )
    
    def _transform_expense(self, raw_txn: Dict[str, Any]) -> Optional[UnifiedTransaction]:
        """Transform Zoho expense."""
        source_id = raw_txn.get('expense_id')
        if not source_id:
            return None
        
        amount = Decimal(str(raw_txn.get('total', 0)))
        date_str = raw_txn.get('expense_date')
        transaction_date = datetime.fromisoformat(date_str) if date_str else datetime.utcnow()
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=str(source_id),
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=amount,
            gross_amount=amount,
            currency=raw_txn.get('currency_code', 'INR').upper(),
            status=TransactionStatus.COMPLETED,
            category=TransactionCategory.EXPENSE,
            description=f"Expense: {raw_txn.get('account_name', '')}",
            counterparty_id=raw_txn.get('customer_id'),
            counterparty_name=None,
            metadata={'expense_id': source_id},
            raw_payload=raw_txn,
        )
