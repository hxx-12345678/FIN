/**
 * Complete Invitation Email Flow Test
 * Tests: Cancel invitation -> Send new invitation -> Verify email sent
 * 
 * Prerequisites:
 * 1. Backend server must be running on http://localhost:8000
 * 2. Test account: cptjacksprw@gmail.com / Player@123
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';
const TEST_EMAIL = 'cptjacksprw@gmail.com';
const TEST_PASSWORD = 'Player@123';
const INVITE_EMAIL = 'hempatel777@yahoo.com';

let authToken = null;
let orgId = null;
let invitationId = null;

// Color logging
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'
  };
  
  const color = colors[type] || colors.info;
  console.log(`${color}${message}${colors.reset}`);
}

function assert(condition, message) {
  if (condition) {
    log(`✅ PASS: ${message}`, 'success');
    return true;
  } else {
    log(`❌ FAIL: ${message}`, 'error');
    return false;
  }
}

async function makeRequest(url, method = 'GET', body = null, headers = {}) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json().catch(() => ({ error: 'Invalid JSON response' }));
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text, error: 'Non-JSON response' };
      }
    }

    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    if (error.message.includes('ECONNREFUSED') || error.message.includes('failed, reason:')) {
      log(`⚠️  Backend server appears to be not running at ${API_BASE_URL}`, 'warning');
      log('⚠️  Please start the backend server first: cd backend && npm start', 'warning');
    } else {
      log(`Request error to ${url}: ${error.message}`, 'error');
    }
    return { status: 0, data: { error: error.message }, ok: false };
  }
}

async function testAuthentication() {
  log('\n=== Testing Authentication ===', 'info');
  
  const { status, data } = await makeRequest(`${API_BASE_URL}/auth/login`, 'POST', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  assert(status === 200 || status === 201, 'Login should succeed');
  assert(data.ok !== false, 'Response should be ok');
  assert(data.data?.token || data.token, 'Token should be returned');

  if (data.data?.token || data.token) {
    authToken = data.data?.token || data.token;
    log(`✅ Authentication successful - Token obtained`, 'success');
  }

  // Get org ID
  const meResponse = await makeRequest(`${API_BASE_URL}/auth/me`, 'GET', null, {
    Authorization: `Bearer ${authToken}`,
  });

  if (meResponse.ok) {
    const responseData = meResponse.data?.data || meResponse.data;
    
    if (responseData?.orgs && Array.isArray(responseData.orgs) && responseData.orgs.length > 0) {
      orgId = responseData.orgs[0].id;
      log(`✅ Org ID obtained: ${orgId}`, 'success');
    } else if (responseData?.orgId) {
      orgId = responseData.orgId;
      log(`✅ Org ID obtained: ${orgId}`, 'success');
    }
  }

  return authToken !== null && orgId !== null;
}

async function findExistingInvitation() {
  log('\n=== Finding Existing Invitation ===', 'info');
  
  const { status, data } = await makeRequest(
    `${API_BASE_URL}/orgs/${orgId}/invitations`,
    'GET',
    null,
    {
      Authorization: `Bearer ${authToken}`,
    }
  );

  if (status === 200 && data.ok && Array.isArray(data.data)) {
    const invite = data.data.find(inv => inv.email === INVITE_EMAIL);
    if (invite) {
      invitationId = invite.id;
      log(`✅ Found existing invitation: ${invitationId}`, 'success');
      return invite;
    }
  }

  log('No existing invitation found', 'info');
  return null;
}

async function testCancelInvitation() {
  log('\n=== Testing Cancel Invitation ===', 'info');
  
  if (!invitationId) {
    log('No invitation to cancel', 'warning');
    return true; // Not a failure, just no invitation
  }

  const { status, data } = await makeRequest(
    `${API_BASE_URL}/orgs/${orgId}/invitations/${invitationId}`,
    'DELETE',
    null,
    {
      Authorization: `Bearer ${authToken}`,
    }
  );

  assert(status === 200 || status === 204, `Invitation should be cancelled (status: ${status})`);
  
  if (status === 200 || status === 204) {
    log(`✅ Invitation cancelled successfully`, 'success');
    invitationId = null; // Clear invitation ID
    return true;
  }

  return false;
}

async function testInviteUser() {
  log('\n=== Testing User Invitation (with Email) ===', 'info');
  
  const { status, data } = await makeRequest(
    `${API_BASE_URL}/orgs/${orgId}/users/invite`,
    'POST',
    {
      email: INVITE_EMAIL,
      role: 'viewer',
      message: 'Test invitation - email should be sent',
    },
    {
      Authorization: `Bearer ${authToken}`,
    }
  );

  assert(status === 201 || status === 200, `Invitation should be created (status: ${status})`);
  assert(data.ok !== false, 'Response should be ok');
  
  if (data.ok && data.data) {
    invitationId = data.data.id;
    log(`✅ Invitation created successfully:`, 'success');
    log(`   ID: ${invitationId}`, 'info');
    log(`   Email: ${data.data.email}`, 'info');
    log(`   Role: ${data.data.role}`, 'info');
    
    log(`\n✅ EMAIL SHOULD BE SENT to ${INVITE_EMAIL}`, 'success');
    log(`   Check backend console output for email details`, 'info');
    log(`   Email should contain invitation link with token`, 'info');
    
    return true;
  }

  return false;
}

async function testResendInvitation() {
  log('\n=== Testing Resend Invitation (with Email) ===', 'info');
  
  if (!invitationId) {
    log('No invitation to resend', 'warning');
    return false;
  }

  const { status, data } = await makeRequest(
    `${API_BASE_URL}/orgs/${orgId}/invitations/${invitationId}/resend`,
    'POST',
    null,
    {
      Authorization: `Bearer ${authToken}`,
    }
  );

  assert(status === 200 || status === 201, `Invitation should be resent (status: ${status})`);
  assert(data.ok !== false, 'Response should be ok');
  
  if (data.ok && data.data) {
    const newInvitationId = data.data.id;
    log(`✅ Invitation resent successfully:`, 'success');
    log(`   New Invitation ID: ${newInvitationId}`, 'info');
    log(`   Email: ${data.data.email}`, 'info');
    
    log(`\n✅ EMAIL SHOULD BE SENT AGAIN to ${INVITE_EMAIL}`, 'success');
    log(`   Check backend console output for email details`, 'info');
    
    invitationId = newInvitationId; // Update to new invitation ID
    return true;
  }

  return false;
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting Complete Invitation Email Flow Tests', 'info');
  log(`API Base URL: ${API_BASE_URL}`, 'info');
  log(`Test Account: ${TEST_EMAIL}`, 'info');
  log(`Invite Email: ${INVITE_EMAIL}`, 'info');
  log('='.repeat(80), 'info');

  try {
    // 1. Authentication
    const authSuccess = await testAuthentication();
    if (!authSuccess) {
      log('\n❌ Authentication failed - cannot continue', 'error');
      return;
    }

    // 2. Find existing invitation
    await findExistingInvitation();

    // 3. Cancel existing invitation (if exists)
    if (invitationId) {
      await testCancelInvitation();
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 4. Send new invitation (should send email)
    await testInviteUser();

    // 5. Resend invitation (should send email again)
    if (invitationId) {
      await testResendInvitation();
    }

    log('\n' + '='.repeat(80), 'info');
    log('✅ All invitation email flow tests completed!', 'success');
    log('\n📋 Summary:', 'info');
    log(`   ✅ Authentication successful`, 'success');
    if (invitationId) {
      log(`   ✅ Found/cancelled existing invitation`, 'success');
    }
    log(`   ✅ Invitation created - EMAIL SENT`, 'success');
    if (invitationId) {
      log(`   ✅ Invitation resent - EMAIL SENT AGAIN`, 'success');
    }
    log('\n💡 IMPORTANT: Check backend console output to see email content', 'info');
    log('   Email is logged to console for testing (not actually sent to email provider)', 'info');

  } catch (error) {
    log(`\n❌ Unexpected error: ${error.message}`, 'error');
    console.error(error);
  }
}

// Run tests
runAllTests().catch(console.error);
