import { ProviderAdapter, ProviderTokens } from './base';

/**
 * Slack OAuth Adapter
 * 
 * Slack uses OAuth2 for app authorization.
 * User grants permission to read workspace data (channels, budgets in metadata, etc).
 */
export class SlackAdapter implements ProviderAdapter {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string
  ) {}

  /**
   * Get Slack OAuth authorization URL
   */
  async getAuthUrl(orgId: string, state: string, redirectUri: string): Promise<string> {
    const scope = 'channels:read metadata.message:read team:read openid profile email';
    const params = new URLSearchParams({
      client_id: this.clientId,
      scope,
      user_scope: 'openid profile email', // For user-specific info
      redirect_uri: redirectUri,
      state,
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  /**
   * Exchange OAuth code for access token
   */
  async exchangeCode(code: string, redirectUri: string): Promise<ProviderTokens> {
    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      });

      const response = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error('Slack token exchange failed');
      }

      const data = await response.json() as any;

      if (!data.ok) {
        throw new Error(`Slack OAuth error: ${data.error}`);
      }

      const { bot_token } = data;

      if (!bot_token) {
        throw new Error('No access token returned from Slack');
      }

      return {
        accessToken: bot_token,
        // Slack tokens are indefinite unless revoked
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      };
    } catch (error: any) {
      throw new Error(`Slack OAuth failed: ${error.message}`);
    }
  }

  /**
   * Refresh Slack OAuth token
   */
  async refreshToken(token: string): Promise<any> {
    throw new Error('Token refresh not yet implemented for Slack. Use OAuth callback to get new token.');
  }


  /**
   * Validate Slack bot token
   */
  async validateApiKey(botToken: string): Promise<boolean> {
    if (!botToken) {
      throw new Error('Slack bot token is required');
    }

    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${botToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      if (!response.ok) {
        throw new Error('Slack token validation failed');
      }

      const data = await response.json() as any;

      if (!data.ok) {
        throw new Error(`Slack auth error: ${data.error}`);
      }

      return true;
    } catch (error: any) {
      if (error.message.includes('Slack')) {
        throw error;
      }
      throw new Error(`Failed to validate Slack token: ${error.message}`);
    }
  }

  /**
   * Implementation of ProviderAdapter interface method for credential validation
   */
  async validateCredentials(credentials: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!credentials.botToken || typeof credentials.botToken !== 'string') {
        return { success: false, error: 'Slack bot token is required' };
      }

      await this.validateApiKey(credentials.botToken.trim());
      return { success: true };
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMsg };
    }
  }
}
