import { BaseProviderAdapter, ProviderTokens } from './base';
import axios from 'axios';
import { config } from '../../config/env';

/**
 * QuickBooks Online OAuth 2.0 Adapter
 * 
 * QuickBooks uses OAuth 2.0 with:
 * - Authorization URL: https://appcenter.intuit.com/connect/oauth2
 * - Token URL: https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer
 * - API Base: https://sandbox-quickbooks.api.intuit.com (sandbox) or https://quickbooks.api.intuit.com (production)
 * 
 * Required scopes:
 * - com.intuit.quickbooks.accounting (for accounting data)
 */
export class QuickBooksAdapter extends BaseProviderAdapter {
  private readonly authBaseUrl = 'https://appcenter.intuit.com/connect/oauth2';
  private readonly tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
  private readonly apiBaseUrl = process.env.QUICKBOOKS_ENVIRONMENT === 'production' 
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';

  async getAuthUrl(orgId: string, state: string, redirectUri: string): Promise<string> {
    const scopes = [
      'com.intuit.quickbooks.accounting',
      'openid',
      'profile',
      'email',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: scopes,
      redirect_uri: redirectUri,
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
      const expiresIn = data.expires_in || 3600; // Default 1 hour

      // QuickBooks token response includes realmId in the response
      // Store it in the scope field temporarily (will be extracted in callback)
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        tokenType: data.token_type || 'Bearer',
        scope: data.scope || data.realmId || '', // realmId might be in response
      };
    } catch (error: any) {
      throw new Error(`QuickBooks OAuth token exchange failed: ${error.response?.data?.error_description || error.message}`);
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
      const expiresIn = data.expires_in || 3600;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Use new refresh token if provided
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        tokenType: data.token_type || 'Bearer',
        scope: data.scope,
      };
    } catch (error: any) {
      throw new Error(`QuickBooks token refresh failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  getSyncJobsParams?(tokens: ProviderTokens): Record<string, any> {
    return {
      apiBaseUrl: this.apiBaseUrl,
      realmId: tokens.scope, // QuickBooks realmId is typically in the token response
    };
  }
}
