# FinaPilot Integrations Setup Guide

This guide explains how to configure and use each integration connector in FinaPilot.

## Overview

FinaPilot supports the following integrations:

- **QuickBooks Online** - OAuth 2.0 integration
- **Xero** - OAuth 2.0 integration
- **Zoho Books** - OAuth 2.0 integration
- **Tally ERP 9** - File-based export (CSV import)
- **Stripe** - API key-based integration
- **Razorpay** - API key-based integration (coming soon)

## Prerequisites

1. **Backend Environment Variables**: Add the required OAuth credentials to your `.env` file (see `.env.example`)
2. **OAuth Redirect URLs**: Configure redirect URLs in each provider's developer portal
3. **Python Worker**: Ensure the Python worker is running to process sync jobs

## QuickBooks Online Setup

### 1. Create QuickBooks App

1. Go to [Intuit Developer Portal](https://developer.intuit.com/)
2. Create a new app or use an existing one
3. Add OAuth 2.0 credentials:
   - **Redirect URI**: `https://your-backend-url.com/api/v1/connectors/callback`
   - **Scopes**: `com.intuit.quickbooks.accounting`, `openid`, `profile`, `email`

### 2. Get Credentials

- **Client ID**: Found in your app's credentials
- **Client Secret**: Found in your app's credentials
- **Environment**: Choose `sandbox` for testing or `production` for live data

### 3. Configure Backend

Add to `.env`:
```bash
QUICKBOOKS_CLIENT_ID=your-client-id
QUICKBOOKS_CLIENT_SECRET=your-client-secret
QUICKBOOKS_ENVIRONMENT=sandbox  # or 'production'
```

### 4. Connect in FinaPilot

1. Go to **Integrations** page
2. Click **Connect** on QuickBooks Online
3. Authorize the app in QuickBooks
4. You'll be redirected back to FinaPilot
5. Data will sync automatically

## Xero Setup

### 1. Create Xero App

1. Go to [Xero Developer Portal](https://developer.xero.com/)
2. Create a new app
3. Configure OAuth 2.0:
   - **Redirect URI**: `https://your-backend-url.com/api/v1/connectors/callback`
   - **Scopes**: `accounting.transactions`, `accounting.contacts`, `accounting.settings`, `offline_access`

### 2. Get Credentials

- **Client ID**: Found in your app settings
- **Client Secret**: Found in your app settings

### 3. Configure Backend

Add to `.env`:
```bash
XERO_CLIENT_ID=your-client-id
XERO_CLIENT_SECRET=your-client-secret
```

### 4. Connect in FinaPilot

1. Go to **Integrations** page
2. Click **Connect** on Xero
3. Select your Xero organization
4. Authorize the app
5. You'll be redirected back to FinaPilot
6. Data will sync automatically

## Zoho Books Setup

### 1. Create Zoho App

1. Go to [Zoho API Console](https://api-console.zoho.com/)
2. Create a new client application
3. Configure OAuth 2.0:
   - **Redirect URI**: `https://your-backend-url.com/api/v1/connectors/callback`
   - **Scopes**: `ZohoBooks.fullaccess.all`, `ZohoBooks.settings.all`

### 2. Get Credentials

- **Client ID**: Found in your app credentials
- **Client Secret**: Found in your app credentials

### 3. Configure Backend

Add to `.env`:
```bash
ZOHO_CLIENT_ID=your-client-id
ZOHO_CLIENT_SECRET=your-client-secret
```

### 4. Connect in FinaPilot

1. Go to **Integrations** page
2. Click **Connect** on Zoho Books
3. Authorize the app in Zoho
4. You'll be redirected back to FinaPilot
5. Data will sync automatically

## Tally ERP 9 Setup

Tally doesn't support OAuth. Instead, use file-based export:

### 1. Export from Tally

1. Open Tally ERP 9
2. Go to **Gateway of Tally** > **Display** > **Statements of Accounts**
3. Select the report you need (e.g., Outstandings, Ledgers)
4. Export as **CSV** or **Excel**

### 2. Import to FinaPilot

1. Go to **Integrations** page
2. Click **Download Template** to get the CSV template
3. Format your Tally export to match the template
4. Use **CSV Import** feature to upload the file
5. Data will be processed and imported

### Required CSV Fields

- **Date** (required): Transaction date
- **Amount** (required): Transaction amount
- **Description** (recommended): Transaction description
- **Category** (recommended): Transaction category
- **Account** (recommended): Account name

## Stripe Setup

Stripe uses API keys, not OAuth:

### 1. Get Stripe API Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** > **API keys**
3. Copy your **Secret key** (starts with `sk_`)

### 2. Connect in FinaPilot

1. Go to **Integrations** page
2. Click **Connect** on Stripe
3. Enter your Stripe Secret Key
4. Click **Connect**
5. Data will sync automatically

## Testing Integrations

### Test Credentials

For testing with the provided credentials (`cptjacksprw@gmail.com` / `Player@123`):

1. **QuickBooks**: Use sandbox environment with test company
2. **Xero**: Use demo company or create test organization
3. **Zoho**: Use test organization
4. **Stripe**: Use test mode API keys

### Verification Steps

1. **Check Connection Status**: Go to Integrations page, verify connector shows "Connected"
2. **Trigger Manual Sync**: Click "Sync" button on connected connector
3. **Check Transactions**: Go to Financial Modeling or Overview to see imported data
4. **Check Logs**: Review sync job logs in the Integrations history section

## Troubleshooting

### OAuth Flow Fails

- **Check Redirect URI**: Must match exactly in provider's developer portal
- **Check Credentials**: Verify Client ID and Secret are correct
- **Check Environment**: Ensure backend URL is accessible from internet (for OAuth callback)

### Sync Fails

- **Check Tokens**: Tokens may have expired, try reconnecting
- **Check Permissions**: Ensure OAuth scopes include required permissions
- **Check Logs**: Review Python worker logs for detailed error messages
- **Check Network**: Ensure Python worker can reach provider APIs

### No Data Imported

- **Check Date Range**: Sync only imports data from last 180 days (or since last sync)
- **Check Filters**: Some providers filter data by date or status
- **Check Permissions**: Ensure OAuth scopes allow reading transactions

## Security Notes

- **Encryption**: All OAuth tokens are encrypted using AES-256-GCM
- **Storage**: Tokens stored in `connectors.encrypted_config` (BYTEA column)
- **Refresh**: Tokens are automatically refreshed when expired (if refresh token available)
- **Access Control**: Only admins and finance users can create/configure connectors

## API Rate Limits

Be aware of provider rate limits:

- **QuickBooks**: 500 requests per minute per company
- **Xero**: 60 requests per minute per organization
- **Zoho**: 100 requests per minute per organization
- **Stripe**: 100 requests per second

FinaPilot implements automatic rate limiting and retry logic.

## Support

For issues or questions:
1. Check Python worker logs: `python-worker/logs/`
2. Check backend logs: `backend/backend.log`
3. Review sync job status in Integrations page
4. Contact support with connector ID and error messages
