import { ProviderAdapter, ProviderTokens } from './base';

/**
 * Plaid OAuth Adapter
 * 
 * Plaid uses OAuth with Link flow:
 * 1. User authenticates with their bank through Plaid Link widget (handled by frontend)
 * 2. Frontend receives public Token from Link
 * 3. Backend exchanges public Token for Access Token using client credentials
 */
export class PlaidAdapter implements ProviderAdapter {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string
  ) {}

  /**
   * Plaid doesn't use traditional OAuth flow - uses Link widget
   * User gets public token from Link, then we exchange it server-to-server
   */
  async getAuthUrl(orgId: string, state: string, redirectUri: string): Promise<string> {
    // Return frontend URL that should load Plaid Link
    // Frontend will handle Link widget and send public token to backend
    return `${redirectUri}?type=plaid&orgId=${orgId}&state=${state}`;
  }

  /**
   * Exchange Plaid public token for access token
   * This is called server-to-server after user completes Link authentication
   */
  async exchangeCode(publicToken: string, redirectUri: string): Promise<ProviderTokens> {
    if (!publicToken) {
      throw new Error('Plaid public token is required');
    }

    try {
      const response = await fetch('https://sandbox.plaid.com/item/public_token/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          public_token: publicToken,
        }),
      });

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(`Plaid token exchange failed: ${error?.error_message || JSON.stringify(error)}`);
      }

      const data = await response.json() as any;
      const { access_token, item_id } = data;

      if (!access_token) {
        throw new Error('No access token returned from Plaid');
      }

      return {
        accessToken: access_token,
        // Plaid tokens don't have a fixed expiry - they're long-lived
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year estimate
      };
    } catch (error: any) {
      throw new Error(`Plaid integration failed: ${error.message}`);
    }
  }

  /**
   * Plaid access tokens are long-lived and don't need refresh
   */
  async refreshToken(token: string): Promise<any> {
    // Plaid tokens are indefinite and don't expire
    return {
      accessToken: token,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Validate Plaid access token by making a test API call
   */
  async validateApiKey(accessToken: string, itemId?: string): Promise<boolean> {
    if (!accessToken) {
      throw new Error('Plaid access token is required');
    }

    try {
      const response = await fetch('https://sandbox.plaid.com/accounts/get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          access_token: accessToken,
        }),
      });

      if (response.status === 401) {
        throw new Error('Plaid access token is invalid or expired');
      }

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(`Plaid validation failed: ${error?.error_message || JSON.stringify(error)}`);
      }

      return true;
    } catch (error: any) {
      if (error?.message?.includes('Plaid')) {
        throw error;
      }
      throw new Error(`Failed to validate Plaid token: ${error?.message}`);
    }
  }

  /**
   * Implementation of ProviderAdapter interface method for credential validation
   */
  async validateCredentials(credentials: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!credentials.accessToken || typeof credentials.accessToken !== 'string') {
        return { success: false, error: 'Plaid access token is required' };
      }

      await this.validateApiKey(credentials.accessToken.trim(), credentials.itemId);
      return { success: true };
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMsg };
    }
  }
}
