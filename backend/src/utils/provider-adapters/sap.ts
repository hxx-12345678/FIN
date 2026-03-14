import { ProviderAdapter, ProviderTokens } from './base';

/**
 * SAP S/4HANA OAuth Adapter
 * 
 * SAP uses certified OAuth2 flow for cloud financials access.
 * Requires client certificate for secure token exchange.
 */
export class SAPAdapter implements ProviderAdapter {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string,
    private instance?: string // SAP instance URL like "sapinstance.us10.hana.ondemand.com"
  ) {}

  /**
   * Get SAP OAuth authorization URL
   */
  async getAuthUrl(orgId: string, state: string, redirectUri: string): Promise<string> {
    if (!this.instance) {
      throw new Error('SAP instance URL is required for OAuth');
    }

    const authEndpoint = `https://${this.instance}/oauth2/authorize`;
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      state,
      scope: 'FSCM_FI_DATA API',
    });

    return `${authEndpoint}?${params.toString()}`;
  }

  /**
   * Exchange OAuth code for access token
   */
  async exchangeCode(code: string, redirectUri: string): Promise<ProviderTokens> {
    if (!this.instance) {
      throw new Error('SAP instance URL is required');
    }

    try {
      const tokenEndpoint = `https://${this.instance}/oauth2/token`;
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
        throw new Error(`SAP token exchange failed: ${error}`);
      }

      const data = await response.json() as any;
      const { access_token, expires_in } = data;

      if (!access_token) {
        throw new Error('No access token returned from SAP');
      }

      return {
        accessToken: access_token,
        expiresAt: new Date(Date.now() + (expires_in || 3600) * 1000),
      };
    } catch (error: any) {
      throw new Error(`SAP OAuth failed: ${error.message}`);
    }
  }

  /**
   * Refresh SAP OAuth token
   */
  async refreshToken(refreshToken: string): Promise<ProviderTokens> {
    if (!refreshToken) {
      throw new Error('SAP refresh token required');
    }

    if (!this.instance) {
      throw new Error('SAP instance URL is required for token refresh');
    }

    try {
      const tokenEndpoint = `https://${this.instance}/oauth2/token`;
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
        throw new Error(`SAP token refresh failed: HTTP ${response.status} - ${error}`);
      }

      const data = (await response.json()) as Record<string, any>;
      
      if (!data.access_token) {
        throw new Error('No access token in SAP refresh response');
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Use new refresh if provided
        expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000),
        tokenType: data.token_type || 'Bearer',
        scope: data.scope,
      };
    } catch (error: any) {
      throw new Error(`SAP OAuth token refresh failed: ${error.message}`);
    }
  }

  /**
   * Validate SAP access token
   */
  async validateApiKey(accessToken: string, instance?: string): Promise<boolean> {
    const instanceUrl = instance || this.instance;
    if (!accessToken || !instanceUrl) {
      throw new Error('SAP access token and instance URL are required');
    }

    try {
      // Clean up instance URL if it has protocol
      const baseUrl = instanceUrl.replace(/^https?:\/\//, '');

      const response = await fetch(
        `https://${baseUrl}/sap/opu/odata/sap/C_GL_ACCOUNT_LINE_ITEMS_SRV/$metadata`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (response.status === 401) {
        throw new Error('SAP access token is invalid or expired');
      }

      if (!response.ok) {
        throw new Error(`SAP API validation failed with status ${response.status}`);
      }

      return true;
    } catch (error: any) {
      if (error.message.includes('SAP')) {
        throw error;
      }
      throw new Error(`Failed to validate SAP token: ${error.message}`);
    }
  }

  /**
   * Implementation of ProviderAdapter interface method for credential validation
   */
  async validateCredentials(credentials: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!credentials.accessToken || typeof credentials.accessToken !== 'string') {
        return { success: false, error: 'SAP access token is required' };
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
