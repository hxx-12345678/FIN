import { ProviderAdapter, ProviderTokens } from './base';
import { MockProviderAdapter } from './mock';
import { config } from '../../config/env';

export type ConnectorType = 'quickbooks' | 'xero' | 'stripe' | 'plaid' | 'razorpay' | 'tally' | 'csv';

export const getProviderAdapter = (type: ConnectorType): ProviderAdapter => {
  const redirectUri = `${config.backendUrl}/api/v1/connectors/callback`;

  // For MVP, all providers use mock adapter
  // In production, implement real adapters:
  // - QuickBooksAdapter
  // - XeroAdapter
  // - StripeAdapter
  // - PlaidAdapter
  // - RazorpayAdapter
  // - TallyAdapter
  // CSV doesn't need OAuth, handled separately

  switch (type) {
    case 'quickbooks':
      return new MockProviderAdapter(
        config.oauth.quickbooks.clientId || 'mock_quickbooks_client_id',
        config.oauth.quickbooks.clientSecret || 'mock_quickbooks_secret',
        redirectUri
      );
    case 'xero':
      return new MockProviderAdapter(
        config.oauth.xero.clientId || 'mock_xero_client_id',
        config.oauth.xero.clientSecret || 'mock_xero_secret',
        redirectUri
      );
    case 'stripe':
    case 'plaid':
    case 'razorpay':
    case 'tally':
      return new MockProviderAdapter('mock_client_id', 'mock_secret', redirectUri);
    case 'csv':
      throw new Error('CSV connector does not use OAuth');
    default:
      throw new Error(`Unknown connector type: ${type}`);
  }
};

