import { ProviderAdapter, ProviderTokens } from './base';

/**
 * Oracle Cloud Financials OAuth Adapter
 * 
 * Oracle uses OAuth2 for cloud ERP applications.
 * Requires client credentials for token exchange.
 */
export class OracleAdapter implements ProviderAdapter {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string,
    private instance?: string // Oracle instance URL 
  ) {}

  /**
   * Get Oracle OAuth authorization URL
   */
  async getAuthUrl(orgId: string, state: string, redirectUri: string): Promise<string> {
    if (!this.instance) {
      throw new Error('Oracle instance URL is required for OAuth');
    }

    const scope = 'https://api.cloud.oracle.com/fscm/';
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
      scope,
    });

    return `https://login.oracle.com/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange OAuth code for access token
   */
  async exchangeCode(code: string, redirectUri: string): Promise<ProviderTokens> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
      });

      const response = await fetch('https://login.oracle.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Oracle token exchange failed: ${error}`);
      }

      const data = await response.json() as any;
      const { access_token, expires_in } = data;

      if (!access_token) {
        throw new Error('No access token returned from Oracle');
      }

      return {
        accessToken: access_token,
        expiresAt: new Date(Date.now() + (expires_in || 3600) * 1000),
      };
    } catch (error: any) {
      throw new Error(`Oracle OAuth failed: ${error.message}`);
    }
  }

  /**
   * Refresh Oracle OAuth token
   */
  async refreshToken(refreshToken: string): Promise<ProviderTokens> {
    if (!refreshToken) {
      throw new Error('Oracle refresh token required');
    }

    try {
      const tokenEndpoint = 'https://login.oracle.com/oauth2/token';
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
        throw new Error(`Oracle token refresh failed: HTTP ${response.status} - ${error}`);
      }

      const data = (await response.json()) as Record<string, any>;

      if (!data.access_token) {
        throw new Error('No access token in Oracle refresh response');
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
        tokenType: data.token_type || 'Bearer',
        scope: data.scope,
      };
    } catch (error: any) {
      throw new Error(`Oracle OAuth token refresh failed: ${error.message}`);
    }
  }

  /**
   * Validate Oracle access token
   */
  async validateApiKey(accessToken: string, instance?: string): Promise<boolean> {
    if (!accessToken) {
      throw new Error('Oracle access token is required');
    }

    const instanceUrl = instance || this.instance;
    if (!instanceUrl) {
      throw new Error('Oracle instance URL is required');
    }

    try {
      // Clean up instance URL if it has protocol
      const baseUrl = instanceUrl.replace(/^https?:\/\//, '');

      const response = await fetch(
        `https://${baseUrl}/fscmService/core/v1/journalEntries?pageSize=1`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (response.status === 401) {
        throw new Error('Oracle access token is invalid or expired');
      }

      if (!response.ok) {
        throw new Error(`Oracle API validation failed with status ${response.status}`);
      }

      return true;
    } catch (error: any) {
      if (error.message.includes('Oracle')) {
        throw error;
      }
      throw new Error(`Failed to validate Oracle token: ${error.message}`);
    }
  }

  /**
   * Implementation of ProviderAdapter interface method for credential validation
   */
  async validateCredentials(credentials: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!credentials.accessToken || typeof credentials.accessToken !== 'string') {
        return { success: false, error: 'Oracle access token is required' };
      }

      const instanceUrl = credentials.instanceUrl || credentials.instance;
      await this.validateApiKey(credentials.accessToken.trim(), instanceUrl);
      return { success: true };
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMsg };
    }
  }
}
