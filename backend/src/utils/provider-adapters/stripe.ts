import { ProviderAdapter, ProviderTokens } from './base';

/**
 * Stripe API Key Adapter
 * 
 * Stripe uses API keys (sk_live_... or sk_test_...) for authentication, not OAuth.
 * This adapter validates the API key by attempting a test API call.
 */
export class StripeAdapter implements ProviderAdapter {
  constructor(private redirectUri: string) {}

  /**
   * Stripe doesn't use OAuth, but we implement this for interface compatibility.
   * Real connection is handled via connectStripeApiKey in the service.
   */
  async getAuthUrl(orgId: string, state: string, redirectUri: string): Promise<string> {
    throw new Error('Stripe uses API key authentication, not OAuth. Use the connectStripeApiKey endpoint instead.');
  }

  /**
   * Not used for Stripe - no code exchange needed
   */
  async exchangeCode(code: string, redirectUri: string): Promise<ProviderTokens> {
    throw new Error('Stripe does not use OAuth code exchange');
  }

  /**
   * Stripe tokens don't refresh - API keys are static
   */
  async refreshToken(token: string): Promise<any> {
    throw new Error('Stripe API keys do not refresh. Use connectStripeApiKey endpoint to update.');
  }

  /**
   * Validate a Stripe API key by attempting a test API call
   * @param apiKey - Stripe secret key (sk_test_... or sk_live_...)
   * @returns true if key is valid, throws error otherwise
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    if (!apiKey || !apiKey.startsWith('sk_')) {
      throw new Error('Invalid Stripe secret key format. Must start with "sk_"');
    }

    try {
      // Make a simple API call to validate the key
      // Using fetch instead of stripe library to keep dependencies minimal
      const response = await fetch('https://api.stripe.com/v1/charges', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'limit=1',
      });

      if (response.status === 401) {
        throw new Error('Stripe API key is invalid or expired');
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Stripe API error: ${error}`);
      }

      // If we got here, key is valid
      return true;
    } catch (error: any) {
      if (error.message.includes('Stripe')) {
        throw error;
      }
      throw new Error(`Failed to validate Stripe key: ${error.message}`);
    }
  }

  /**
   * Implementation of ProviderAdapter interface method for credential validation
   */
  async validateCredentials(credentials: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!credentials.apiKey || typeof credentials.apiKey !== 'string') {
        return { success: false, error: 'API key is required' };
      }

      const trimmed = credentials.apiKey.trim();
      await this.validateApiKey(trimmed);
      return { success: true };
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMsg };
    }
  }
}
