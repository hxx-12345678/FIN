import { BaseProviderAdapter, ProviderTokens } from './base';
import axios from 'axios';
import { config } from '../../config/env';

/**
 * Xero OAuth 2.0 Adapter
 * 
 * Xero uses OAuth 2.0 with:
 * - Authorization URL: https://login.xero.com/identity/connect/authorize
 * - Token URL: https://identity.xero.com/connect/token
 * - API Base: https://api.xero.com
 * 
 * Required scopes:
 * - accounting.transactions (read transactions)
 * - accounting.contacts (read contacts)
 * - accounting.settings (read company settings)
 */
export class XeroAdapter extends BaseProviderAdapter {
  private readonly authBaseUrl = 'https://login.xero.com/identity/connect/authorize';
  private readonly tokenUrl = 'https://identity.xero.com/connect/token';
  private readonly apiBaseUrl = 'https://api.xero.com';

  async getAuthUrl(orgId: string, state: string, redirectUri: string): Promise<string> {
    const scopes = [
      'accounting.transactions',
      'accounting.contacts',
      'accounting.settings',
      'offline_access', // Required for refresh tokens
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state: state,
    });

    return `${this.authBaseUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<ProviderTokens> {
    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          auth: {
            username: this.clientId,
            password: this.clientSecret,
          },
        }
      );

      const data = response.data;
      const expiresIn = data.expires_in || 1800; // Xero tokens expire in 30 minutes

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        tokenType: data.token_type || 'Bearer',
        scope: data.scope,
      };
    } catch (error: any) {
      throw new Error(`Xero OAuth token exchange failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  async refreshToken(refreshToken: string): Promise<ProviderTokens> {
    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          auth: {
            username: this.clientId,
            password: this.clientSecret,
          },
        }
      );

      const data = response.data;
      const expiresIn = data.expires_in || 1800;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        tokenType: data.token_type || 'Bearer',
        scope: data.scope,
      };
    } catch (error: any) {
      throw new Error(`Xero token refresh failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  getSyncJobsParams?(tokens: ProviderTokens): Record<string, any> {
    return {
      apiBaseUrl: this.apiBaseUrl,
    };
  }
}
