# Integrations Testing Guide

## Current Status

All integrations have been implemented with:
- ✅ Real OAuth adapters for QuickBooks, Xero, Zoho
- ✅ Python worker data fetching for all providers
- ✅ Proper error handling and user feedback
- ✅ OAuth callback handling with success/error redirects

## Testing Checklist

### 1. Environment Setup

**Required:** Add OAuth credentials to `backend/.env`:

```bash
# QuickBooks
QUICKBOOKS_CLIENT_ID=your-actual-client-id
QUICKBOOKS_CLIENT_SECRET=your-actual-client-secret
QUICKBOOKS_ENVIRONMENT=sandbox

# Xero
XERO_CLIENT_ID=your-actual-client-id
XERO_CLIENT_SECRET=your-actual-client-secret

# Zoho
ZOHO_CLIENT_ID=your-actual-client-id
ZOHO_CLIENT_SECRET=your-actual-client-secret
```

**Important:** Replace placeholder values with real credentials from each provider's developer portal.

### 2. Test Each Integration

#### QuickBooks Online
1. Go to Integrations page
2. Click "Connect" on QuickBooks Online
3. **Expected:** Redirect to QuickBooks OAuth page (not error)
4. **If error:** Check that QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET are set correctly
5. Authorize the app
6. **Expected:** Redirect back to FinaPilot with success message
7. **Expected:** Connector shows as "Connected"
8. Click "Sync" button
9. **Expected:** Data syncs from QuickBooks (check Python worker logs)

#### Xero
1. Go to Integrations page
2. Click "Connect" on Xero
3. **Expected:** Redirect to Xero OAuth page
4. Select organization and authorize
5. **Expected:** Redirect back with success
6. **Expected:** Connector shows as "Connected"
7. Click "Sync" to fetch data

#### Zoho Books
1. Go to Integrations page
2. Click "Connect" on Zoho Books
3. **Expected:** Redirect to Zoho OAuth page
4. Authorize the app
5. **Expected:** Redirect back with success
6. **Expected:** Connector shows as "Connected"
7. Click "Sync" to fetch data

#### Tally
1. Go to Integrations page
2. Click "Connect" on Tally
3. **Expected:** Toast message explaining CSV export process
4. Export data from Tally as CSV
5. Use CSV Import feature to upload

#### Stripe
1. Go to Integrations page
2. Click "Connect" on Stripe
3. **Expected:** Dialog to enter Stripe Secret Key
4. Enter key (starts with `sk_`)
5. **Expected:** Connector connects and syncs data

### 3. Error Scenarios to Test

#### Missing Credentials
- **Action:** Remove OAuth credentials from .env
- **Expected:** Clear error message when clicking "Connect"
- **Message:** "{PROVIDER} OAuth credentials not configured. Please set {PROVIDER}_CLIENT_ID and {PROVIDER}_CLIENT_SECRET in .env"

#### Invalid Credentials
- **Action:** Use wrong Client ID/Secret
- **Expected:** OAuth provider shows error
- **Expected:** Redirect back to FinaPilot with error message

#### OAuth Cancellation
- **Action:** Cancel OAuth flow at provider
- **Expected:** Redirect back with appropriate error message

### 4. Data Verification

After successful connection and sync:

1. **Check Database:**
   ```sql
   SELECT * FROM connectors WHERE type IN ('quickbooks', 'xero', 'zoho') AND status = 'connected';
   SELECT COUNT(*) FROM raw_transactions WHERE "connectorId" IS NOT NULL;
   ```

2. **Check Python Worker Logs:**
   - Look for "✅ connector_sync completed" messages
   - Check for any error messages

3. **Check Frontend:**
   - Go to Financial Modeling or Overview
   - Verify transactions are visible
   - Check that data appears in charts/reports

### 5. Testing with Provided Credentials

**Email:** cptjacksprw@gmail.com  
**Password:** Player@123

1. Login with these credentials
2. Navigate to Integrations page
3. Test each connector:
   - QuickBooks: Use sandbox credentials
   - Xero: Use demo/test organization
   - Zoho: Use test organization
4. Verify data syncs correctly

## Troubleshooting

### "Credentials not configured" Error
- **Solution:** Add credentials to `backend/.env` and restart backend

### OAuth Redirect Fails
- **Check:** Redirect URI matches in provider portal exactly
- **Check:** BACKEND_URL in .env is correct
- **Check:** Backend is accessible from internet (for OAuth callback)

### No Data After Sync
- **Check:** Python worker is running
- **Check:** Python worker logs for errors
- **Check:** Connector status is "connected"
- **Check:** Date range - sync only gets last 180 days

### Token Expired
- **Action:** Reconnect the connector
- **Expected:** New tokens are fetched automatically

## Next Steps

1. **Get Real OAuth Credentials:**
   - QuickBooks: https://developer.intuit.com/
   - Xero: https://developer.xero.com/
   - Zoho: https://api-console.zoho.com/

2. **Configure Redirect URIs:**
   - All providers: `https://your-backend-url.com/api/v1/connectors/callback`

3. **Test End-to-End:**
   - Connect each provider
   - Verify data syncs
   - Check data appears in financial models

4. **Monitor:**
   - Check Python worker logs regularly
   - Monitor connector sync status
   - Review error logs for issues
