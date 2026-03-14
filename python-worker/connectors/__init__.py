"""
FinaPilot Financial Connectors Package

Unified connectors for 11 financial platforms with built-in:
- Deduplication & anti-duplication layer
- Atomic sync operations
- Audit logging with trace IDs
- Platform-specific trap handling
- OAuth2 token refresh
- Fee reconciliation
- Error handling & retry logic
"""

from .unified_schema import (
    UnifiedTransaction,
    TransactionStatus,
    TransactionCategory,
    DeduplicationResult,
    SyncResult,
)

from .base_connector import BaseConnector

# Individual Platform Connectors
from .stripe_connector import StripeConnector
from .razorpay_connector import RazorpayConnector
from .quickbooks_connector import QuickBooksConnector
from .xero_connector import XeroConnector
from .plaid_connector import PlaidConnector
from .zoho_connector import ZohoBooksConnector
from .slack_asana_connector import SlackConnector, AsanaConnector
from .enterprise_connectors import SAPConnector, OracleConnector, ClearTaxConnector
from .salesforce_connector import SalesforceConnector

__all__ = [
    # Schema
    'UnifiedTransaction',
    'TransactionStatus',
    'TransactionCategory',
    'DeduplicationResult',
    'SyncResult',
    # Base
    'BaseConnector',
    # Connectors
    'StripeConnector',
    'RazorpayConnector',
    'QuickBooksConnector',
    'XeroConnector',
    'PlaidConnector',
    'ZohoBooksConnector',
    'SlackConnector',
    'AsanaConnector',
    'SAPConnector',
    'OracleConnector',
    'ClearTaxConnector',
    'SalesforceConnector',
]

# Connector registry for dynamic instantiation
CONNECTOR_REGISTRY = {
    'stripe': StripeConnector,
    'razorpay': RazorpayConnector,
    'quickbooks': QuickBooksConnector,
    'xero': XeroConnector,
    'plaid': PlaidConnector,
    'zoho': ZohoBooksConnector,
    'slack': SlackConnector,
    'asana': AsanaConnector,
    'sap': SAPConnector,
    'oracle': OracleConnector,
    'cleartax': ClearTaxConnector,
    'salesforce': SalesforceConnector,
}


def get_connector_class(platform_name: str):
    """Get connector class by platform name."""
    connector_class = CONNECTOR_REGISTRY.get(platform_name.lower())
    if not connector_class:
        raise ValueError(
            f"Unknown connector platform: {platform_name}. "
            f"Available: {', '.join(CONNECTOR_REGISTRY.keys())}"
        )
    return connector_class
