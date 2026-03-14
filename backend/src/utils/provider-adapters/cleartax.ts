import { ProviderAdapter, ProviderTokens } from './base';

/**
 * ClearTax API Adapter
 * 
 * ClearTax (India GST compliance platform) uses API token authentication.
 * No OAuth - just Bearer token in headers.
 */
export class ClearTaxAdapter implements ProviderAdapter {
  constructor(private redirectUri: string) {}

  /**
   * ClearTax doesn't use OAuth
   */
  async getAuthUrl(orgId: string, state: string, redirectUri: string): Promise<string> {
    throw new Error('ClearTax uses API token authentication, not OAuth. Use the connectClearTax endpoint instead.');
  }

  /**
   * Not used for ClearTax
   */
  async exchangeCode(code: string, redirectUri: string): Promise<ProviderTokens> {
    throw new Error('ClearTax does not use OAuth code exchange');
  }

  /**
   * ClearTax tokens don't refresh - API tokens are static
   */
  async refreshToken(token: string): Promise<any> {
    throw new Error('ClearTax API tokens do not refresh. Use connectClearTax endpoint to update.');
  }

  /**
   * Validate ClearTax API token
   * @param authToken - ClearTax API token from dashboard
   * @param userId - ClearTax user ID for API access
   * @returns true if token is valid, throws error otherwise
   */
  async validateApiKey(authToken: string, userId?: string): Promise<boolean> {
    if (!authToken) {
      throw new Error('ClearTax API token is required');
    }

    try {
      const headers: any = {
        'X-Cleartax-Auth-Token': authToken,
        'Content-Type': 'application/json',
      };

      if (userId) {
        headers['X-Cleartax-User-Id'] = userId;
      }

      // Make test API call to validate token
      const response = await fetch(
        'https://api.cleartax.in/v2/invoices?pageIndex=0&pageSize=1',
        {
          method: 'GET',
          headers,
        }
      );

      if (response.status === 401) {
        throw new Error('ClearTax API token is invalid or expired');
      }

      if (response.status === 403) {
        throw new Error('ClearTax API token lacks required permissions');
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ClearTax API error: ${error}`);
      }

      return true;
    } catch (error: any) {
      if (error.message.includes('ClearTax')) {
        throw error;
      }
      throw new Error(`Failed to validate ClearTax token: ${error.message}`);
    }
  }

  /**
   * Implementation of ProviderAdapter interface method for credential validation
   */
  async validateCredentials(credentials: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!credentials.authToken || typeof credentials.authToken !== 'string') {
        return { success: false, error: 'ClearTax API token is required' };
      }

      await this.validateApiKey(credentials.authToken.trim(), credentials.userId);
      return { success: true };
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMsg };
    }
  }
}
