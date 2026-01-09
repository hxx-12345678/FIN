// QA Engineer - Real User Flow Testing
// Credentials: cptjacksprw@gmail.com / Player@123 / FINAPILOT

let fetch;
try {
  fetch = globalThis.fetch || require('node-fetch');
} catch (e) {
  console.error('❌ Install: npm install node-fetch@2');
  process.exit(1);
}

const API = 'http://localhost:8000/api/v1';
const ADMIN_CREDENTIALS = {
  email: 'cptjacksprw@gmail.com',
  password: 'Player@123',
  company: 'FINAPILOT'
};

let adminToken, adminOrgId, adminUserId;
const testResults = {
  passed: [],
  failed: [],
  bugs: [],
  total: 0
};

function logTest(name, passed, message, details = null) {
  testResults.total++;
  const result = {
    test: name,
    passed,
    message,
    details,
    timestamp: new Date().toISOString()
  };
  
  if (passed) {
    testResults.passed.push(result);
    console.log(`✅ ${name}: ${message}`);
  } else {
    testResults.failed.push(result);
    console.log(`❌ ${name}: ${message}`);
    if (details) {
      console.log(`   Details:`, JSON.stringify(details, null, 2).substring(0, 500));
    }
  }
}

function logBug(whatBroke, steps, expected, actual, severity, suggestedFix) {
  testResults.bugs.push({
    whatBroke,
    steps,
    expected,
    actual,
    severity,
    suggestedFix,
    timestamp: new Date().toISOString()
  });
  console.log(`🐞 BUG: ${whatBroke}`);
  console.log(`   Severity: ${severity}`);
  console.log(`   Steps: ${steps}`);
  console.log(`   Expected: ${expected}`);
  console.log(`   Actual: ${actual}`);
  if (suggestedFix) {
    console.log(`   Fix: ${suggestedFix}`);
  }
}

async function api(method, path, body = null, token = null, timeout = 10000) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);
    
    const fetchPromise = fetch(`${API}${path}`, opts);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
    );
    
    const res = await Promise.race([fetchPromise, timeoutPromise]);
    const data = await res.json().catch(() => ({ error: 'Invalid JSON', status: res.status }));
    return { status: res.status, ok: res.ok, data };
  } catch (e) {
    return { status: 0, ok: false, error: e.message };
  }
}

