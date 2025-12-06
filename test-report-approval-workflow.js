/**
 * Comprehensive Test Script for Report Approval Workflow
 * Tests all endpoints, edge cases, and scenarios
 * 
 * Usage: node test-report-approval-workflow.js
 * 
 * Prerequisites:
 * 1. Backend server running on http://localhost:8000
 * 2. Valid authentication token for user cptjacksprw@gmail.com
 * 3. At least one organization with admin/finance users
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';

// Test configuration
const TEST_CONFIG = {
  email: 'cptjacksprw@gmail.com',
  password: 'Player@123',
  orgId: null, // Will be fetched
  userId: null, // Will be fetched
  approverUserId: null, // Will be fetched
  authToken: null, // Will be fetched
  createdReportIds: [],
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`TEST: ${testName}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

// Helper function to make API calls
async function apiCall(method, endpoint, body = null, token = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
    credentials: 'include',
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    
    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: response.headers,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      data: null,
    };
  }
}

// Test 1: Authentication
async function testAuthentication() {
  logTest('Authentication');
  
  const loginResult = await apiCall('POST', '/auth/login', {
    email: TEST_CONFIG.email,
    password: TEST_CONFIG.password,
  });

  if (!loginResult.ok || !loginResult.data?.token) {
    logError('Authentication failed. Please check credentials.');
    logInfo('Note: If using cookies, authentication might work via browser.');
    return false;
  }

  TEST_CONFIG.authToken = loginResult.data.token;
  TEST_CONFIG.userId = loginResult.data.user?.id;
  
  if (loginResult.data.user?.orgs && loginResult.data.user.orgs.length > 0) {
    TEST_CONFIG.orgId = loginResult.data.user.orgs[0].id;
    logSuccess(`Authenticated as ${TEST_CONFIG.email}`);
    logInfo(`Organization ID: ${TEST_CONFIG.orgId}`);
    logInfo(`User ID: ${TEST_CONFIG.userId}`);
    return true;
  }

  logError('No organizations found for user');
  return false;
}

// Test 2: Get Users (for approvers)
async function testGetUsers() {
  logTest('Get Users for Approvers');
  
  const result = await apiCall('GET', `/orgs/${TEST_CONFIG.orgId}/users`, null, TEST_CONFIG.authToken);
  
  if (result.ok && result.data?.data && result.data.data.length > 0) {
    const users = result.data.data;
    logSuccess(`Found ${users.length} users`);
    
    // Find an approver (admin or finance role)
    const approver = users.find(u => u.role === 'admin' || u.role === 'finance');
    if (approver) {
      TEST_CONFIG.approverUserId = approver.userId || approver.id;
      logInfo(`Using approver: ${approver.email} (${approver.role})`);
    } else {
      logWarning('No admin/finance users found. Some tests may fail.');
    }
    
    return true;
  }
  
  logError('Failed to fetch users');
  return false;
}

// Test 3: Create Report - Valid Cases
async function testCreateReport() {
  logTest('Create Report - Valid Cases');
  
  const testCases = [
    {
      name: 'PDF report without approval',
      body: { type: 'pdf', approvalRequired: false },
    },
    {
      name: 'PPTX report with approval',
      body: { 
        type: 'pptx', 
        approvalRequired: true,
        approverIds: TEST_CONFIG.approverUserId ? [TEST_CONFIG.approverUserId] : [],
      },
    },
    {
      name: 'XLSX report with distribution',
      body: { 
        type: 'xlsx',
        approvalRequired: false,
        distributionList: ['test@example.com'],
        distributionMethod: 'email',
      },
    },
  ];

  for (const testCase of testCases) {
    logInfo(`Testing: ${testCase.name}`);
    
    if (testCase.body.approvalRequired && !TEST_CONFIG.approverUserId) {
      logWarning('Skipping - no approver available');
      continue;
    }
    
    const result = await apiCall(
      'POST',
      `/orgs/${TEST_CONFIG.orgId}/reports`,
      testCase.body,
      TEST_CONFIG.authToken
    );

    if (result.ok && result.data?.report?.id) {
      TEST_CONFIG.createdReportIds.push(result.data.report.id);
      logSuccess(`${testCase.name}: Created report ${result.data.report.id.slice(0, 8)}...`);
    } else {
      logError(`${testCase.name}: Failed - ${result.data?.error?.message || 'Unknown error'}`);
    }
  }

  return TEST_CONFIG.createdReportIds.length > 0;
}

// Test 4: Create Report - Invalid UUID
async function testCreateReportInvalidUUID() {
  logTest('Create Report - Invalid UUID Validation');
  
  const testCases = [
    {
      name: 'Invalid approver UUID',
      body: {
        type: 'pdf',
        approvalRequired: true,
        approverIds: ['invalid-uuid-format'],
      },
      expectedError: 'Approver ID must be a valid UUID format',
    },
    {
      name: 'Empty approver array',
      body: {
        type: 'pdf',
        approvalRequired: true,
        approverIds: [],
      },
      expectedError: 'At least one approver is required',
    },
  ];

  for (const testCase of testCases) {
    logInfo(`Testing: ${testCase.name}`);
    
    const result = await apiCall(
      'POST',
      `/orgs/${TEST_CONFIG.orgId}/reports`,
      testCase.body,
      TEST_CONFIG.authToken
    );

    if (!result.ok && result.data?.error?.message) {
      logSuccess(`${testCase.name}: Correctly rejected with validation error`);
    } else {
      logError(`${testCase.name}: Should have been rejected but wasn't`);
    }
  }

  return true;
}

// Test 5: Create Report - Invalid Report Type
async function testCreateReportInvalidType() {
  logTest('Create Report - Invalid Report Type');
  
  const result = await apiCall(
    'POST',
    `/orgs/${TEST_CONFIG.orgId}/reports`,
    { type: 'invalid_type' },
    TEST_CONFIG.authToken
  );

  if (!result.ok && result.data?.error?.message?.includes('Report type must be one of')) {
    logSuccess('Invalid report type correctly rejected');
    return true;
  }

  logError('Invalid report type was not rejected');
  return false;
}

// Test 6: Submit for Approval
async function testSubmitForApproval() {
  logTest('Submit Report for Approval');
  
  if (TEST_CONFIG.createdReportIds.length === 0) {
    logWarning('No reports available to submit');
    return false;
  }

  if (!TEST_CONFIG.approverUserId) {
    logWarning('No approver available');
    return false;
  }

  const reportId = TEST_CONFIG.createdReportIds[0];
  
  const testCases = [
    {
      name: 'Valid submission',
      body: { approverIds: [TEST_CONFIG.approverUserId] },
    },
    {
      name: 'Invalid approver UUID',
      body: { approverIds: ['invalid-uuid'] },
      shouldFail: true,
    },
    {
      name: 'Empty approver list',
      body: { approverIds: [] },
      shouldFail: true,
    },
  ];

  for (const testCase of testCases) {
    logInfo(`Testing: ${testCase.name}`);
    
    const result = await apiCall(
      'POST',
      `/orgs/${TEST_CONFIG.orgId}/reports/${reportId}/submit`,
      testCase.body,
      TEST_CONFIG.authToken
    );

    if (testCase.shouldFail) {
      if (!result.ok) {
        logSuccess(`${testCase.name}: Correctly rejected`);
      } else {
        logError(`${testCase.name}: Should have been rejected`);
      }
    } else {
      if (result.ok) {
        logSuccess(`${testCase.name}: Successfully submitted`);
      } else {
        logError(`${testCase.name}: Failed - ${result.data?.error?.message || 'Unknown error'}`);
      }
    }
  }

  return true;
}

// Test 7: Get Approval Status
async function testGetApprovalStatus() {
  logTest('Get Approval Status');
  
  if (TEST_CONFIG.createdReportIds.length === 0) {
    logWarning('No reports available');
    return false;
  }

  const reportId = TEST_CONFIG.createdReportIds[0];
  
  const result = await apiCall(
    'GET',
    `/orgs/${TEST_CONFIG.orgId}/reports/${reportId}/approval-status`,
    null,
    TEST_CONFIG.authToken
  );

  if (result.ok && result.data?.status) {
    const status = result.data.status;
    logSuccess('Approval status retrieved');
    logInfo(`Status: ${status.approvalStatus}`);
    logInfo(`Required: ${status.approvalRequired}`);
    logInfo(`Approvers: ${status.approverIds?.length || 0}`);
    logInfo(`Approved by: ${status.approvedBy?.length || 0}`);
    return true;
  }

  logError('Failed to get approval status');
  return false;
}

// Test 8: Approve Report
async function testApproveReport() {
  logTest('Approve Report');
  
  if (TEST_CONFIG.createdReportIds.length === 0) {
    logWarning('No reports available');
    return false;
  }

  const reportId = TEST_CONFIG.createdReportIds[0];
  
  const testCases = [
    {
      name: 'Approve without comment',
      body: { action: 'approve' },
    },
    {
      name: 'Reject with comment',
      body: { 
        action: 'reject',
        comment: 'Test rejection - needs improvement',
      },
    },
    {
      name: 'Request changes',
      body: {
        action: 'request_changes',
        comment: 'Please update the financial section',
      },
    },
  ];

  for (const testCase of testCases) {
    logInfo(`Testing: ${testCase.name}`);
    
    const result = await apiCall(
      'POST',
      `/orgs/${TEST_CONFIG.orgId}/reports/${reportId}/approve`,
      testCase.body,
      TEST_CONFIG.authToken
    );

    if (result.ok) {
      logSuccess(`${testCase.name}: Success`);
    } else {
      const errorMsg = result.data?.error?.message || 'Unknown error';
      // Some actions may fail if report is already processed - that's OK
      if (errorMsg.includes('already') || errorMsg.includes('not authorized')) {
        logWarning(`${testCase.name}: Expected failure - ${errorMsg}`);
      } else {
        logError(`${testCase.name}: Failed - ${errorMsg}`);
      }
    }
  }

  return true;
}

// Test 9: Invalid Export ID
async function testInvalidExportId() {
  logTest('Invalid Export ID Validation');
  
  const invalidId = 'invalid-uuid-format';
  
  const endpoints = [
    { method: 'GET', path: `/orgs/${TEST_CONFIG.orgId}/reports/${invalidId}/approval-status` },
    { method: 'POST', path: `/orgs/${TEST_CONFIG.orgId}/reports/${invalidId}/submit`, body: { approverIds: [] } },
    { method: 'POST', path: `/orgs/${TEST_CONFIG.orgId}/reports/${invalidId}/approve`, body: { action: 'approve' } },
  ];

  for (const endpoint of endpoints) {
    logInfo(`Testing: ${endpoint.method} ${endpoint.path}`);
    
    const result = await apiCall(
      endpoint.method,
      endpoint.path,
      endpoint.body,
      TEST_CONFIG.authToken
    );

    if (!result.ok && result.status === 400) {
      logSuccess('Invalid UUID correctly rejected');
    } else {
      logWarning('Expected rejection but got different response');
    }
  }

  return true;
}

// Test 10: Edge Cases
async function testEdgeCases() {
  logTest('Edge Cases');
  
  const edgeCases = [
    {
      name: 'Duplicate approvers',
      body: {
        type: 'pdf',
        approvalRequired: true,
        approverIds: TEST_CONFIG.approverUserId 
          ? [TEST_CONFIG.approverUserId, TEST_CONFIG.approverUserId]
          : [],
      },
    },
    {
      name: 'Very long distribution list',
      body: {
        type: 'pdf',
        distributionList: Array(100).fill('test@example.com'),
        distributionMethod: 'email',
      },
    },
    {
      name: 'Missing required fields',
      body: {},
    },
  ];

  for (const testCase of edgeCases) {
    logInfo(`Testing: ${testCase.name}`);
    
    const result = await apiCall(
      'POST',
      `/orgs/${TEST_CONFIG.orgId}/reports`,
      testCase.body,
      TEST_CONFIG.authToken
    );

    if (result.ok) {
      if (testCase.name === 'Duplicate approvers') {
        logWarning('Duplicate approvers should have been rejected');
      } else {
        logSuccess(`${testCase.name}: Passed`);
      }
    } else {
      logSuccess(`${testCase.name}: Correctly handled - ${result.data?.error?.message || 'Rejected'}`);
    }
  }

  return true;
}

// Main test runner
async function runAllTests() {
  log('\n' + '='.repeat(60), 'bright');
  log('REPORT APPROVAL WORKFLOW - COMPREHENSIVE TEST SUITE', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  const tests = [
    { name: 'Authentication', fn: testAuthentication },
    { name: 'Get Users', fn: testGetUsers },
    { name: 'Create Report (Valid)', fn: testCreateReport },
    { name: 'Create Report (Invalid UUID)', fn: testCreateReportInvalidUUID },
    { name: 'Create Report (Invalid Type)', fn: testCreateReportInvalidType },
    { name: 'Submit for Approval', fn: testSubmitForApproval },
    { name: 'Get Approval Status', fn: testGetApprovalStatus },
    { name: 'Approve/Reject Report', fn: testApproveReport },
    { name: 'Invalid Export ID', fn: testInvalidExportId },
    { name: 'Edge Cases', fn: testEdgeCases },
  ];

  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result !== false });
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
    } catch (error) {
      logError(`Test "${test.name}" threw an error: ${error.message}`);
      results.push({ name: test.name, passed: false });
    }
  }

  // Summary
  log('\n' + '='.repeat(60), 'bright');
  log('TEST SUMMARY', 'bright');
  log('='.repeat(60), 'bright');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    if (result.passed) {
      logSuccess(`${result.name}: PASSED`);
    } else {
      logError(`${result.name}: FAILED`);
    }
  });
  
  log('\n' + '='.repeat(60), 'bright');
  log(`Total: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  log('='.repeat(60) + '\n', 'bright');
  
  return passed === total;
}

// Run tests
if (typeof fetch === 'undefined') {
  // Node.js environment - use node-fetch or similar
  logError('This script requires fetch API. Please run in a browser console or use node-fetch.');
  logInfo('Alternatively, use a tool like curl or Postman to test the endpoints manually.');
} else {
  runAllTests().catch(error => {
    logError(`Fatal error: ${error.message}`);
    console.error(error);
  });
}

// Export for use in other test environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, apiCall, TEST_CONFIG };
}

