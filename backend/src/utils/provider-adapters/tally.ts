import { BaseProviderAdapter, ProviderTokens } from './base';
import { config } from '../../config/env';

/**
 * Tally Adapter
 * 
 * Tally ERP 9 doesn't use OAuth. It supports:
 * 1. File-based export (XML/JSON/CSV)
 * 2. Tally.NET API (if enabled in Tally)
 * 3. ODBC connection (legacy)
 * 
 * For this implementation, we'll use a file-based approach where users:
 * - Export data from Tally as XML/JSON
 * - Upload via CSV import (handled separately)
 * 
 * This adapter is a placeholder that indicates Tally doesn't use OAuth.
 */
export class TallyAdapter extends BaseProviderAdapter {
  async getAuthUrl(orgId: string, state: string, redirectUri: string): Promise<string> {
    // Tally doesn't use OAuth - redirect to file upload instructions
    throw new Error('Tally does not support OAuth. Please export data from Tally and upload via CSV import.');
  }

  async exchangeCode(code: string, redirectUri: string): Promise<ProviderTokens> {
    throw new Error('Tally does not support OAuth token exchange.');
  }

  async refreshToken(refreshToken: string): Promise<ProviderTokens> {
    throw new Error('Tally does not support OAuth token refresh.');
  }

  /**
   * Tally-specific: Generate export instructions
   */
  getExportInstructions(): string {
    return `
To connect Tally ERP 9:

1. Open Tally ERP 9
2. Go to Gateway of Tally > Display > Statements of Accounts > Outstandings
3. Export data as CSV or XML
4. Use the CSV Import feature in FinaPilot to upload the exported file

Alternatively, if Tally.NET is enabled:
1. Configure Tally.NET settings in Tally
2. Use the Tally API endpoint (requires Tally.NET setup)
    `.trim();
  }
}
