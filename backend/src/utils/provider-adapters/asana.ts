import { ProviderAdapter, ProviderTokens } from './base';

/**
 * Asana OAuth Adapter
 * 
 * Asana uses OAuth2 for app authorization.
 * User grants permission to read projects and custom fields for cost/budget tracking.
 */
export class AsanaAdapter implements ProviderAdapter {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string
  ) {}

  /**
   * Get Asana OAuth authorization URL
   */
  async getAuthUrl(orgId: string, state: string, redirectUri: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      scope: 'default',
    });

    return `https://app.asana.com/-/oauth_authorize?${params.toString()}`;
  }

  /**
   * Exchange OAuth code for access token
   */
  async exchangeCode(code: string, redirectUri: string): Promise<ProviderTokens> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      });

      const response = await fetch('https://app.asana.com/-/oauth_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error('Asana token exchange failed');
      }

      const data = await response.json() as any;
      const { access_token, expires_in } = data;

      if (!access_token) {
        throw new Error('No access token returned from Asana');
      }

      return {
        accessToken: access_token,
        expiresAt: new Date(Date.now() + (expires_in || 3600) * 1000),
      };
    } catch (error: any) {
      throw new Error(`Asana OAuth failed: ${error.message}`);
    }
  }

  /**
   * Refresh Asana OAuth token
   */
  async refreshToken(token: string): Promise<any> {
    throw new Error('Token refresh not yet implemented for Asana. Use OAuth callback to get new token.');
  }

  /**
   * Validate Asana access token
   */
  async validateApiKey(accessToken: string): Promise<boolean> {
    if (!accessToken) {
      throw new Error('Asana access token is required');
    }

    try {
      const response = await fetch('https://app.asana.com/api/1.0/user_task_list/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (response.status === 401) {
        throw new Error('Asana access token is invalid or expired');
      }

      if (!response.ok) {
        throw new Error(`Asana API validation failed with status ${response.status}`);
      }

      return true;
    } catch (error: any) {
      if (error.message.includes('Asana')) {
        throw error;
      }
      throw new Error(`Failed to validate Asana token: ${error.message}`);
    }
  }

  /**
   * Validate Asana credentials (API key/Personal Access Token)
   */
  async validateCredentials(credentials: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!credentials.accessToken || typeof credentials.accessToken !== 'string') {
        return { success: false, error: 'Asana Personal Access Token is required' };
      }

      const isValid = await this.validateApiKey(credentials.accessToken.trim());
      return { success: isValid };
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMsg };
    }
  }
}
