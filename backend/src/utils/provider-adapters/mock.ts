import { BaseProviderAdapter, ProviderTokens } from './base';
import { config } from '../../config/env';

/**
 * Mock provider adapter for testing without real OAuth credentials
 * Returns plausible tokens for development/testing
 */
export class MockProviderAdapter extends BaseProviderAdapter {
  async getAuthUrl(orgId: string, state: string, redirectUri: string): Promise<string> {
    // For mock OAuth, redirect to backend callback with a mock code
    // This simulates the OAuth flow for development/testing
    const mockCode = `mock_code_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    // Return callback URL that will be handled by the backend
    return `${config.backendUrl}/api/v1/connectors/callback?code=${mockCode}&state=${state}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<ProviderTokens> {
    // Return mock tokens
    return {
      accessToken: `mock_access_token_${code}_${Date.now()}`,
      refreshToken: `mock_refresh_token_${code}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
      tokenType: 'Bearer',
      scope: 'read write',
    };
  }

  async refreshToken(refreshToken: string): Promise<ProviderTokens> {
    return {
      accessToken: `mock_access_token_refreshed_${Date.now()}`,
      refreshToken: `mock_refresh_token_new_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      tokenType: 'Bearer',
    };
  }
}

