"""
Stripe Connector

Syncs payment data from Stripe, with proper fee reconciliation.

Key Payments Platform Trap: Stripe deducts fees from transfers, so we need to
reconcile the gross amount (charge amount) from the fee (application_fee_amount)
to show true revenue for financial modeling.

API Reference: https://stripe.com/docs/api
"""

import asyncio
import hashlib
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
import aiohttp

from .base_connector import BaseConnector
from .unified_schema import (
    UnifiedTransaction,
    TransactionStatus,
    TransactionCategory,
)


class StripeConnector(BaseConnector):
    """Stripe payment platform connector."""
    
    @property
    def platform_name(self) -> str:
        return "stripe"
    
    async def validate_config(self) -> Tuple[bool, str]:
        """Validate Stripe API key is present and valid."""
        if not self.config.get('apiKey'):
            return False, "Stripe API key not configured"
        
        try:
            # Test API key by making a simple request
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f"Bearer {self.config['apiKey']}",
                }
                async with session.get(
                    'https://api.stripe.com/v1/account',
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as resp:
                    if resp.status == 200:
                        return True, ""
                    elif resp.status == 401:
                        return False, "Invalid Stripe secret key (unauthorized)"
                    else:
                        return False, f"Stripe API error: {resp.status}"
        except asyncio.TimeoutError:
            return False, "Stripe API timeout"
        except Exception as e:
            return False, f"Failed to validate Stripe key: {str(e)}"
        
        return False, "Failed to connect to Stripe API"
        
        return False, "Unknown Stripe validation error"
    
    async def fetch_transactions(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch transactions from Stripe.
        
        Fetches both charges (revenues) and transfers (payouts).
        Stripe uses pagination with `starting_after` cursor.
        """
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        all_charges = await self._fetch_charges(start_date, end_date)
        all_transfers = await self._fetch_transfers(start_date, end_date)
        
        # Combine and return
        transactions = all_charges + all_transfers
        self.logger.info(
            f"Fetched {len(all_charges)} charges and {len(all_transfers)} "
            f"transfers from Stripe. Trace: {self.trace_id}"
        )
        
        return transactions
    
    async def _fetch_charges(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch Stripe charges (revenue transactions)."""
        charges: List[Dict[str, Any]] = []
        has_more = True
        starting_after = None
        
        while has_more:
            try:
                params: Dict[str, Any] = {
                    'limit': 100,
                    'created[gte]': int(start_date.timestamp()),
                    'created[lte]': int(end_date.timestamp()),
                    'expand': [
                        'data.application_fee',
                        'data.balance_transaction',
                    ]
                }
                
                if starting_after:
                    params['starting_after'] = starting_after
                
                async with aiohttp.ClientSession() as session:
                    headers = {
                        'Authorization': f"Bearer {self.config['apiKey']}",
                    }
                    async with session.get(
                        'https://api.stripe.com/v1/charges',
                        params=params,
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            charges.extend(data.get('data', []))
                            has_more = data.get('has_more', False)
                            
                            if has_more and charges:
                                starting_after = charges[-1]['id']
                        elif resp.status == 429:
                            # Rate limited
                            retry_after = int(resp.headers.get('Retry-After', 60))
                            await self.handle_rate_limiting(retry_after)
                            continue
                        else:
                            self.logger.error(
                                f"Failed to fetch Stripe charges: {resp.status}"
                            )
                            self.sync_result.add_error(
                                "fetch_charges_error",
                                f"HTTP {resp.status}"
                            )
                            break
                
                await asyncio.sleep(0.1)  # Rate limiting – Stripe allows ~100 req/s
                
            except Exception as e:
                self.logger.error(f"Error fetching Stripe charges: {e}")
                self.sync_result.add_error("fetch_charges_error", str(e))
                break
        
        return charges
    
    async def _fetch_transfers(
        self,
        start_date: datetime,
        end_date: datetime,
    ) -> List[Dict[str, Any]]:
        """Fetch Stripe transfers (payouts to bank accounts)."""
        transfers: List[Dict[str, Any]] = []
        has_more = True
        starting_after = None
        
        while has_more:
            try:
                params: Dict[str, Any] = {
                    'limit': 100,
                    'created[gte]': int(start_date.timestamp()),
                    'created[lte]': int(end_date.timestamp()),
                }
                
                if starting_after:
                    params['starting_after'] = starting_after
                
                async with aiohttp.ClientSession() as session:
                    headers = {
                        'Authorization': f"Bearer {self.config['apiKey']}",
                    }
                    async with session.get(
                        'https://api.stripe.com/v1/transfers',
                        params=params,
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            transfers.extend(data.get('data', []))
                            has_more = data.get('has_more', False)
                            
                            if has_more and transfers:
                                starting_after = transfers[-1]['id']
                        elif resp.status == 429:
                            retry_after = int(resp.headers.get('Retry-After', 60))
                            await self.handle_rate_limiting(retry_after)
                            continue
                        else:
                            self.logger.error(
                                f"Failed to fetch Stripe transfers: {resp.status}"
                            )
                            self.sync_result.add_error(
                                "fetch_transfers_error",
                                f"HTTP {resp.status}"
                            )
                            break
                
                await asyncio.sleep(0.1)
                
            except Exception as e:
                self.logger.error(f"Error fetching Stripe transfers: {e}")
                self.sync_result.add_error("fetch_transfers_error", str(e))
                break
        
        return transfers
    
    def transform_to_unified(
        self,
        raw_transaction: Dict[str, Any],
    ) -> Optional[UnifiedTransaction]:
        """Transform Stripe charge/transfer to unified schema."""
        
        # Determine transaction type (charge or transfer)
        is_charge = 'amount' in raw_transaction and 'currency' in raw_transaction
        is_transfer = raw_transaction.get('object') == 'transfer'
        
        if not (is_charge or is_transfer):
            return None
        
        # Extract common fields
        source_id = raw_transaction.get('id')
        if not source_id:
            return None
        
        # For charges: amount is in cents, convert to decimal
        # For transfers: also in cents
        amount_cents = raw_transaction.get('amount', 0)
        
        # Handle status
        status_map = {
            'succeeded': TransactionStatus.COMPLETED,
            'pending': TransactionStatus.PENDING,
            'failed': TransactionStatus.FAILED,
            'refunded': TransactionStatus.REFUNDED,
        }
        status = status_map.get(
            raw_transaction.get('status', 'succeeded'),
            TransactionStatus.COMPLETED
        )
        
        # Transaction date
        created_ts = float(raw_transaction.get('created', 0))
        transaction_date = datetime.fromtimestamp(created_ts)
        
        # Currency
        currency = raw_transaction.get('currency', 'USD').upper()
        
        # Parse fees and net amount
        if is_charge:
            return self._transform_charge(
                raw_transaction,
                source_id,
                amount_cents,
                status,
                transaction_date,
                currency
            )
        else:  # transfer
            return self._transform_transfer(
                raw_transaction,
                source_id,
                amount_cents,
                status,
                transaction_date,
                currency
            )
    
    def _transform_charge(
        self,
        raw_txn: Dict[str, Any],
        source_id: str,
        amount_cents: int,
        status: TransactionStatus,
        transaction_date: datetime,
        currency: str,
    ) -> Optional[UnifiedTransaction]:
        """Transform Stripe charge to unified schema."""
        
        # Stripe amounts are in cents
        gross_amount = Decimal(amount_cents) / Decimal(100)
        
        # Extract fees
        fees = Decimal(0)
        
        # Application fee (Stripe platform fee)
        app_fee = raw_txn.get('application_fee')
        if isinstance(app_fee, dict):
            fee_amount = app_fee.get('amount', 0)
            fees += Decimal(fee_amount) / Decimal(100)
        elif isinstance(app_fee, str):
            # If it's just an ID, we'd need another API call (skip for now)
            pass
        
        # Net amount = gross - fees
        net_amount = gross_amount - fees
        
        # Get customer info
        customer_id = raw_txn.get('customer')
        description = raw_txn.get('description', '')
        
        return UnifiedTransaction(
            internal_id=None,  # Generated later
            trace_id=self.trace_id,
            source_id=source_id,
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=net_amount,
            gross_amount=gross_amount,
            fees_amount=fees,
            tax_amount=None,  # Stripe doesn't track tax in charges directly
            currency=currency,
            status=status,
            category=TransactionCategory.REVENUE,
            description=f"Stripe charge: {description}" if description else "Stripe charge",
            counterparty_id=customer_id,
            counterparty_name=None,
            metadata={
                'charge_id': source_id,
                'customer_id': customer_id,
                'receipt_url': raw_txn.get('receipt_url'),
                'payment_method': raw_txn.get('payment_method'),
                'statement_descriptor': raw_txn.get('statement_descriptor'),
            },
            raw_payload=raw_txn,
        )
    
    def _transform_transfer(
        self,
        raw_txn: Dict[str, Any],
        source_id: str,
        amount_cents: int,
        status: TransactionStatus,
        transaction_date: datetime,
        currency: str,
    ) -> Optional[UnifiedTransaction]:
        """Transform Stripe transfer (payout) to unified schema."""
        
        # Stripe amounts are in cents
        net_amount = Decimal(amount_cents) / Decimal(100)
        
        # Transfers are payouts, no fees deducted here
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
            description=raw_txn.get('description', 'Stripe transfer/payout'),
            counterparty_id=raw_txn.get('destination'),
            counterparty_name=raw_txn.get('destination_payment', {}).get('bank_account', {}).get('bank_name'),
            metadata={
                'transfer_id': source_id,
                'destination': raw_txn.get('destination'),
                'reversal_reason': raw_txn.get('reversals', {}).get('data', [{}])[0].get('reason') if raw_txn.get('reversals') else None,
            },
            raw_payload=raw_txn,
        )
    
    def parse_fees(self, raw_transaction: Dict[str, Any]) -> Decimal:
        """Extract Stripe fees from transaction."""
        fee = Decimal(0)
        
        if 'application_fee' in raw_transaction:
            app_fee = raw_transaction['application_fee']
            if isinstance(app_fee, dict):
                fee_amount = app_fee.get('amount', 0)
                fee = Decimal(fee_amount) / Decimal(100)
        
        return fee
