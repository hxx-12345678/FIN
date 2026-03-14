"""
Plaid Connector

Connects to bank accounts via Plaid for cash flow tracking.

Key MFA Trap: Plaid requires handling MFA (Multi-Factor Authentication).
When Plaid returns MFA challenge, connector must handle re-authentication flow.
Also handles automatic token refresh for expired links.

API Reference: https://plaid.com/docs
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


class PlaidConnector(BaseConnector):
    """Plaid banking connector with MFA handling."""
    
    @property
    def platform_name(self) -> str:
        return "plaid"
    
    async def validate_config(self) -> Tuple[bool, str]:
        """Validate Plaid credentials."""
        if not self.config.get('accessToken'):
            return False, "Plaid access token not found"
        
        try:
            # Test connection
            client_id = self.config.get('clientId')
            secret = self.config.get('secret')
            access_token = self.config.get('accessToken')
            
            async with aiohttp.ClientSession() as session:
                headers = {'Content-Type': 'application/json'}
                data = {
                    'client_id': client_id,
                    'secret': secret,
                    'access_token': access_token,
                }
                
                async with session.post(
                    'https://production.plaid.com/accounts/get',
                    json=data,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    if resp.status == 200:
                        return True, ""
                    elif resp.status == 401 or resp.status == 403:
                        return False, "Plaid token invalid or expired"
                    else:
                        return False, f"Plaid API error: {resp.status}"
        except Exception as e:
            return False, f"Plaid validation error: {str(e)}"
    
    async def fetch_transactions(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch bank transactions from Plaid."""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        try:
            transactions = await self._fetch_bank_transactions(start_date, end_date)
            self.logger.info(
                f"Fetched {len(transactions)} transactions from Plaid. "
                f"Trace: {self.trace_id}"
            )
            return transactions
        except Exception as e:
            self.logger.error(f"Error fetching Plaid transactions: {e}")
            self.sync_result.add_error("fetch_error", str(e))
            return []
    
    async def _fetch_bank_transactions(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch transactions from all Plaid-connected accounts."""
        
        client_id = self.config.get('clientId')
        secret = self.config.get('secret')
        access_token = self.config.get('accessToken')
        
        transactions = []
        
        # First, get accounts to iterate
        try:
            async with aiohttp.ClientSession() as session:
                headers = {'Content-Type': 'application/json'}
                data = {
                    'client_id': client_id,
                    'secret': secret,
                    'access_token': access_token,
                }
                
                async with session.post(
                    'https://production.plaid.com/accounts/get',
                    json=data,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status != 200:
                        error_data = await resp.json()
                        error_code = error_data.get('error_code')
                        
                        # Handle MFA challenge
                        if error_code == 'ITEM_LOGIN_REQUIRED' or 'MFA' in error_code:
                            self.sync_result.add_warning(
                                f"Plaid MFA required for item. User must re-authenticate."
                            )
                            return []
                        
                        if resp.status == 401:
                            return []
                        
                        self.logger.error(f"Failed to fetch Plaid accounts: {resp.status}")
                        return []
                    
                    accounts_data = await resp.json()
                    accounts = accounts_data.get('accounts', [])
                    
                    # Fetch transactions for each account
                    for account in accounts:
                        account_id = account.get('account_id')
                        
                        txn_data = {
                            'client_id': client_id,
                            'secret': secret,
                            'access_token': access_token,
                            'start_date': start_date.date().isoformat(),
                            'end_date': end_date.date().isoformat(),
                            'account_ids': [account_id],
                        }
                        
                        async with session.post(
                            'https://production.plaid.com/transactions/get',
                            json=txn_data,
                            headers=headers,
                            timeout=aiohttp.ClientTimeout(total=15),
                        ) as txn_resp:
                            if txn_resp.status == 200:
                                txn_response = await txn_resp.json()
                                txns = txn_response.get('transactions', [])
                                
                                # Add account info to each transaction
                                for txn in txns:
                                    txn['account_info'] = account
                                
                                transactions.extend(txns)
                            else:
                                self.logger.warning(
                                    f"Failed to fetch transactions for account {account_id}: "
                                    f"{txn_resp.status}"
                                )
                    
                    await asyncio.sleep(0.1)
                    
        except Exception as e:
            self.logger.error(f"Error in Plaid transaction fetch: {e}")
        
        return transactions
    
    def transform_to_unified(
        self,
        raw_transaction: Dict[str, Any],
    ) -> Optional[UnifiedTransaction]:
        """Transform Plaid transaction to unified schema."""
        
        source_id = raw_transaction.get('transaction_id')
        if not source_id:
            return None
        
        # Amount (always present)
        amount = Decimal(str(raw_transaction.get('amount', 0)))
        
        # Status
        status_map = {
            'pending': TransactionStatus.PENDING,
            'posted': TransactionStatus.COMPLETED,
        }
        status = status_map.get(
            raw_transaction.get('pending', True) and 'pending' or 'posted',
            TransactionStatus.COMPLETED
        )
        
        # Category
        category_mapping = {
            'FOOD_AND_DRINK': TransactionCategory.EXPENSE,
            'TRANSFER': TransactionCategory.TRANSFER,
            'PAYMENT': TransactionCategory.PAYMENT_PROCESSING,
            'INCOME': TransactionCategory.REVENUE,
            'SALARY': TransactionCategory.PAYROLL,
            'TAX': TransactionCategory.TAX,
        }
        
        plaid_category = raw_transaction.get('personal_finance_category', {}).get('primary', 'OTHER')
        category = category_mapping.get(plaid_category, TransactionCategory.OTHER)
        
        # Date
        date_str = raw_transaction.get('date')
        transaction_date = datetime.fromisoformat(date_str) if date_str else datetime.utcnow()
        
        # Currency
        currency = raw_transaction.get('iso_currency_code', 'USD').upper()
        
        # Account info
        account_info = raw_transaction.get('account_info', {})
        account_name = account_info.get('name')
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=source_id,
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=amount,
            gross_amount=amount,
            currency=currency,
            status=status,
            category=category,
            description=raw_transaction.get('name', raw_transaction.get('merchant_name', '')),
            counterparty_id=raw_transaction.get('merchant_name'),
            counterparty_name=raw_transaction.get('merchant_name'),
            metadata={
                'transaction_id': source_id,
                'account_name': account_name,
                'merchant_name': raw_transaction.get('merchant_name'),
                'plaid_category': plaid_category,
                'authorized_date': raw_transaction.get('authorized_date'),
            },
            raw_payload=raw_transaction,
        )
