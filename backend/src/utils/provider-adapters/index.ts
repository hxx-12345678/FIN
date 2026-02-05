import { ProviderAdapter, ProviderTokens } from './base';
import { MockProviderAdapter } from './mock';
import { QuickBooksAdapter } from './quickbooks';
import { XeroAdapter } from './xero';
import { ZohoAdapter } from './zoho';
import { TallyAdapter } from './tally';
import { config } from '../../config/env';

export type ConnectorType = 'quickbooks' | 'xero' | 'stripe' | 'plaid' | 'razorpay' | 'tally' | 'zoho' | 'csv';

export const getProviderAdapter = (type: ConnectorType): ProviderAdapter => {
  const redirectUri = `${config.backendUrl}/api/v1/connectors/callback`;

  switch (type) {
    case 'quickbooks':
      // Use real adapter if credentials are provided
      if (config.oauth.quickbooks.clientId && config.oauth.quickbooks.clientSecret) {
        return new QuickBooksAdapter(
          config.oauth.quickbooks.clientId,
          config.oauth.quickbooks.clientSecret,
          redirectUri
        );
      }
      // Throw error if credentials are missing (don't use mock in production)
      throw new Error('QuickBooks OAuth credentials not configured. Please set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET in .env');
    
    case 'xero':
      if (config.oauth.xero.clientId && config.oauth.xero.clientSecret) {
        return new XeroAdapter(
          config.oauth.xero.clientId,
          config.oauth.xero.clientSecret,
          redirectUri
        );
      }
      throw new Error('Xero OAuth credentials not configured. Please set XERO_CLIENT_ID and XERO_CLIENT_SECRET in .env');
    
    case 'zoho':
      // Zoho uses same config structure as others
      const zohoClientId = process.env.ZOHO_CLIENT_ID || '';
      const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET || '';
      if (zohoClientId && zohoClientSecret) {
        return new ZohoAdapter(zohoClientId, zohoClientSecret, redirectUri);
      }
      throw new Error('Zoho OAuth credentials not configured. Please set ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET in .env');
    
    case 'tally':
      // Tally doesn't use OAuth, but we return adapter for consistency
      return new TallyAdapter('', '', redirectUri);
    
    case 'stripe':
      // Stripe uses API keys, not OAuth (handled separately)
      return new MockProviderAdapter('mock_stripe_client_id', 'mock_stripe_secret', redirectUri);
    
    case 'plaid':
    case 'razorpay':
      // These may use OAuth in future, for now use mock
      return new MockProviderAdapter('mock_client_id', 'mock_secret', redirectUri);
    
    case 'csv':
      throw new Error('CSV connector does not use OAuth');
    
    default:
      throw new Error(`Unknown connector type: ${type}`);
  }
};