async function runQATests() {
  console.log('='.repeat(80));
  console.log('QA ENGINEER - REAL USER FLOW TESTING');
  console.log(`Admin: ${ADMIN_CREDENTIALS.email}`);
  console.log(`Company: ${ADMIN_CREDENTIALS.company}`);
  console.log('='.repeat(80));
  console.log('');

  // ============================================
  // PART 1: ADMIN USER FLOW
  // ============================================
  console.log('🔐 PART 1: ADMIN USER FLOW');
  console.log('-'.repeat(80));

  // 1.1 Login as Admin
  console.log('1.1 Logging in as admin...');
  const login = await api('POST', '/auth/login', ADMIN_CREDENTIALS, null);
  if (login.ok && login.data.token) {
    adminToken = login.data.token;
    adminUserId = login.data.user?.id;
    adminOrgId = login.data.user?.orgs?.[0]?.id || login.data.orgs?.[0]?.id;
    
    // If orgId not in login response, get it from /auth/me
    if (!adminOrgId) {
      const me = await api('GET', '/auth/me', null, adminToken);
      if (me.ok && me.data.orgs?.[0]?.id) {
        adminOrgId = me.data.orgs[0].id;
      }
    }
    
    logTest('1.1 Admin Login', true, `Token received, Org: ${adminOrgId || 'N/A'}`);
    
    if (!adminOrgId) {
      logBug(
        'OrgId not available after login',
        '1. POST /auth/login 2. GET /auth/me',
        'Should return orgId in login response or /auth/me',
        'orgId is null/undefined',
        'HIGH',
        'Ensure login response includes orgId or verify /auth/me returns orgs'
      );
    }
  } else {
    logTest('1.1 Admin Login', false, 'Failed', login.data);
    logBug(
      'Admin login failed',
      '1. POST /auth/login with admin credentials',
      'Should receive token and orgId',
      `Status: ${login.status}, Error: ${JSON.stringify(login.data)}`,
      'CRITICAL',
      'Check authentication service and database connection'
    );
    return testResults;
  }

  // 1.2 Verify Dashboard Loads
  console.log('1.2 Verifying dashboard loads...');
  if (adminOrgId) {
    const overview = await api('GET', `/orgs/${adminOrgId}/overview`, null, adminToken);
    logTest('1.2 Dashboard Loads', overview.ok, overview.ok ? 'Dashboard data retrieved' : `Status: ${overview.status}`);
    
    if (!overview.ok) {
      logBug(
        'Dashboard fails to load',
        '1. Login as admin 2. GET /orgs/:id/overview',
        'Should return dashboard data',
        `Status: ${overview.status}`,
        'HIGH',
        'Check overview dashboard service'
      );
    }
  } else {
    logTest('1.2 Dashboard Loads', false, 'No orgId available');
  }

  // 1.3 Verify Company Name
  console.log('1.3 Verifying company name...');
  if (adminOrgId) {
    const org = await api('GET', `/orgs/${adminOrgId}`, null, adminToken);
    if (org.ok) {
      const companyNameCorrect = org.data.name === ADMIN_CREDENTIALS.company;
      logTest('1.3 Company Name', companyNameCorrect, 
        companyNameCorrect ? `Company: ${org.data.name}` : `Expected: ${ADMIN_CREDENTIALS.company}, Got: ${org.data.name}`);
      
      if (!companyNameCorrect) {
        logBug(
          'Company name mismatch',
          '1. Login as admin 2. GET /orgs/:id',
          `Company name should be "${ADMIN_CREDENTIALS.company}"`,
          `Got: "${org.data.name}"`,
          'MEDIUM',
          'Verify org creation and name assignment'
        );
      }
    } else {
      logTest('1.3 Company Name', false, `Failed to get org: ${org.status}`);
    }
  }

  // 1.4 Test Org Switch (if multiple orgs)
  console.log('1.4 Testing org switch...');
  const me = await api('GET', '/auth/me', null, adminToken);
  if (me.ok && me.data.orgs) {
    const orgCount = me.data.orgs.length;
    logTest('1.4 Org Switch Available', orgCount > 0, `${orgCount} organization(s) available`);
    // Note: Actual org switching would require UI testing
  }

  // 1.5 Invite Users
  console.log('1.5 Testing user invitations...');
  const testEmails = {
    viewer: `viewer-${Date.now()}@test.com`,
    finance: `finance-${Date.now()}@test.com`,
    admin: `admin-${Date.now()}@test.com`
  };

  for (const [role, email] of Object.entries(testEmails)) {
    if (adminOrgId) {
      const invite = await api('POST', `/orgs/${adminOrgId}/invite`, { email, role }, adminToken);
      if (invite.ok) {
        logTest(`1.5 Invite ${role}`, true, `Invite sent to ${email}`);
      } else {
        logTest(`1.5 Invite ${role}`, false, `Status: ${invite.status}`, invite.data);
        logBug(
          `Failed to invite ${role} user`,
          `1. Login as admin 2. POST /orgs/:id/invite with email and role=${role}`,
          'Should create invitation token',
          `Status: ${invite.status}, Error: ${JSON.stringify(invite.data)}`,
          'HIGH',
          'Check invite service and email sending'
        );
      }
    }
  }

  console.log('');

  // ============================================
  // PART 2: INVITED USER FLOW
  // ============================================
  console.log('👤 PART 2: INVITED USER FLOW');
  console.log('-'.repeat(80));
  console.log('⚠️  Note: Invited user flow requires manual testing with invite tokens');
  console.log('   This would require:');
  console.log('   1. Opening invite link');
  console.log('   2. Completing signup');
  console.log('   3. Logging in');
  console.log('   4. Verifying same org and data visibility');
  console.log('');

  // ============================================
  // PART 3: NEW SIGNUP (SAME COMPANY, NOT INVITED)
  // ============================================
  console.log('🧪 PART 3: NEW SIGNUP (SAME COMPANY, NOT INVITED)');
  console.log('-'.repeat(80));

  // 3.1 Test signup with same company domain
  const sameDomainEmail = `newuser-${Date.now()}@gmail.com`; // Same domain as admin
  console.log(`3.1 Testing signup with same domain: ${sameDomainEmail}`);
  
  const signup = await api('POST', '/auth/signup', {
    email: sameDomainEmail,
    password: 'Test123!',
    orgName: 'Test Org',
    name: 'Test User'
  }, null);

  if (signup.ok) {
    // Check if access request was created
    if (signup.data.requiresAccessRequest || signup.data.accessRequest) {
      logTest('3.1 Access Request Created', true, 'System detected same domain and created access request');
      
      // 3.2 Admin should see access request
      if (adminOrgId) {
        const accessReqs = await api('GET', `/orgs/${adminOrgId}/access-requests`, null, adminToken);
        if (accessReqs.ok) {
          const reqs = Array.isArray(accessReqs.data.requests) ? accessReqs.data.requests : [];
          const foundRequest = reqs.find(r => r.email === sameDomainEmail);
          logTest('3.2 Admin Sees Access Request', foundRequest !== undefined, 
            foundRequest ? 'Access request visible to admin' : 'Access request not found');
          
          if (foundRequest && foundRequest.status === 'pending') {
            // 3.3 Admin approves request
            const approve = await api('POST', `/orgs/${adminOrgId}/access-requests/${foundRequest.id}/approve`, 
              { role: 'viewer' }, adminToken);
            logTest('3.3 Admin Approves Request', approve.ok, 
              approve.ok ? 'Access request approved' : `Status: ${approve.status}`);
          }
        }
      }
    } else {
      logTest('3.1 Access Request Created', false, 'User was auto-added instead of creating access request');
      logBug(
        'Auto-join without access request',
        `1. Signup with email ${sameDomainEmail} (same domain as existing org)`,
        'Should create access request, not auto-add user',
        'User was directly added to org',
        'HIGH',
        'Verify domain-based access control logic in auth.service.ts'
      );
    }
  } else {
    logTest('3.1 Signup Test', false, `Status: ${signup.status}`, signup.data);
  }

  console.log('');

  // ============================================
  // PART 4: SECURITY VALIDATION
  // ============================================
  console.log('🔒 PART 4: SECURITY VALIDATION');
  console.log('-'.repeat(80));

  // 4.1 Access org without token
  if (adminOrgId) {
    const noToken = await api('GET', `/orgs/${adminOrgId}`, null, null);
    logTest('4.1 No Token Access', noToken.status === 401, 
      noToken.status === 401 ? 'Correctly rejected' : `Status: ${noToken.status}`);
    
    if (noToken.status !== 401) {
      logBug(
        'Unauthorized access allowed',
        '1. GET /orgs/:id without authentication token',
        'Should return 401 Unauthorized',
        `Status: ${noToken.status}`,
        'CRITICAL',
        'Verify authentication middleware is applied to all org routes'
      );
    }
  }

  // 4.2 Access admin endpoints as non-admin (would need viewer token)
  // This requires creating a viewer user first, which is complex
  console.log('4.2 Admin endpoint access test requires viewer user token');
  console.log('   (Skipping - requires invited user flow)');

  // 4.3 Invalid token
  const invalidToken = await api('GET', '/auth/me', null, 'invalid-token-123');
  logTest('4.3 Invalid Token', invalidToken.status === 401, 
    invalidToken.status === 401 ? 'Correctly rejected' : `Status: ${invalidToken.status}`);

  console.log('');

  // ============================================
  // PART 5: DATA SHARING VALIDATION
  // ============================================
  console.log('🔁 PART 5: DATA SHARING VALIDATION');
  console.log('-'.repeat(80));
  console.log('⚠️  Note: Full data sharing test requires multiple user sessions');
  console.log('   Testing data visibility from admin perspective...');

  if (adminOrgId) {
    // 5.1 Check transactions
    const txs = await api('GET', `/orgs/${adminOrgId}/transactions?limit=10`, null, adminToken);
    logTest('5.1 Transactions Visible', txs.ok, 
      txs.ok ? `${Array.isArray(txs.data.transactions) ? txs.data.transactions.length : 0} transactions` : `Status: ${txs.status}`);

    // 5.2 Check models
    const models = await api('GET', `/orgs/${adminOrgId}/models`, null, adminToken);
    if (models.ok) {
      const modelCount = Array.isArray(models.data.models) ? models.data.models.length : 0;
      logTest('5.2 Models Visible', true, `${modelCount} models`);
    } else {
      logTest('5.2 Models Visible', false, `Status: ${models.status}`);
    }

    // 5.3 Check dashboards
    const dashboard = await api('GET', `/orgs/${adminOrgId}/overview`, null, adminToken);
    logTest('5.3 Dashboard Data Visible', dashboard.ok, dashboard.ok ? 'Dashboard data available' : `Status: ${dashboard.status}`);
  }

  console.log('');

  // ============================================
  // PART 6: LOGOUT / SESSION HANDLING
  // ============================================
  console.log('📌 PART 6: LOGOUT / SESSION HANDLING');
  console.log('-'.repeat(80));

  // 6.1 Test logout (if endpoint exists)
  const logout = await api('POST', '/auth/logout', null, adminToken);
  if (logout.ok || logout.status === 404) {
    logTest('6.1 Logout Endpoint', logout.ok, 
      logout.ok ? 'Logout successful' : 'Logout endpoint not implemented (404)');
    
    if (logout.status === 404) {
      logBug(
        'Logout endpoint missing',
        '1. POST /auth/logout',
        'Should invalidate token and clear session',
        'Endpoint returns 404',
        'MEDIUM',
        'Implement logout endpoint to invalidate tokens'
      );
    }
  }

  // 6.2 Test token after logout
  // Note: Most JWT systems don't invalidate tokens on logout (stateless)
  // Token invalidation requires token blacklisting or refresh token revocation
  if (logout.ok) {
    const afterLogout = await api('GET', '/auth/me', null, adminToken);
    // JWT tokens are stateless, so they remain valid until expiry
    // This is expected behavior unless token blacklisting is implemented
    if (afterLogout.status === 200) {
      logTest('6.2 Token Status After Logout', true, 'Token still valid (stateless JWT - expected)');
      logBug(
        'Token not invalidated on logout',
        '1. Login 2. POST /auth/logout 3. GET /auth/me with same token',
        'Token should be invalidated or blacklisted',
        'Token remains valid (stateless JWT)',
        'MEDIUM',
        'Implement token blacklisting or refresh token revocation on logout'
      );
    } else {
      logTest('6.2 Token Status After Logout', afterLogout.status === 401, 
        afterLogout.status === 401 ? 'Token correctly invalidated' : `Status: ${afterLogout.status}`);
    }
  } else {
    console.log('6.2 Skipping - logout endpoint not available');
  }

  console.log('');

  // ============================================
  // SUMMARY
  // ============================================
  console.log('='.repeat(80));
  console.log('QA TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`🐞 Bugs Found: ${testResults.bugs.length}`);
  const successRate = testResults.total > 0 ? ((testResults.passed.length / testResults.total) * 100).toFixed(1) : 0;
  console.log(`Success Rate: ${successRate}%`);
  console.log('');

  if (testResults.failed.length > 0) {
    console.log('FAILED TESTS:');
    testResults.failed.forEach(r => {
      console.log(`  ❌ ${r.test}: ${r.message}`);
    });
    console.log('');
  }

  if (testResults.bugs.length > 0) {
    console.log('🐞 BUGS FOUND:');
    testResults.bugs.forEach((bug, idx) => {
      console.log(`\n${idx + 1}. ${bug.whatBroke}`);
      console.log(`   Severity: ${bug.severity}`);
      console.log(`   Steps: ${bug.steps}`);
      console.log(`   Expected: ${bug.expected}`);
      console.log(`   Actual: ${bug.actual}`);
      if (bug.suggestedFix) {
        console.log(`   Fix: ${bug.suggestedFix}`);
      }
    });
    console.log('');
  }

  console.log('='.repeat(80));
  return testResults;
}

// Run tests
runQATests()
  .then(results => {
    const exitCode = (results.failed.length > 0 || results.bugs.length > 0) ? 1 : 0;
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  });

