import { ProviderAdapter, ProviderTokens } from './base';
import { MockProviderAdapter } from './mock';
import { QuickBooksAdapter } from './quickbooks';
import { XeroAdapter } from './xero';
import { ZohoAdapter } from './zoho';
import { TallyAdapter } from './tally';
import { StripeAdapter } from './stripe';
import { RazorpayAdapter } from './razorpay';
import { PlaidAdapter } from './plaid';
import { SAPAdapter } from './sap';
import { OracleAdapter } from './oracle';
import { ClearTaxAdapter } from './cleartax';
import { SlackAdapter } from './slack';
import { AsanaAdapter } from './asana';
import { SalesforceAdapter } from './salesforce';
import { config } from '../../config/env';

export type ConnectorType = 'quickbooks' | 'xero' | 'stripe' | 'plaid' | 'razorpay' | 'tally' | 'zoho' | 'csv' | 'sap' | 'oracle' | 'cleartax' | 'slack' | 'asana' | 'salesforce';

export const getProviderAdapter = (type: ConnectorType): ProviderAdapter => {
  const redirectUri = `${config.backendUrl}/api/v1/connectors/callback`;

  // Helper to detect placeholder credentials that shouldn't be used
  const isPlaceholder = (val: string) => !val || val === '' || val.startsWith('your-') || val.startsWith('your_') || val === 'placeholder' || val.length < 5;

  switch (type) {
    case 'quickbooks':
      if (!isPlaceholder(config.oauth.quickbooks.clientId) && !isPlaceholder(config.oauth.quickbooks.clientSecret)) {
        return new QuickBooksAdapter(
          config.oauth.quickbooks.clientId,
          config.oauth.quickbooks.clientSecret,
          redirectUri
        );
      }
      throw new Error('QuickBooks OAuth credentials not configured. Please set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET in .env');

    case 'xero':
      if (!isPlaceholder(config.oauth.xero.clientId) && !isPlaceholder(config.oauth.xero.clientSecret)) {
        return new XeroAdapter(
          config.oauth.xero.clientId,
          config.oauth.xero.clientSecret,
          redirectUri
        );
      }
      throw new Error('Xero OAuth credentials not configured. Please set XERO_CLIENT_ID and XERO_CLIENT_SECRET in .env');

    case 'zoho':
      if (!isPlaceholder(config.oauth.zoho.clientId) && !isPlaceholder(config.oauth.zoho.clientSecret)) {
        return new ZohoAdapter(
          config.oauth.zoho.clientId,
          config.oauth.zoho.clientSecret,
          redirectUri
        );
      }
      throw new Error('Zoho OAuth credentials not configured. Please set ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET in .env');

    case 'tally':
      return new TallyAdapter('', '', redirectUri);

    case 'stripe':
      return new StripeAdapter(redirectUri);

    case 'razorpay':
      return new RazorpayAdapter(redirectUri);

    case 'plaid':
      const plaidClientId = process.env.PLAID_CLIENT_ID || '';
      const plaidClientSecret = process.env.PLAID_CLIENT_SECRET || '';
      return new PlaidAdapter(plaidClientId, plaidClientSecret, redirectUri);

    case 'sap':
      const sapClientId = process.env.SAP_CLIENT_ID || '';
      const sapClientSecret = process.env.SAP_CLIENT_SECRET || '';
      const sapInstance = process.env.SAP_INSTANCE || '';
      return new SAPAdapter(sapClientId, sapClientSecret, redirectUri, sapInstance);

    case 'oracle':
      const oracleClientId = process.env.ORACLE_CLIENT_ID || '';
      const oracleClientSecret = process.env.ORACLE_CLIENT_SECRET || '';
      const oracleInstance = process.env.ORACLE_INSTANCE || '';
      return new OracleAdapter(oracleClientId, oracleClientSecret, redirectUri, oracleInstance);

    case 'cleartax':
      return new ClearTaxAdapter(redirectUri);

    case 'slack':
      if (!isPlaceholder(config.oauth.slack.clientId) && !isPlaceholder(config.oauth.slack.clientSecret)) {
        return new SlackAdapter(
          config.oauth.slack.clientId,
          config.oauth.slack.clientSecret,
          redirectUri
        );
      }
      throw new Error('Slack OAuth credentials not configured. Please set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in .env');

    case 'asana':
      if (!isPlaceholder(config.oauth.asana.clientId) && !isPlaceholder(config.oauth.asana.clientSecret)) {
        return new AsanaAdapter(
          config.oauth.asana.clientId,
          config.oauth.asana.clientSecret,
          redirectUri
        );
      }
      throw new Error('Asana OAuth credentials not configured. Please set ASANA_CLIENT_ID and ASANA_CLIENT_SECRET in .env');

    case 'salesforce':
      if (!isPlaceholder(config.oauth.salesforce.clientId) && !isPlaceholder(config.oauth.salesforce.clientSecret)) {
        return new SalesforceAdapter(
          config.oauth.salesforce.clientId,
          config.oauth.salesforce.clientSecret,
          redirectUri
        );
      }
      throw new Error('Salesforce OAuth credentials not configured. Please set SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET in .env');

    case 'csv':
      throw new Error('CSV connector does not use OAuth');

    default:
      throw new Error(`Unknown connector type: ${type}`);
  }
};

