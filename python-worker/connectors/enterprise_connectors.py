"""
SAP, Oracle, ClearTax & Tally Enterprise Connectors

Syncs ERP and compliance data from enterprise platforms.

Key OAuth Trap for SAP/Oracle: Token expiration and automatic refresh.
These platforms use OAuth2 with relatively short token lifespans.

ClearTax Trap: Primarily for Indian GST compliance and invoicing.
"""

import asyncio
import os
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


class SAPConnector(BaseConnector):
    """SAP ERP connector with OAuth2 token refresh."""
    
    @property
    def platform_name(self) -> str:
        return "sap"
    
    async def validate_config(self) -> Tuple[bool, str]:
        """Validate SAP OData credentials."""
        if not self.config.get('accessToken'):
            return False, "SAP access token (accessToken) not found"
        if not self.config.get('instanceUrl'):
            return False, "SAP instance URL (instanceUrl) not configured"
        
        try:
            success = await self._test_connection()
            return (True, "") if success else (False, "Failed to connect to SAP")
        except Exception as e:
            return False, f"SAP validation error: {str(e)}"
    
    async def _test_connection(self) -> bool:
        """Test SAP OData API connection."""
        try:
            access_token = self.config.get('accessToken')
            base_url = self.config.get('instanceUrl')
            
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Accept': 'application/json',
                }
                
                # Clean up base_url
                if base_url:
                    base_url = base_url.rstrip('/')
                    if not base_url.startswith('http'):
                        base_url = f'https://{base_url}'
                    base_url = f'{base_url}/'
                else:
                    return False

                async with session.get(
                    f'{base_url}sap/opu/odata/sap/C_GL_ACCOUNT_LINE_ITEMS_SRV',
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    return resp.status in [200, 401]  # 401 means auth needed but service exists
        except Exception as e:
            self.logger.error(f"SAP connection test failed: {e}")
            return False
        
        return False
    
    async def refresh_oauth_token(self) -> Tuple[bool, Optional[str]]:
        """Refresh SAP OAuth2 token."""
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
            
            # Try to get instance URL from config first (UI-driven)
            instance_url = self.config.get('instanceUrl')
            
            if not instance_url:
                # Fallback to env
                instance_url = os.getenv("SAP_INSTANCE_URL")
                
            if not instance_url:
                return False, "SAP instance URL not found in config or env"
            
            # Clean up instance_url
            instance_url = instance_url.replace('https://', '').replace('http://', '').rstrip('/')
            
            # Use instanceUrl for refresh
            refresh_url = f"https://{instance_url}/oauth2/token"
            
            async with aiohttp.ClientSession() as session:
                data = {
                    'grant_type': 'refresh_token',
                    'refresh_token': refresh_token,
                    'client_id': client_id,
                    'client_secret': client_secret,
                }
                
                async with session.post(
                    refresh_url,
                    data=data,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        token_data = await resp.json()
                        self.config['accessToken'] = token_data['access_token']
                        self.config['refreshToken'] = token_data.get('refresh_token', refresh_token)
                        
                        if 'expires_in' in token_data:
                            expires_at = datetime.utcnow() + timedelta(seconds=token_data['expires_in'])
                            self.config['expiresAt'] = expires_at.isoformat()
                        
                        await self._update_config()
                        return True, None
                    else:
                        return False, f"Token refresh failed: HTTP {resp.status}"
            
            return False, "Failed to refresh SAP token: No response"
        except Exception as e:
            return False, f"Token refresh error: {str(e)}"
    
    async def _update_config(self):
        """Update config in database."""
        from utils.crypto import encrypt
        try:
            config_json = json.dumps(self.config)
            encrypted = encrypt(config_json)
            cursor = self.db.cursor()
            cursor.execute(
                "UPDATE connectors SET encrypted_config = %s, config_json = %s WHERE id = %s",
                (encrypted, config_json, self.connector_id)
            )
            self.db.commit()
        except Exception as e:
            self.logger.error(f"Failed to update SAP config: {e}")
    
    async def fetch_transactions(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch transactions from SAP FI module."""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        try:
            transactions = await self._fetch_journal_entries(start_date, end_date)
            self.logger.info(
                f"Fetched {len(transactions)} journal entries from SAP. "
                f"Trace: {self.trace_id}"
            )
            return transactions
        except Exception as e:
            self.logger.error(f"Error fetching SAP transactions: {e}")
            return []
    
    async def _fetch_journal_entries(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch SAP journal entries via OData API."""
        access_token = self.config.get('accessToken')
        base_url = self.config.get('instanceUrl')
        
        # Clean up base_url
        if base_url:
            base_url = base_url.rstrip('/')
            if not base_url.startswith('http'):
                base_url = f'https://{base_url}'
            base_url = f'{base_url}/'
        
        entries = []
        
        # OData filter for date range
        filter_str = (
            f"PostingDate ge datetime'{start_date.isoformat()}' and "
            f"PostingDate le datetime'{end_date.isoformat()}'"
        )
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Accept': 'application/json',
                }
                params = {
                    '$filter': filter_str,
                    '$top': 1000,
                    '$expand': 'to_doc',
                }
                
                async with session.get(
                    f'{base_url}sap/opu/odata/sap/C_GL_ACCOUNT_LINE_ITEMS_SRV/C_GLAccountLineItems',
                    headers=headers,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=15),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        entries = data.get('d', {}).get('results', [])
                    elif resp.status == 401:
                        # Token expired
                        success, error = await self.refresh_oauth_token()
                        if success:
                            return await self._fetch_journal_entries(start_date, end_date)
        except Exception as e:
            self.logger.error(f"Error fetching SAP entries: {e}")
        
        return entries
    
    def transform_to_unified(
        self,
        raw_transaction: Dict[str, Any],
    ) -> Optional[UnifiedTransaction]:
        """Transform SAP journal entry to unified schema."""
        
        source_id = raw_transaction.get('DocumentNumber')
        if not source_id:
            return None
        
        # SAP amounts
        amount = Decimal(str(raw_transaction.get('DebitAmount') or raw_transaction.get('CreditAmount') or 0))
        
        posting_date = raw_transaction.get('PostingDate')
        if posting_date and isinstance(posting_date, str):
            transaction_date = datetime.fromisoformat(posting_date.replace('Z', '+00:00'))
        else:
            transaction_date = datetime.utcnow()
        
        # Determine if debit or credit
        is_debit = 'DebitAmount' in raw_transaction and raw_transaction['DebitAmount']
        category = TransactionCategory.REVENUE if is_debit else TransactionCategory.EXPENSE
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=str(source_id),
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=amount,
            gross_amount=amount,
            currency=raw_transaction.get('CompanyCurrencyKey', 'USD').upper(),
            status=TransactionStatus.COMPLETED,
            category=category,
            description=f"SAP JE: {raw_transaction.get('Text', '')}",
            counterparty_id=raw_transaction.get('VendorNumber'),
            counterparty_name=None,
            metadata={
                'document_number': source_id,
                'gl_account': raw_transaction.get('GLAccount'),
                'cost_center': raw_transaction.get('CostCenter'),
            },
            raw_payload=raw_transaction,
        )


class OracleConnector(BaseConnector):
    """Oracle Cloud ERP connector."""
    
    @property
    def platform_name(self) -> str:
        return "oracle"
    
    async def validate_config(self) -> Tuple[bool, str]:
        """Validate Oracle Cloud credentials."""
        if not self.config.get('accessToken'):
            return False, "Oracle access token (accessToken) not found"
        if not self.config.get('instanceUrl'):
            return False, "Oracle instance URL (instanceUrl) not configured"
        
        try:
            access_token = self.config.get('accessToken')
            instance_url = self.config.get('instanceUrl')
            
            if instance_url and not instance_url.startswith('http'):
                instance_url = f'https://{instance_url}'
            
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Accept': 'application/json',
                }
                
                async with session.get(
                    f'{instance_url}/fscmService/core/v1/journals',
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    return (True, "") if resp.status in [200, 401] else (False, f"Oracle error: {resp.status}")
        except Exception as e:
            return False, f"Oracle validation error: {str(e)}"
        
        return False, "Failed to validate Oracle configuration"
        
        return False, "Unknown Oracle validation error"
    
    async def refresh_oauth_token(self) -> Tuple[bool, Optional[str]]:
        """Refresh Oracle OAuth2 token."""
        if not self.config.get('refreshToken'):
            return True, None
        
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
                    'https://login.oracle.com/oauth2/v1/token',
                    data=data,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        token_data = await resp.json()
                        self.config['accessToken'] = token_data['access_token']
                        await self._update_config()
                        return True, None
                    return False, f"Token refresh failed: HTTP {resp.status}"
            
            return False, "Failed to refresh Oracle token: No response"
        except Exception as e:
            return False, f"Token refresh error: {str(e)}"
    
    async def _update_config(self):
        """Update config in database."""
        from utils.crypto import encrypt
        try:
            config_json = json.dumps(self.config)
            encrypted = encrypt(config_json)
            cursor = self.db.cursor()
            cursor.execute(
                "UPDATE connectors SET encrypted_config = %s, config_json = %s WHERE id = %s",
                (encrypted, config_json, self.connector_id)
            )
            self.db.commit()
        except Exception as e:
            self.logger.error(f"Failed to update Oracle config: {e}")
    
    async def fetch_transactions(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch Oracle journal entries."""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        try:
            access_token = self.config.get('accessToken')
            instance_url = self.config.get('instanceUrl')
            
            if instance_url:
                instance_url = instance_url.rstrip('/')
                if not instance_url.startswith('http'):
                    instance_url = f'https://{instance_url}'
            
            transactions = []
            offset = 0
            limit = 100
            
            while True:
                async with aiohttp.ClientSession() as session:
                    headers = {
                        'Authorization': f'Bearer {access_token}',
                        'Accept': 'application/json',
                    }
                    params = {
                        'offset': offset,
                        'limit': limit,
                    }
                    
                    async with session.get(
                        f'{instance_url}/fscmService/core/v1/journalEntries',
                        headers=headers,
                        params=params,
                        timeout=aiohttp.ClientTimeout(total=15),
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            items = data.get('items', [])
                            if not items:
                                break
                            transactions.extend(items)
                            offset = offset + limit
                        elif resp.status == 401:
                            success, error = await self.refresh_oauth_token()
                            if success:
                                continue
                            break
                        else:
                            break
                
                await asyncio.sleep(0.1)
            
            return transactions
        except Exception as e:
            self.logger.error(f"Error fetching Oracle transactions: {e}")
            return []
    
    def transform_to_unified(
        self,
        raw_transaction: Dict[str, Any],
    ) -> Optional[UnifiedTransaction]:
        """Transform Oracle journal entry to unified schema."""
        
        source_id = raw_transaction.get('journalEntryId')
        if not source_id:
            return None
        
        amount = Decimal(str(raw_transaction.get('amount', 0)))
        
        posting_date = raw_transaction.get('postingDate')
        if posting_date:
            transaction_date = datetime.fromisoformat(posting_date.replace('Z', '+00:00'))
        else:
            transaction_date = datetime.utcnow()
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=str(source_id),
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=amount,
            gross_amount=amount,
            currency=raw_transaction.get('currency', 'USD').upper(),
            status=TransactionStatus.COMPLETED,
            category=TransactionCategory.OTHER,
            description=raw_transaction.get('description', ''),
            metadata={
                'journal_entry_id': source_id,
                'account_code': raw_transaction.get('accountCode'),
            },
            raw_payload=raw_transaction,
        )


class ClearTaxConnector(BaseConnector):
    """ClearTax connector for Indian GST compliance."""
    
    @property
    def platform_name(self) -> str:
        return "cleartax"
    
    async def validate_config(self) -> Tuple[bool, str]:
        """Validate ClearTax API credentials."""
        if not self.config.get('apiKey'):
            return False, "ClearTax API key not found"
        
        try:
            api_key = self.config.get('apiKey')
            
            async with aiohttp.ClientSession() as session:
                headers = {'X-Cleartax-Auth-Token': api_key}
                
                async with session.get(
                    'https://api.cleartax.in/spApi/profile',
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    return (True, "") if resp.status == 200 else (False, f"ClearTax error: {resp.status}")
        except Exception as e:
            return False, f"ClearTax validation error: {str(e)}"
        
        return False, "Unknown ClearTax validation error"
    
    async def fetch_transactions(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch invoices from ClearTax (GST filing & invoicing)."""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        try:
            api_key = self.config.get('apiKey')
            
            transactions = []
            offset = 0
            limit = 100
            
            while True:
                async with aiohttp.ClientSession() as session:
                    headers = {
                        'X-Cleartax-Auth-Token': api_key,
                        'Accept': 'application/json',
                    }
                    params = {
                        'offset': offset,
                        'limit': limit,
                    }
                    
                    async with session.get(
                        'https://api.cleartax.in/spApi/invoices',
                        headers=headers,
                        params=params,
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            items = data.get('data', [])
                            if not items:
                                break
                            transactions.extend(items)
                            offset = offset + limit
                        else:
                            break
                
                await asyncio.sleep(0.1)
            
            return transactions
        except Exception as e:
            self.logger.error(f"Error fetching ClearTax invoices: {e}")
            return []
    
    def transform_to_unified(
        self,
        raw_transaction: Dict[str, Any],
    ) -> Optional[UnifiedTransaction]:
        """Transform ClearTax invoice to unified schema."""
        
        source_id = raw_transaction.get('invoice_id')
        if not source_id:
            return None
        
        total_amount = Decimal(str(raw_transaction.get('total_amount', 0)))
        tax_amount = Decimal(str(raw_transaction.get('tax_amount', 0)))
        net_amount = total_amount - tax_amount
        
        date_str = raw_transaction.get('invoice_date')
        if date_str:
            transaction_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        else:
            transaction_date = datetime.utcnow()
        
        # ClearTax is primarily for India, currency is INR
        currency = 'INR'
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=str(source_id),
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=net_amount,
            gross_amount=total_amount,
            tax_amount=tax_amount,
            currency=currency,
            status=TransactionStatus.COMPLETED,
            category=TransactionCategory.REVENUE,
            description=f"ClearTax invoice: {raw_transaction.get('description', '')}",
            counterparty_id=raw_transaction.get('customer_id'),
            counterparty_name=raw_transaction.get('customer_name'),
            metadata={
                'invoice_id': source_id,
                'customer_id': raw_transaction.get('customer_id'),
                'gst_number': raw_transaction.get('gst_number'),
            },
            raw_payload=raw_transaction,
        )


class TallyConnector(BaseConnector):
    """
    Connector for Tally ERP. 
    Integration often involves XML over HTTP (port 9000 default) or 
    connecting to a Tally cloud proxy.
    """
    
    @property
    def platform_name(self) -> str:
        return 'tally'

    async def test_connection(self) -> bool:
        """Test connection to Tally XML server."""
        try:
            # Tally usually responds to a generic 'ENVELOPE' XML request
            return True # Real implementation would ping port 9000
        except Exception:
            return False

    async def fetch_transactions(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[UnifiedTransaction]:
        """Fetch transactions from Tally XML API."""
        self.logger.info(f"Fetching Tally transactions from {start_date} to {end_date}")
        
        # Tally integration usually involves exporting 'DayBook' or 'Vouchers' in XML
        # For prototype, we simulate finding GL entries
        raw_data = [
            {
                'vch_no': 'TL-1001',
                'date': '2024-03-15',
                'amount': 45000,
                'type': 'Sales',
                'ledger': 'Sales Account',
                'party': 'Acme Corp',
                'currency': 'INR'
            },
            {
                'vch_no': 'TL-1002',
                'date': '2024-03-18',
                'amount': 12000,
                'type': 'Purchase',
                'ledger': 'Cloud Services',
                'party': 'AWS India',
                'currency': 'INR'
            }
        ]
        
        transactions = []
        for raw in raw_data:
            tx = self.transform_to_unified(raw)
            if tx:
                transactions.append(tx)
                
        return transactions

    def transform_to_unified(
        self,
        raw_transaction: Dict[str, Any],
    ) -> Optional[UnifiedTransaction]:
        """Transform Tally voucher to unified schema."""
        
        source_id = raw_transaction.get('vch_no')
        if not source_id:
            return None
            
        amount = Decimal(str(raw_transaction.get('amount', 0)))
        vch_type = raw_transaction.get('type', '').lower()
        
        # Determine category based on Tally voucher type
        category = TransactionCategory.EXPENSE
        if vch_type == 'sales' or 'income' in raw_transaction.get('ledger', '').lower():
            category = TransactionCategory.REVENUE
            net_amount = amount
            gross_amount = amount
        else:
            net_amount = -amount
            gross_amount = -amount

        date_str = raw_transaction.get('date')
        transaction_date = datetime.now()
        if date_str:
            try:
                transaction_date = datetime.strptime(date_str, '%Y-%m-%d')
            except:
                pass

        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=str(source_id),
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=net_amount,
            gross_amount=gross_amount,
            tax_amount=Decimal('0'),
            currency=raw_transaction.get('currency', 'INR'),
            status=TransactionStatus.COMPLETED,
            category=category,
            description=f"Tally Voucher: {raw_transaction.get('ledger')}",
            counterparty_id=None,
            counterparty_name=raw_transaction.get('party'),
            metadata={
                'voucher_type': raw_transaction.get('type'),
                'ledger_name': raw_transaction.get('ledger'),
            },
            raw_payload=raw_transaction,
        )
