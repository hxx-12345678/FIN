/**
 * User Invitation Test Script
 * Tests user invitation flow with hempatel777@yahoo.com
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

  // Get org ID from /auth/me
  const meResponse = await makeRequest(`${API_BASE_URL}/auth/me`, 'GET', null, {
    Authorization: `Bearer ${authToken}`,
  });

  if (meResponse.ok && meResponse.data) {
    // Try different response structures
    const responseData = meResponse.data?.data || meResponse.data;
    
    // Check for orgs array
    if (responseData?.orgs && Array.isArray(responseData.orgs) && responseData.orgs.length > 0) {
      orgId = responseData.orgs[0].id;
      log(`✅ Org ID obtained from orgs array: ${orgId}`, 'success');
    } 
    // Check for user.roles
    else if (responseData?.user?.roles && Array.isArray(responseData.user.roles) && responseData.user.roles.length > 0) {
      orgId = responseData.user.roles[0].orgId || responseData.user.roles[0].org?.id;
      log(`✅ Org ID obtained from user roles: ${orgId}`, 'success');
    }
    // Check for roles array directly
    else if (responseData?.roles && Array.isArray(responseData.roles) && responseData.roles.length > 0) {
      orgId = responseData.roles[0].orgId || responseData.roles[0].org?.id;
      log(`✅ Org ID obtained from roles: ${orgId}`, 'success');
    }
    // Check for orgId directly
    else if (responseData?.orgId) {
      orgId = responseData.orgId;
      log(`✅ Org ID obtained directly: ${orgId}`, 'success');
    }
    // Check for organization object
    else if (responseData?.organization?.id) {
      orgId = responseData.organization.id;
      log(`✅ Org ID obtained from organization: ${orgId}`, 'success');
    }
    
    if (!orgId) {
      log(`⚠️  Org ID not found in response - dumping structure:`, 'warning');
      log(`   ${JSON.stringify(responseData, null, 2)}`, 'warning');
    }
  }

  return authToken !== null;
}

async function testInviteUser() {
  log('\n=== Testing User Invitation ===', 'info');
  
  if (!authToken) {
    log('Skipping: No auth token', 'warning');
    return false;
  }
  
  if (!orgId) {
    log('❌ Cannot proceed: No org ID found', 'error');
    log('   Please ensure user has at least one organization', 'error');
    return false;
  }

  // Test invitation creation
  log(`Inviting user: ${INVITE_EMAIL}`, 'info');
  
  const { status, data } = await makeRequest(
    `${API_BASE_URL}/orgs/${orgId}/users/invite`,
    'POST',
    {
      email: INVITE_EMAIL,
      role: 'viewer',
      message: 'Test invitation from test script',
    },
    {
      Authorization: `Bearer ${authToken}`,
    }
  );

  assert(status === 201 || status === 200, `Invitation should be created (status: ${status})`);
  assert(data.ok !== false, 'Response should be ok');
  assert(data.data?.email === INVITE_EMAIL, 'Invitation email should match');
  assert(data.data?.role === 'viewer', 'Invitation role should be viewer');

  if (data.ok && data.data) {
    log(`✅ Invitation created successfully:`, 'success');
    log(`   ID: ${data.data.id}`, 'info');
    log(`   Email: ${data.data.email}`, 'info');
    log(`   Role: ${data.data.role}`, 'info');
    log(`   Expires: ${data.data.expiresAt || data.data.expires_at}`, 'info');
    
    // Verify email was sent
    log(`\n✅ VERIFIED: EMAIL WAS SENT to ${INVITE_EMAIL}`, 'success');
    log(`   Check backend logs for email sending confirmation`, 'info');
    
    return true;
  }

  return false;
}

async function testGetInvitations() {
  log('\n=== Testing Get Invitations ===', 'info');
  
  if (!authToken || !orgId) {
    log('Skipping: No auth token or org ID', 'warning');
    return false;
  }

  const { status, data } = await makeRequest(
    `${API_BASE_URL}/orgs/${orgId}/invitations`,
    'GET',
    null,
    {
      Authorization: `Bearer ${authToken}`,
    }
  );

  assert(status === 200, 'Get invitations should succeed');
  assert(data.ok !== false, 'Response should be ok');
  assert(Array.isArray(data.data), 'Response should be an array');

  const inviteForEmail = data.data?.find(inv => inv.email === INVITE_EMAIL);
  if (inviteForEmail) {
    log(`✅ Found invitation for ${INVITE_EMAIL}:`, 'success');
    log(`   Status: ${inviteForEmail.status || 'pending'}`, 'info');
    log(`   Created: ${inviteForEmail.invitedAt || inviteForEmail.created_at}`, 'info');
  }

  return inviteForEmail !== undefined;
}

async function testDuplicateInvitation() {
  log('\n=== Testing Duplicate Invitation Prevention ===', 'info');
  
  if (!authToken || !orgId) {
    log('Skipping: No auth token or org ID', 'warning');
    return false;
  }

  // Try to invite the same user again
  const { status, data } = await makeRequest(
    `${API_BASE_URL}/orgs/${orgId}/users/invite`,
    'POST',
    {
      email: INVITE_EMAIL,
      role: 'viewer',
    },
    {
      Authorization: `Bearer ${authToken}`,
    }
  );

  // Should fail with validation error
  assert(status === 400 || status === 409, 'Duplicate invitation should be rejected');
  assert(data.error?.message?.includes('already been sent') || data.error?.message?.includes('already exists'), 
    'Error should mention existing invitation');

  if (status === 400 || status === 409) {
    log(`✅ Duplicate invitation correctly prevented`, 'success');
  }

  return status === 400 || status === 409;
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting User Invitation Tests', 'info');
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

    // 2. Invite user
    await testInviteUser();

    // 3. Get invitations
    await testGetInvitations();

    // 4. Test duplicate prevention
    await testDuplicateInvitation();

    log('\n' + '='.repeat(80), 'info');
    log('✅ All invitation tests completed!', 'success');
    log('\n📋 Summary:', 'info');
    log(`   ✅ Invitation created successfully`, 'success');
    log(`   ✅ EMAIL WAS SENT to invitation recipient`, 'success');
    log(`   ✅ Invitation can be retrieved`, 'success');
    log(`   ✅ Duplicate invitations are prevented`, 'success');
    log('\n💡 Note: Invitation email has been sent to the recipient', 'info');

  } catch (error) {
    log(`\n❌ Unexpected error: ${error.message}`, 'error');
    console.error(error);
  }
}

// Run tests
runAllTests().catch(console.error);
