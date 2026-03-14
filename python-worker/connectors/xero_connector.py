"""
Xero Connector

Syncs accounting data from Xero.

Key OAuth Trap: Xero requires tenant ID (organization ID) which must be
fetched from the connections API. Also requires OAuth2 token refresh mechanics.

API Reference: https://developer.xero.com/documentation/guides
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


class XeroConnector(BaseConnector):
    """Xero accounting platform connector."""
    
    @property
    def platform_name(self) -> str:
        return "xero"
    
    async def validate_config(self) -> Tuple[bool, str]:
        """Validate Xero OAuth credentials."""
        if not self.config.get('accessToken'):
            return False, "Xero access token not found"
        if not self.config.get('tenantId'):
            return False, "Xero tenant ID not found"
        
        try:
            # Test connection
            tenant_id = self.config.get('tenantId')
            access_token = self.config.get('accessToken')
            
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f"Bearer {access_token}",
                    'Accept': 'application/json',
                    'Xero-tenant-id': tenant_id,
                }
                async with session.get(
                    'https://api.xero.com/api.xro/2.0/Invoices?where=Status=="DRAFT"&page=1',
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    if resp.status == 200:
                        return True, ""
                    elif resp.status == 401:
                        return False, "Xero token expired or invalid"
                    else:
                        return False, f"Xero API error: {resp.status}"
        except Exception as e:
            return False, f"Xero validation error: {str(e)}"
        
        return False, "Failed to validate Xero configuration"
    
    async def refresh_oauth_token(self) -> Tuple[bool, Optional[str]]:
        """Refresh Xero OAuth2 token."""
        if not self.config.get('refreshToken'):
            return True, None
        
        # Check expiration
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
                    'https://identity.xero.com/connect/token',
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
            self.logger.error(f"Failed to update Xero config: {e}")
    
    async def fetch_transactions(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch transactions from Xero."""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        all_invoices = await self._fetch_invoices(start_date, end_date)
        all_bills = await self._fetch_bills(start_date, end_date)
        all_bank_txns = await self._fetch_bank_transactions(start_date, end_date)
        
        transactions = all_invoices + all_bills + all_bank_txns
        
        self.logger.info(
            f"Fetched {len(all_invoices)} invoices, {len(all_bills)} bills, "
            f"{len(all_bank_txns)} bank transactions from Xero. Trace: {self.trace_id}"
        )
        
        return transactions
    
    async def _fetch_invoices(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch Xero invoices."""
        tenant_id = self.config.get('tenantId')
        access_token = self.config.get('accessToken')
        
        # Xero uses Xero Query Language
        where = f'DateString>={{DateTime({start_date.isoformat()})}} AND DateString<{{DateTime({end_date.isoformat()})}}'
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f"Bearer {access_token}",
                    'Accept': 'application/json',
                    'Xero-tenant-id': tenant_id,
                }
                params = {'where': where}
                
                async with session.get(
                    'https://api.xero.com/api.xro/2.0/Invoices',
                    params=params,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data.get('Invoices', [])
                    elif resp.status == 401:
                        success, error = await self.refresh_oauth_token()
                        if success:
                            return await self._fetch_invoices(start_date, end_date)
                        return []
                    else:
                        self.logger.error(f"Failed to fetch Xero invoices: {resp.status}")
                        return []
        except Exception as e:
            self.logger.error(f"Error fetching Xero invoices: {e}")
            return []
        
        return []
    
    async def _fetch_bills(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch Xero bills (accounts payable)."""
        tenant_id = self.config.get('tenantId')
        access_token = self.config.get('accessToken')
        
        where = f'DateString>={{DateTime({start_date.isoformat()})}} AND DateString<{{DateTime({end_date.isoformat()})}}'
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f"Bearer {access_token}",
                    'Accept': 'application/json',
                    'Xero-tenant-id': tenant_id,
                }
                params = {'where': where}
                
                async with session.get(
                    'https://api.xero.com/api.xro/2.0/Bills',
                    params=params,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data.get('Invoices', [])
                    else:
                        self.logger.error(f"Failed to fetch Xero bills: {resp.status}")
                        return []
        except Exception as e:
            self.logger.error(f"Error fetching Xero bills: {e}")
            return []
        
        return []
    
    async def _fetch_bank_transactions(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch Xero bank transactions."""
        tenant_id = self.config.get('tenantId')
        access_token = self.config.get('accessToken')
        
        where = f'DateString>={{DateTime({start_date.isoformat()})}} AND DateString<{{DateTime({end_date.isoformat()})}}'
        
        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f"Bearer {access_token}",
                    'Accept': 'application/json',
                    'Xero-tenant-id': tenant_id,
                }
                params = {'where': where}
                
                async with session.get(
                    'https://api.xero.com/api.xro/2.0/BankTransactions',
                    params=params,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data.get('BankTransactions', [])
                    else:
                        self.logger.error(f"Failed to fetch Xero bank transactions: {resp.status}")
                        return []
        except Exception as e:
            self.logger.error(f"Error fetching Xero bank transactions: {e}")
            return []
        
        return []
    
    def transform_to_unified(
        self,
        raw_transaction: Dict[str, Any],
    ) -> Optional[UnifiedTransaction]:
        """Transform Xero transaction to unified schema."""
        
        # Xero doesn't have explicit entity type, infer from Type field
        txn_type = raw_transaction.get('Type')
        source_id = raw_transaction.get('InvoiceID')
        
        if not source_id:
            return None
        
        if txn_type in ['ACCRECPAYMENT', 'ACRECCREDIT']:
            return self._transform_invoice(raw_transaction, source_id)
        elif txn_type in ['ACCPAYPAYMENT', 'ACCPAYCREDIT']:
            return self._transform_bill(raw_transaction, source_id)
        else:
            return self._transform_generic(raw_transaction, source_id)
    
    def _transform_invoice(
        self,
        raw_txn: Dict[str, Any],
        source_id: str,
    ) -> Optional[UnifiedTransaction]:
        """Transform Xero invoice to unified schema."""
        
        status_map = {
            'DRAFT': TransactionStatus.PENDING,
            'SUBMITTED': TransactionStatus.COMPLETED,
            'AUTHORISED': TransactionStatus.COMPLETED,
            'PAID': TransactionStatus.COMPLETED,
            'VOIDED': TransactionStatus.CANCELLED,
        }
        status = status_map.get(str(raw_txn.get('Status', 'PENDING')), TransactionStatus.PENDING)
        
        total = Decimal(raw_txn.get('Total', 0))
        tax_total = Decimal(raw_txn.get('TaxTotal', 0))
        net_amount = total - tax_total
        
        date_str = raw_txn.get('DateString')
        transaction_date = datetime.fromisoformat(date_str) if date_str else datetime.utcnow()
        
        contact_id = raw_txn.get('ContactID')
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=source_id,
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=net_amount,
            gross_amount=total,
            tax_amount=tax_total,
            currency=raw_txn.get('CurrencyCode', 'USD'),
            status=status,
            category=TransactionCategory.REVENUE,
            description=raw_txn.get('InvoiceNumber', ''),
            counterparty_id=contact_id,
            counterparty_name=raw_txn.get('Contact', {}).get('Name'),
            metadata={
                'invoice_id': source_id,
                'contact_id': contact_id,
            },
            raw_payload=raw_txn,
        )
    
    def _transform_bill(
        self,
        raw_txn: Dict[str, Any],
        source_id: str,
    ) -> Optional[UnifiedTransaction]:
        """Transform Xero bill to unified schema."""
        
        status_map = {
            'DRAFT': TransactionStatus.PENDING,
            'SUBMITTED': TransactionStatus.COMPLETED,
            'AUTHORISED': TransactionStatus.COMPLETED,
            'PAID': TransactionStatus.COMPLETED,
            'VOIDED': TransactionStatus.CANCELLED,
        }
        status = status_map.get(str(raw_txn.get('Status', 'PENDING')), TransactionStatus.PENDING)
        
        total = Decimal(raw_txn.get('Total', 0))
        tax_total = Decimal(raw_txn.get('TaxTotal', 0))
        net_amount = total - tax_total
        
        date_str = raw_txn.get('DateString')
        transaction_date = datetime.fromisoformat(date_str) if date_str else datetime.utcnow()
        
        contact_id = raw_txn.get('ContactID')
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=source_id,
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=net_amount,
            gross_amount=total,
            tax_amount=tax_total,
            currency=raw_txn.get('CurrencyCode', 'USD'),
            status=status,
            category=TransactionCategory.EXPENSE,
            description=raw_txn.get('InvoiceNumber', ''),
            counterparty_id=contact_id,
            counterparty_name=raw_txn.get('Contact', {}).get('Name'),
            metadata={
                'bill_id': source_id,
                'contact_id': contact_id,
            },
            raw_payload=raw_txn,
        )
    
    def _transform_generic(
        self,
        raw_txn: Dict[str, Any],
        source_id: str,
    ) -> Optional[UnifiedTransaction]:
        """Generic transformation for bank transactions and other types."""
        
        total = Decimal(raw_txn.get('Total') or raw_txn.get('LineAmountTypes') or 0)
        date_str = raw_txn.get('DateString')
        transaction_date = datetime.fromisoformat(date_str) if date_str else datetime.utcnow()
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=source_id,
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=total,
            gross_amount=total,
            currency=raw_txn.get('CurrencyCode', 'USD'),
            status=TransactionStatus.COMPLETED,
            category=TransactionCategory.TRANSFER,
            description=raw_txn.get('Description', ''),
            metadata={'type': raw_txn.get('Type')},
            raw_payload=raw_txn,
        )
