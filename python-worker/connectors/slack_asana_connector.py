"""
Slack & Asana Connector

Syncs project/spending data from Slack and Asana for scenario planning.
These are primarily for expense categorization from project metadata.

Key Trap: Extract spending from project metadata and categorize for
scenario planning. Not pure financial data but used for cost allocation.
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


class SlackConnector(BaseConnector):
    """Slack connector for organizational spending categorization."""
    
    @property
    def platform_name(self) -> str:
        return "slack"
    
    async def validate_config(self) -> Tuple[bool, str]:
        """Validate Slack OAuth credentials."""
        if not self.config.get('accessToken'):
            return False, "Slack access token not found"
        
        try:
            access_token = self.config.get('accessToken')
            
            async with aiohttp.ClientSession() as session:
                headers = {'Authorization': f'Bearer {access_token}'}
                
                async with session.get(
                    'https://slack.com/api/auth.test',
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return (True, "") if data.get('ok') else (False, "Auth failed")
                    return False, f"Slack API error: {resp.status}"
        except Exception as e:
            return False, f"Slack validation error: {str(e)}"
    
    async def fetch_transactions(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch Slack workspace data for spending categorization.
        
        In Slack, "transactions" are derived from project metadata in custom fields.
        This is primarily for departmental cost allocation.
        """
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        
        # Fetch channel info with custom metadata
        channels = await self._fetch_channels()
        transactions = []
        
        # Convert channel metadata to transactions
        for channel in channels:
            if 'metadata' in channel and channel['metadata'].get('project_budget'):
                # Channel has project budget metadata
                transaction = {
                    'channel_id': channel['id'],
                    'channel_name': channel['name'],
                    'metadata': channel.get('metadata', {}),
                    'timestamp': datetime.utcnow().isoformat(),
                }
                transactions.append(transaction)
        
        self.logger.info(
            f"Fetched {len(channels)} Slack channels with {len(transactions)} "
            f"budget transactions. Trace: {self.trace_id}"
        )
        
        return transactions
    
    async def _fetch_channels(self) -> List[Dict[str, Any]]:
        """Fetch Slack channels with metadata."""
        access_token = self.config.get('accessToken')
        channels = []
        cursor = None
        
        while True:
            try:
                async with aiohttp.ClientSession() as session:
                    headers = {'Authorization': f'Bearer {access_token}'}
                    params = {
                        'exclude_archived': True,
                        'limit': 100,
                    }
                    if cursor:
                        params['cursor'] = cursor
                    
                    async with session.get(
                        'https://slack.com/api/conversations.list',
                        headers=headers,
                        params=params,
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            if data.get('ok'):
                                channels.extend(data.get('channels', []))
                                cursor = data.get('response_metadata', {}).get('next_cursor')
                                if not cursor:
                                    break
                            else:
                                break
                        else:
                            break
                
                await asyncio.sleep(0.1)
            except Exception as e:
                self.logger.error(f"Error fetching Slack channels: {e}")
                break
        
        return channels
    
    def transform_to_unified(
        self,
        raw_transaction: Dict[str, Any],
    ) -> Optional[UnifiedTransaction]:
        """Transform Slack channel budget metadata to transaction."""
        
        channel_id = raw_transaction.get('channel_id')
        metadata = raw_transaction.get('metadata', {})
        
        # Only transform if there's valid budget metadata
        project_budget = metadata.get('project_budget')
        if not project_budget:
            return None
        
        # Expected format: {allocated: 5000, currency: 'USD', department: 'Engineering'}
        allocated_amount = Decimal(str(project_budget.get('allocated', 0)))
        if allocated_amount <= 0:
            return None
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=channel_id,
            platform=self.platform_name,
            transaction_date=datetime.utcnow(),
            net_amount=allocated_amount,
            gross_amount=allocated_amount,
            currency=project_budget.get('currency', 'USD').upper(),
            status=TransactionStatus.COMPLETED,
            category=TransactionCategory.EXPENSE,
            description=f"Slack project budget: {raw_transaction.get('channel_name')}",
            metadata={
                'channel_id': channel_id,
                'channel_name': raw_transaction.get('channel_name'),
                'department': project_budget.get('department'),
                'project_name': project_budget.get('project_name'),
            },
            raw_payload=raw_transaction,
        )


