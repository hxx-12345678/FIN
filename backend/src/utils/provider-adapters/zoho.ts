import { BaseProviderAdapter, ProviderTokens } from './base';
import axios from 'axios';
import { config } from '../../config/env';

/**
 * Zoho Books OAuth 2.0 Adapter
 * 
 * Zoho uses OAuth 2.0 with:
 * - Authorization URL: https://accounts.zoho.com/oauth/v2/auth
 * - Token URL: https://accounts.zoho.com/oauth/v2/token
 * - API Base: https://books.zoho.com/api/v3
 * 
 * Required scopes:
 * - ZohoBooks.fullaccess.all (full access to books)
 * - ZohoBooks.settings.all (read settings)
 */
export class ZohoAdapter extends BaseProviderAdapter {
  private readonly authBaseUrl = 'https://accounts.zoho.com/oauth/v2/auth';
  private readonly tokenUrl = 'https://accounts.zoho.com/oauth/v2/token';
  private readonly apiBaseUrl = 'https://books.zoho.com/api/v3';

  async getAuthUrl(orgId: string, state: string, redirectUri: string): Promise<string> {
    const scopes = [
      'ZohoBooks.fullaccess.all',
      'ZohoBooks.settings.all',
    ].join(',');

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: scopes,
      redirect_uri: redirectUri,
      access_type: 'offline', // Required for refresh tokens
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
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code: code,
          redirect_uri: redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
        }
      );

      const data = response.data;
      const expiresIn = data.expires_in_sec || 3600; // Default 1 hour

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        tokenType: 'Bearer',
        scope: data.scope,
      };
    } catch (error: any) {
      throw new Error(`Zoho OAuth token exchange failed: ${error.response?.data?.error || error.message}`);
    }
  }

  async refreshToken(refreshToken: string): Promise<ProviderTokens> {
    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
        }
      );

      const data = response.data;
      const expiresIn = data.expires_in_sec || 3600;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        tokenType: 'Bearer',
        scope: data.scope,
      };
    } catch (error: any) {
      throw new Error(`Zoho token refresh failed: ${error.response?.data?.error || error.message}`);
    }
  }

  getSyncJobsParams?(tokens: ProviderTokens): Record<string, any> {
    return {
      apiBaseUrl: this.apiBaseUrl,
    };
  }
}
