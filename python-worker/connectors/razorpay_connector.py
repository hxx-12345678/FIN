"""
Razorpay Connector

Syncs payment data from Razorpay (Indian payment processor).

Key Trap: Razorpay deducts platform fees from settlements. Need to reconcile
the gross amount (original charge) from the fee to show true revenue.

API Reference: https://razorpay.com/docs/api
"""

import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
import aiohttp
import base64

from .base_connector import BaseConnector
from .unified_schema import (
    UnifiedTransaction,
    TransactionStatus,
    TransactionCategory,
)


class RazorpayConnector(BaseConnector):
    """Razorpay payment platform connector (India-focused)."""
    
    @property
    def platform_name(self) -> str:
        return "razorpay"
    
    async def validate_config(self) -> Tuple[bool, str]:
        """Validate Razorpay API credentials."""
        key_id = self.config.get('keyId')
        key_secret = self.config.get('keySecret')
        
        if not key_id or not key_secret:
            return False, "Razorpay keyId and keySecret not configured"
        
        try:
            # Test API credentials
            auth_string = f"{key_id}:{key_secret}"
            encoded = base64.b64encode(auth_string.encode()).decode()
            
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f"Basic {encoded}",
                }
                async with session.get(
                    'https://api.razorpay.com/v1/account',
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    if resp.status == 200:
                        return True, ""
                    elif resp.status == 401:
                        return False, "Invalid Razorpay credentials (unauthorized)"
                    else:
                        return False, f"Razorpay API error: {resp.status}"
            
            return False, "Razorpay API error: Could not complete request"
        except asyncio.TimeoutError:
            return False, "Razorpay API timeout"
        except Exception as e:
            return False, f"Failed to validate Razorpay credentials: {str(e)}"
        
        return False, "Unknown Razorpay validation error"
    
    async def fetch_transactions(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch transactions from Razorpay.
        
        Fetches payments, invoices, and settlements to capture all financial activity.
        """
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        all_payments = await self._fetch_payments(start_date, end_date)
        all_settlements = await self._fetch_settlements(start_date, end_date)
        all_invoices = await self._fetch_invoices(start_date, end_date)
        
        transactions = all_payments + all_settlements + all_invoices
        
        self.logger.info(
            f"Fetched {len(all_payments)} payments, {len(all_settlements)} "
            f"settlements, {len(all_invoices)} invoices from Razorpay. "
            f"Trace: {self.trace_id}"
        )
        
        return transactions
    
    async def _fetch_payments(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch Razorpay payments."""
        payments = []
        has_more = True
        skip = 0
        
        key_id = self.config.get('keyId')
        key_secret = self.config.get('keySecret')
        auth_string = f"{key_id}:{key_secret}"
        encoded = base64.b64encode(auth_string.encode()).decode()
        
        while has_more:
            try:
                params = {
                    'count': 100,
                    'skip': skip,
                    'from': int(start_date.timestamp()),
                    'to': int(end_date.timestamp()),
                    'expand[]': 'card',
                }
                
                async with aiohttp.ClientSession() as session:
                    headers = {
                        'Authorization': f"Basic {encoded}",
                    }
                    async with session.get(
                        'https://api.razorpay.com/v1/payments',
                        params=params,
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            items = data.get('items', [])
                            payments.extend(items)
                            has_more = len(items) == 100
                            skip += 100
                        elif resp.status == 429:
                            await self.handle_rate_limiting(60)
                            continue
                        else:
                            self.logger.error(
                                f"Failed to fetch Razorpay payments: {resp.status}"
                            )
                            self.sync_result.add_error(
                                "fetch_payments_error",
                                f"HTTP {resp.status}"
                            )
                            break
                
                await asyncio.sleep(0.1)
                
            except Exception as e:
                self.logger.error(f"Error fetching Razorpay payments: {e}")
                self.sync_result.add_error("fetch_payments_error", str(e))
                break
        
        return payments
    
    async def _fetch_settlements(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch Razorpay settlements (payouts to bank)."""
        settlements = []
        has_more = True
        skip = 0
        
        key_id = self.config.get('keyId')
        key_secret = self.config.get('keySecret')
        auth_string = f"{key_id}:{key_secret}"
        encoded = base64.b64encode(auth_string.encode()).decode()
        
        while has_more:
            try:
                params = {
                    'count': 100,
                    'skip': skip,
                    'from': int(start_date.timestamp()),
                    'to': int(end_date.timestamp()),
                }
                
                async with aiohttp.ClientSession() as session:
                    headers = {
                        'Authorization': f"Basic {encoded}",
                    }
                    async with session.get(
                        'https://api.razorpay.com/v1/settlements',
                        params=params,
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            items = data.get('items', [])
                            settlements.extend(items)
                            has_more = len(items) == 100
                            skip += 100
                        elif resp.status == 429:
                            await self.handle_rate_limiting(60)
                            continue
                        else:
                            self.logger.error(
                                f"Failed to fetch Razorpay settlements: {resp.status}"
                            )
                            self.sync_result.add_error(
                                "fetch_settlements_error",
                                f"HTTP {resp.status}"
                            )
                            break
                
                await asyncio.sleep(0.1)
                
            except Exception as e:
                self.logger.error(f"Error fetching Razorpay settlements: {e}")
                self.sync_result.add_error("fetch_settlements_error", str(e))
                break
        
        return settlements
    
    async def _fetch_invoices(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch Razorpay invoices."""
        invoices = []
        has_more = True
        skip = 0
        
        key_id = self.config.get('keyId')
        key_secret = self.config.get('keySecret')
        auth_string = f"{key_id}:{key_secret}"
        encoded = base64.b64encode(auth_string.encode()).decode()
        
        while has_more:
            try:
                params = {
                    'count': 100,
                    'skip': skip,
                    'from': int(start_date.timestamp()),
                    'to': int(end_date.timestamp()),
                }
                
                async with aiohttp.ClientSession() as session:
                    headers = {
                        'Authorization': f"Basic {encoded}",
                    }
                    async with session.get(
                        'https://api.razorpay.com/v1/invoices',
                        params=params,
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            items = data.get('items', [])
                            invoices.extend(items)
                            has_more = len(items) == 100
                            skip += 100
                        elif resp.status == 429:
                            await self.handle_rate_limiting(60)
                            continue
                        else:
                            self.logger.error(
                                f"Failed to fetch Razorpay invoices: {resp.status}"
                            )
                            self.sync_result.add_error(
                                "fetch_invoices_error",
                                f"HTTP {resp.status}"
                            )
                            break
                
                await asyncio.sleep(0.1)
                
            except Exception as e:
                self.logger.error(f"Error fetching Razorpay invoices: {e}")
                self.sync_result.add_error("fetch_invoices_error", str(e))
                break
        
        return invoices
    
    def transform_to_unified(
        self,
        raw_transaction: Dict[str, Any],
    ) -> Optional[UnifiedTransaction]:
        """Transform Razorpay transaction to unified schema."""
        
        obj_type = raw_transaction.get('entity')
        source_id = raw_transaction.get('id')
        
        if not source_id:
            return None
        
        # Route based on entity type
        if obj_type == 'payment':
            return self._transform_payment(raw_transaction, source_id)
        elif obj_type == 'settlement':
            return self._transform_settlement(raw_transaction, source_id)
        elif obj_type == 'invoice':
            return self._transform_invoice(raw_transaction, source_id)
        
        return None
    
    def _transform_payment(
        self,
        raw_txn: Dict[str, Any],
        source_id: str,
    ) -> Optional[UnifiedTransaction]:
        """Transform Razorpay payment to unified schema."""
        
        # Amount is in smallest currency unit (paise for INR)
        gross_amount = Decimal(raw_txn.get('amount', 0)) / Decimal(100)
        
        # Extract fee
        fee = Decimal(raw_txn.get('fee', 0)) / Decimal(100)
        net_amount = gross_amount - fee
        
        # Status mapping
        status_map = {
            'captured': TransactionStatus.COMPLETED,
            'authorized': TransactionStatus.PENDING,
            'failed': TransactionStatus.FAILED,
            'refunded': TransactionStatus.REFUNDED,
        }
        status = status_map.get(
            str(raw_txn.get('status', 'captured')),
            TransactionStatus.COMPLETED
        )
        
        # Currency - Razorpay is primarily INR
        currency = raw_txn.get('currency', 'INR').upper()
        
        # Date
        created_ts = float(raw_txn.get('created_at') or 0)
        transaction_date = datetime.fromtimestamp(created_ts)
        
        # Customer/contact info
        customer_id = raw_txn.get('customer_id')
        contact_id = raw_txn.get('contact_id')
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=source_id,
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=net_amount,
            gross_amount=gross_amount,
            fees_amount=fee,
            tax_amount=None,
            currency=currency,
            status=status,
            category=TransactionCategory.REVENUE,
            description=f"Razorpay payment: {raw_txn.get('description', '')}",
            counterparty_id=customer_id or contact_id,
            counterparty_name=None,
            metadata={
                'payment_id': source_id,
                'customer_id': customer_id,
                'method': raw_txn.get('method'),
                'email': raw_txn.get('email'),
                'contact_id': contact_id,
            },
            raw_payload=raw_txn,
        )
    
    def _transform_settlement(
        self,
        raw_txn: Dict[str, Any],
        source_id: str,
    ) -> Optional[UnifiedTransaction]:
        """Transform Razorpay settlement (payout) to unified schema."""
        
        # Amount in paise
        net_amount = Decimal(raw_txn.get('amount', 0)) / Decimal(100)
        
        # Status
        status_map = {
            'processed': TransactionStatus.COMPLETED,
            'pending': TransactionStatus.PENDING,
            'failed': TransactionStatus.FAILED,
        }
        status = status_map.get(
            raw_txn.get('status', 'processed'),
            TransactionStatus.COMPLETED
        )
        
        currency = raw_txn.get('currency', 'INR').upper()
        created_ts = float(raw_txn.get('created_at') or 0)
        transaction_date = datetime.fromtimestamp(created_ts)
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=source_id,
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=net_amount,
            gross_amount=net_amount,
            fees_amount=Decimal(0),
            tax_amount=None,
            currency=currency,
            status=status,
            category=TransactionCategory.TRANSFER,
            description=f"Razorpay settlement: {raw_txn.get('description', '')}",
            counterparty_id=raw_txn.get('account_number'),
            counterparty_name=None,
            metadata={
                'settlement_id': source_id,
                'account_number': raw_txn.get('account_number'),
                'ifsc_code': raw_txn.get('ifsc_code'),
                'notes': raw_txn.get('notes'),
            },
            raw_payload=raw_txn,
        )
    
    def _transform_invoice(
        self,
        raw_txn: Dict[str, Any],
        source_id: str,
    ) -> Optional[UnifiedTransaction]:
        """Transform Razorpay invoice to unified schema."""
        
        # Amount in paise
        gross_amount = Decimal(raw_txn.get('amount', 0)) / Decimal(100)
        tax_amount = Decimal(raw_txn.get('tax_amount', 0)) / Decimal(100)
        net_amount = gross_amount - tax_amount
        
        # Status
        status_map = {
            'issued': TransactionStatus.PENDING,
            'partially_paid': TransactionStatus.PENDING,
            'paid': TransactionStatus.COMPLETED,
            'cancelled': TransactionStatus.CANCELLED,
            'expired': TransactionStatus.FAILED,
        }
        status = status_map.get(
            raw_txn.get('status', 'issued'),
            TransactionStatus.PENDING
        )
        
        currency = raw_txn.get('currency', 'INR').upper()
        issued_ts = float(raw_txn.get('issued_at') or raw_txn.get('created_at') or 0)
        transaction_date = datetime.fromtimestamp(issued_ts)
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=source_id,
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=net_amount,
            gross_amount=gross_amount,
            fees_amount=Decimal(0),
            tax_amount=tax_amount,
            currency=currency,
            status=status,
            category=TransactionCategory.REVENUE,
            description=f"Razorpay invoice: {raw_txn.get('description', '')}",
            counterparty_id=raw_txn.get('customer_details', {}).get('customer_id'),
            counterparty_name=raw_txn.get('customer_details', {}).get('name'),
            metadata={
                'invoice_id': source_id,
                'customer': raw_txn.get('customer_details'),
                'notes': raw_txn.get('notes'),
                'short_url': raw_txn.get('short_url'),
            },
            raw_payload=raw_txn,
        )
    
    def parse_fees(self, raw_transaction: Dict[str, Any]) -> Decimal:
        """Extract Razorpay fees from transaction."""
        fee_paise = raw_transaction.get('fee', 0)
        return Decimal(fee_paise) / Decimal(100)
