export interface ProviderTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
}

export interface ProviderAdapter {
  getAuthUrl(orgId: string, state: string, redirectUri: string): Promise<string>;
  exchangeCode(code: string, redirectUri: string): Promise<ProviderTokens>;
  refreshToken(refreshToken: string): Promise<ProviderTokens>;
  getSyncJobsParams?(tokens: ProviderTokens): Record<string, any>;
}

export abstract class BaseProviderAdapter implements ProviderAdapter {
  protected clientId: string;
  protected clientSecret: string;
  protected redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  abstract getAuthUrl(orgId: string, state: string, redirectUri: string): Promise<string>;
  abstract exchangeCode(code: string, redirectUri: string): Promise<ProviderTokens>;
  abstract refreshToken(refreshToken: string): Promise<ProviderTokens>;
}


