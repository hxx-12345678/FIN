# Environment Variables for Integrations

## Required Environment Variables

Add these to your `backend/.env` file to enable integrations:

### QuickBooks Online
```bash
QUICKBOOKS_CLIENT_ID=your-quickbooks-client-id
QUICKBOOKS_CLIENT_SECRET=your-quickbooks-client-secret
QUICKBOOKS_ENVIRONMENT=sandbox
# For production, use: QUICKBOOKS_ENVIRONMENT=production
```

**How to get credentials:**
1. Go to https://developer.intuit.com/
2. Create a new app or use existing
3. Add redirect URI: `https://your-backend-url.com/api/v1/connectors/callback`
4. Copy Client ID and Client Secret

### Xero
```bash
XERO_CLIENT_ID=your-xero-client-id
XERO_CLIENT_SECRET=your-xero-client-secret
```

**How to get credentials:**
1. Go to https://developer.xero.com/
2. Create a new app
3. Add redirect URI: `https://your-backend-url.com/api/v1/connectors/callback`
4. Copy Client ID and Client Secret

### Zoho Books
```bash
ZOHO_CLIENT_ID=your-zoho-client-id
ZOHO_CLIENT_SECRET=your-zoho-client-secret
```

**How to get credentials:**
1. Go to https://api-console.zoho.com/
2. Create a new client application
3. Add redirect URI: `https://your-backend-url.com/api/v1/connectors/callback`
4. Copy Client ID and Client Secret

### Stripe (API Key - configured per organization)
```bash
# No env vars needed - configured via UI per organization
# Users enter their Stripe Secret Key in the integrations page
```

### Tally (File-based export)
```bash
# No env vars needed - users export CSV from Tally and upload
```

## Testing Without Real Credentials

If you don't have OAuth credentials yet, the system will show clear error messages when users try to connect, indicating which credentials are missing.

## Verification

After adding credentials, restart your backend server:

```bash
cd backend
npm run dev
```

Then test by:
1. Going to Integrations page
2. Clicking "Connect" on QuickBooks/Xero/Zoho
3. You should be redirected to the provider's OAuth page (not see an error)

## Common Issues

### "Credentials not configured" error
- Check that variable names match exactly (case-sensitive)
- Ensure no extra spaces in .env file
- Restart backend after adding credentials

### OAuth redirect fails
- Verify redirect URI matches exactly in provider's developer portal
- Check that BACKEND_URL in .env is correct and accessible
- Ensure redirect URI uses HTTPS in production

### Token exchange fails
- Verify Client ID and Secret are correct
- Check that redirect URI matches in provider portal
- Ensure scopes are properly configured in provider portal
