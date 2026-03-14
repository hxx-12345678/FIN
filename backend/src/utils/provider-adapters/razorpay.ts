import { ProviderAdapter, ProviderTokens } from './base';

/**
 * Razorpay API Adapter
 * 
 * Razorpay uses Basic Auth with Key ID and Key Secret.
 * Credentials are provided directly, not via OAuth.
 * This adapter validates credentials by attempting a test API call.
 */
export class RazorpayAdapter implements ProviderAdapter {
  constructor(private redirectUri: string) {}

  /**
   * Razorpay doesn't use OAuth
   */
  async getAuthUrl(orgId: string, state: string, redirectUri: string): Promise<string> {
    throw new Error('Razorpay uses API key authentication, not OAuth. Use the connectRazorpay endpoint instead.');
  }

  /**
   * Not used for Razorpay
   */
  async exchangeCode(code: string, redirectUri: string): Promise<ProviderTokens> {
    throw new Error('Razorpay does not use OAuth code exchange');
  }

  /**
   * Razorpay credentials don't refresh - API keys are static
   */
  async refreshToken(token: string): Promise<any> {
    throw new Error('Razorpay API keys do not refresh. Use connectRazorpay endpoint to update.');
  }

  /**
   * Validate Razorpay credentials by attempting a test API call
   * @param keyId - Razorpay Key ID (from dashboard)
   * @param keySecret - Razorpay Key Secret (from dashboard)
   * @returns true if credentials are valid, throws error otherwise
   */
  async validateApiKey(keyId: string, keySecret: string): Promise<boolean> {
    if (!keyId || !keySecret) {
      throw new Error('Invalid Razorpay credentials. Both Key ID and Key Secret are required.');
    }

    try {
      // Create Basic Auth header
      const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

      // Make a test API call to the Razorpay dashboard API
      const response = await fetch('https://api.razorpay.com/v1/customers?count=1', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error('Razorpay API credentials are invalid or lack required permissions');
      }

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Razorpay API error: ${error}`);
      }

      // If we got here, credentials are valid
      return true;
    } catch (error: any) {
      if (error.message.includes('Razorpay')) {
        throw error;
      }
      throw new Error(`Failed to validate Razorpay credentials: ${error.message}`);
    }
  }

  /**
   * Implementation of ProviderAdapter interface method for credential validation
   */
  async validateCredentials(credentials: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!credentials.keyId || !credentials.keySecret) {
        return { success: false, error: 'Both Key ID and Key Secret are required' };
      }

      await this.validateApiKey(credentials.keyId.trim(), credentials.keySecret.trim());
      return { success: true };
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMsg };
    }
  }
}
