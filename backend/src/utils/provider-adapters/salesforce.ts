import { ProviderAdapter, ProviderTokens } from './base';

/**
 * Salesforce OAuth Adapter
 */
export class SalesforceAdapter implements ProviderAdapter {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string
  ) {}

  /**
   * Get Salesforce OAuth authorization URL
   */
  async getAuthUrl(orgId: string, state: string, redirectUri: string): Promise<string> {
    const authEndpoint = 'https://login.salesforce.com/services/oauth2/authorize';
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
      scope: 'api refresh_token offline_access',
    });

    return `${authEndpoint}?${params.toString()}`;
  }

  /**
   * Exchange OAuth code for access token
   */
  async exchangeCode(code: string, redirectUri: string): Promise<ProviderTokens> {
    try {
      const tokenEndpoint = 'https://login.salesforce.com/services/oauth2/token';
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
      });

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Salesforce token exchange failed: ${error}`);
      }

      const data = await response.json() as any;
      const { access_token, refresh_token, instance_url } = data;

      if (!access_token) {
        throw new Error('No access token returned from Salesforce');
      }

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        // Salesforce adds instance_url to the response, we should save it
        scope: instance_url, // We can hijack scope or just handle it in the service
      };
    } catch (error: any) {
      throw new Error(`Salesforce OAuth failed: ${error.message}`);
    }
  }

  /**
   * Refresh Salesforce OAuth token
   */
  async refreshToken(refreshToken: string): Promise<ProviderTokens> {
    try {
      const tokenEndpoint = 'https://login.salesforce.com/services/oauth2/token';
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });

      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Salesforce token refresh failed: ${error}`);
      }

      const data = await response.json() as any;
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        tokenType: data.token_type,
      };
    } catch (error: any) {
      throw new Error(`Salesforce token refresh failed: ${error.message}`);
    }
  }

  /**
   * Validate credentials
   */
  async validateCredentials(credentials: any): Promise<{ success: boolean; error?: string }> {
    // For Salesforce, if we have an accessToken and instanceUrl, we can test it
    if (!credentials.accessToken || !credentials.instanceUrl) {
      return { success: false, error: 'Salesforce access token and instance URL are required' };
    }

    try {
      const response = await fetch(`${credentials.instanceUrl}/services/data/v59.0/query?q=SELECT+Id+FROM+Organization+LIMIT+1`, {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        return { success: true };
      }
      return { success: false, error: `Salesforce validation failed: HTTP ${response.status}` };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
