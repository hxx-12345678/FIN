"""
Salesforce Connector

Syncs sales pipeline and closed-won opportunities from Salesforce.
Used for revenue forecasting and cash flow modeling.
"""

import asyncio
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import aiohttp
import json
from decimal import Decimal

from .base_connector import BaseConnector
from .unified_schema import (
    UnifiedTransaction,
    TransactionStatus,
    TransactionCategory,
)


class SalesforceConnector(BaseConnector):
    """Salesforce CRM connector for pipeline and revenue data."""

    @property
    def platform_name(self) -> str:
        return "salesforce"

    async def validate_config(self) -> Tuple[bool, str]:
        """Validate Salesforce configuration."""
        if not self.config.get('accessToken'):
            return False, "Salesforce access token not configured"
        
        instance_url = self.config.get('instanceUrl') or self.config.get('scope')
        if not instance_url:
             return False, "Salesforce instance URL not configured"
        
        try:
            success = await self._test_connection()
            return (True, "") if success else (False, "Failed to connect to Salesforce")
        except Exception as e:
            return False, f"Salesforce validation error: {str(e)}"
        
        return False, "Unknown Salesforce validation error"

    async def _test_connection(self) -> bool:
        """Test Salesforce REST API connection."""
        access_token = self.config.get('accessToken')
        instance_url = self.config.get('instanceUrl') or self.config.get('scope')
        
        if not instance_url:
            return False
            
        if not instance_url.startswith('http'):
            instance_url = f"https://{instance_url}"

        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Accept': 'application/json',
                }
                # Simple query to test connection
                query = "SELECT Id FROM Organization LIMIT 1"
                async with session.get(
                    f"{instance_url}/services/data/v59.0/query",
                    params={'q': query},
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as resp:
                    return resp.status == 200
        except Exception as e:
            self.logger.error(f"Salesforce connection test failed: {e}")
            return False
        
        return False

    async def refresh_oauth_token(self) -> Tuple[bool, Optional[str]]:
        """Refresh Salesforce OAuth2 token."""
        refresh_token = self.config.get('refreshToken')
        if not refresh_token:
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
            client_id = os.getenv("SALESFORCE_CLIENT_ID")
            client_secret = os.getenv("SALESFORCE_CLIENT_SECRET")
            
            if not client_id or not client_secret:
                return False, "Salesforce client credentials missing in environment"

            async with aiohttp.ClientSession() as session:
                data = {
                    'grant_type': 'refresh_token',
                    'refresh_token': refresh_token,
                    'client_id': client_id,
                    'client_secret': client_secret,
                }
                async with session.post(
                    'https://login.salesforce.com/services/oauth2/token',
                    data=data,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status == 200:
                        token_data = await resp.json()
                        self.config['accessToken'] = token_data['access_token']
                        if 'refresh_token' in token_data:
                            self.config['refreshToken'] = token_data['refresh_token']
                        
                        self.config['expiresAt'] = (datetime.utcnow() + timedelta(hours=2)).isoformat()
                        await self._update_config()
                        return True, None
                    else:
                        return False, f"Salesforce token refresh failed: HTTP {resp.status}"
            
            return False, "Salesforce token refresh failed: No response"
        except Exception as e:
            return False, f"Salesforce token refresh error: {str(e)}"

    async def fetch_transactions(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch Opportunities from Salesforce."""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=90)
        if not end_date:
            end_date = datetime.utcnow()

        access_token = self.config.get('accessToken')
        instance_url = self.config.get('instanceUrl') or self.config.get('scope')
        
        if not instance_url:
            return []
            
        if not instance_url.startswith('http'):
            instance_url = f"https://{instance_url}"

        query = (
            f"SELECT Id, Name, Amount, CloseDate, StageName, IsWon, IsClosed, CurrencyIsoCode, "
            f"Account.Name, Description, LastModifiedDate "
            f"FROM Opportunity "
            f"WHERE LastModifiedDate >= {start_date.strftime('%Y-%m-%dT%H:%M:%SZ')} "
            f"AND LastModifiedDate <= {end_date.strftime('%Y-%m-%dT%H:%M:%SZ')} "
            f"ORDER BY LastModifiedDate DESC"
        )

        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Accept': 'application/json',
                }
                async with session.get(
                    f"{instance_url}/services/data/v59.0/query",
                    params={'q': query},
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=20)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data.get('records', [])
                    elif resp.status == 401:
                        success, _ = await self.refresh_oauth_token()
                        if success:
                            return await self.fetch_transactions(start_date, end_date)
                        return []
                    else:
                        return []
            
            return []
        except Exception as e:
            self.logger.error(f"Error fetching Salesforce opportunities: {e}")
            return []

    def transform_to_unified(
        self,
        raw_transaction: Dict[str, Any],
    ) -> Optional[UnifiedTransaction]:
        """Transform Salesforce Opportunity to UnifiedTransaction."""
        
        source_id = raw_transaction.get('Id')
        if not source_id:
            return None

        amount = Decimal(str(raw_transaction.get('Amount') or 0))
        
        close_date_str = raw_transaction.get('CloseDate')
        if close_date_str:
            try:
                transaction_date = datetime.strptime(close_date_str, '%Y-%m-%d')
            except:
                transaction_date = datetime.utcnow()
        else:
            transaction_date = datetime.utcnow()

        is_won = raw_transaction.get('IsWon', False)
        is_closed = raw_transaction.get('IsClosed', False)
        
        status = TransactionStatus.COMPLETED if is_won else (
            TransactionStatus.CANCELLED if (is_closed and not is_won) else TransactionStatus.PENDING
        )
        
        category = TransactionCategory.REVENUE if is_won else TransactionCategory.OTHER

        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=str(source_id),
            platform=self.platform_name,
            transaction_date=transaction_date,
            net_amount=amount,
            gross_amount=amount,
            currency=raw_transaction.get('CurrencyIsoCode', 'USD').upper(),
            status=status,
            category=category,
            description=f"Salesforce Opportunity: {raw_transaction.get('Name')}",
            counterparty_name=raw_transaction.get('Account', {}).get('Name') if raw_transaction.get('Account') else None,
            metadata={
                'stage': raw_transaction.get('StageName'),
                'is_won': is_won,
                'is_closed': is_closed,
            }
        )

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
            self.logger.error(f"Failed to update Salesforce config: {e}")