class AsanaConnector(BaseConnector):
    """Asana connector for project task/spending categorization."""
    
    @property
    def platform_name(self) -> str:
        return "asana"
    
    async def validate_config(self) -> Tuple[bool, str]:
        """Validate Asana OAuth credentials."""
        if not self.config.get('accessToken'):
            return False, "Asana access token not found"
        
        try:
            access_token = self.config.get('accessToken')
            
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Accept': 'application/json',
                }
                
                async with session.get(
                    'https://app.asana.com/api/1.0/users/me',
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    return (True, "") if resp.status == 200 else (False, f"Asana error: {resp.status}")
        except Exception as e:
            return False, f"Asana validation error: {str(e)}"
    
    async def fetch_transactions(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch Asana projects for cost categorization."""
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        
        projects = await self._fetch_projects()
        transactions = []
        
        # Extract budget/cost from custom fields
        for project in projects:
            # Check for custom fields that might contain cost/budget info
            if 'custom_fields' in project:
                for cf in project.get('custom_fields', []):
                    if 'budget' in cf.get('name', '').lower() and cf.get('number_value'):
                        transaction = {
                            'project_id': project['gid'],
                            'project_name': project['name'],
                            'custom_field': cf,
                            'timestamp': datetime.utcnow().isoformat(),
                        }
                        transactions.append(transaction)
        
        self.logger.info(
            f"Fetched {len(projects)} Asana projects with {len(transactions)} "
            f"budget transactions. Trace: {self.trace_id}"
        )
        
        return transactions
    
    async def _fetch_projects(self) -> List[Dict[str, Any]]:
        """Fetch Asana projects."""
        access_token = self.config.get('accessToken')
        workspace_gid = self.config.get('workspaceGid')
        
        projects = []
        offset = None
        
        while True:
            try:
                async with aiohttp.ClientSession() as session:
                    headers = {
                        'Authorization': f'Bearer {access_token}',
                        'Accept': 'application/json',
                    }
                    params = {
                        'workspace': workspace_gid,
                        'limit': 100,
                        'opt_fields': 'id,name,custom_fields',
                    }
                    if offset:
                        params['offset'] = offset
                    
                    async with session.get(
                        'https://app.asana.com/api/1.0/projects',
                        headers=headers,
                        params=params,
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            items = data.get('data', [])
                            projects.extend(items)
                            
                            # Check for pagination
                            if 'next_page' in data:
                                offset = data['next_page'].get('offset')
                            else:
                                break
                        else:
                            break
                
                await asyncio.sleep(0.1)
            except Exception as e:
                self.logger.error(f"Error fetching Asana projects: {e}")
                break
        
        return projects
    
    def transform_to_unified(
        self,
        raw_transaction: Dict[str, Any],
    ) -> Optional[UnifiedTransaction]:
        """Transform Asana project budget to transaction."""
        
        project_id = raw_transaction.get('project_id')
        cf = raw_transaction.get('custom_field', {})
        
        budget_amount = Decimal(str(cf.get('number_value', 0)))
        if budget_amount <= 0:
            return None
        
        return UnifiedTransaction(
            internal_id=None,
            trace_id=self.trace_id,
            source_id=project_id,
            platform=self.platform_name,
            transaction_date=datetime.utcnow(),
            net_amount=budget_amount,
            gross_amount=budget_amount,
            currency='USD',  # Asana defaults to USD
            status=TransactionStatus.COMPLETED,
            category=TransactionCategory.EXPENSE,
            description=f"Asana project budget: {raw_transaction.get('project_name')}",
            metadata={
                'project_id': project_id,
                'project_name': raw_transaction.get('project_name'),
                'custom_field_name': cf.get('name'),
            },
            raw_payload=raw_transaction,
        )
