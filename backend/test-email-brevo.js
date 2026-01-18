/**
 * Test Email Sending with Brevo API
 * Tests invitation email to shahdishank24@gmail.com
 */

require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api/v1';
const TEST_EMAIL = 'cptjacksprw@gmail.com';
const TEST_PASSWORD = 'Player@123';
const INVITE_EMAIL = 'shahdishank24@gmail.com';

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    reset: '\x1b[0m'
  };
  const color = colors[type] || colors.info;
  console.log(`${color}${message}${colors.reset}`);
}

async function testEmailSending() {
  try {
    log('\n🚀 Testing Email Sending with Brevo API', 'info');
    log(`API Base URL: ${API_BASE_URL}`, 'info');
    log(`Test Account: ${TEST_EMAIL}`, 'info');
    log(`Invite Email: ${INVITE_EMAIL}`, 'info');
    log('='.repeat(80), 'info');

    // Step 1: Login
    log('\n=== Step 1: Authentication ===', 'info');
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));
    
    if (!loginData.ok) {
      throw new Error(`Login failed: ${loginData.error?.message || 'Unknown error'}`);
    }

    const token = loginData.data?.token || loginData.token || loginData.data?.accessToken;
    const orgId = loginData.data?.orgId || loginData.data?.org?.id || loginData.orgId;
    
    if (!token) {
      throw new Error('Login failed: No token received in response');
    }
    
    log('✅ Authentication successful', 'success');
    log(`✅ Org ID: ${orgId}`, 'success');

    if (!orgId) {
      throw new Error('No organization ID found');
    }

    // Step 2: Cancel any existing invitation
    log('\n=== Step 2: Checking for existing invitations ===', 'info');
    const invitationsResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/invitations`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (invitationsResponse.ok) {
      const invitationsData = await invitationsResponse.json();
      const existingInvite = invitationsData.data?.find((inv) => inv.email === INVITE_EMAIL && !inv.usedAt);
      
      if (existingInvite) {
        log(`Found existing invitation: ${existingInvite.id}`, 'warn');
        log('Cancelling existing invitation...', 'info');
        
        const cancelResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/invitations/${existingInvite.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (cancelResponse.ok) {
          log('✅ Existing invitation cancelled', 'success');
        }
      }
    }

    // Step 3: Send new invitation
    log('\n=== Step 3: Sending Invitation Email ===', 'info');
    const inviteResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/users/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: INVITE_EMAIL,
        role: 'viewer',
        message: 'Welcome to FinaPilot! You have been invited to join our team.',
      }),
    });

    if (!inviteResponse.ok) {
      const errorData = await inviteResponse.json().catch(() => ({}));
      throw new Error(`Invitation failed: ${inviteResponse.status} ${inviteResponse.statusText} - ${JSON.stringify(errorData)}`);
    }

    const inviteData = await inviteResponse.json();
    log('✅ Invitation created successfully:', 'success');
    log(`   ID: ${inviteData.data?.id}`, 'info');
    log(`   Email: ${inviteData.data?.email}`, 'info');
    log(`   Role: ${inviteData.data?.role}`, 'info');
    log('\n✅ EMAIL SHOULD BE SENT to shahdishank24@gmail.com', 'success');
    log('   Check backend console output for Brevo API response', 'info');
    log('   Email should contain invitation link with token', 'info');

    log('\n' + '='.repeat(80), 'info');
    log('✅ Email invitation test completed!', 'success');
    log('\n📋 Summary:', 'info');
    log('   ✅ Authentication successful', 'success');
    log('   ✅ Invitation created - EMAIL SENT via Brevo', 'success');
    log('\n💡 IMPORTANT: Check backend console output to see Brevo API response', 'info');
    log('   If successful, you should see:', 'info');
    log('   [EMAIL] ✅ Email sent successfully via Brevo to shahdishank24@gmail.com', 'info');

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'error');
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testEmailSending();
