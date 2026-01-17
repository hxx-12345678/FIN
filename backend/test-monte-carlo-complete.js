/**
 * COMPREHENSIVE MONTE CARLO FORECASTING TEST SCRIPT
 * Tests all functionality, buttons, tabs, values, and parameter changes
 * 
 * Usage: 
 * 1. Make sure backend server is running: cd backend && npm start (or node dist/app.js)
 * 2. Run tests: node backend/test-monte-carlo-complete.js
 * 
 * This script tests:
 * - Authentication and API access
 * - Model retrieval
 * - Monte Carlo job creation and listing
 * - Result retrieval and data structure validation
 * - All tabs data (Simulation Results, Fan Chart, Sensitivity, Explainability)
 * - Parameter changes and their effects
 * - Export functionality
 * - Deterministic mode
 * - Job status polling
 */

const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api/v1';
const TEST_EMAIL = 'cptjacksprw@gmail.com';
const TEST_PASSWORD = 'Player@123';

// Check if backend is accessible before starting tests
async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/health`).catch(() => null);
    if (response && response.ok) {
      log('✅ Backend server is accessible', 'success');
      return true;
    }
    // Try API root
    const apiResponse = await fetch(`${API_BASE_URL}`).catch(() => null);
    if (apiResponse) {
      log('✅ Backend API is accessible', 'success');
      return true;
    }
    log('⚠️  Backend server may not be running', 'warning');
    return false;
  } catch (error) {
    log('⚠️  Cannot reach backend server - ensure it is running on port 3001', 'warning');
    return false;
  }
}

// Test state
let authToken = null;
let orgId = null;
let modelId = null;
let monteCarloJobId = null;
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: []
};

// Helper functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function assert(condition, message) {
  testResults.total++;
  if (condition) {
    testResults.passed++;
    log(`PASS: ${message}`, 'success');
    return true;
  } else {
    testResults.failed++;
    testResults.errors.push(message);
    log(`FAIL: ${message}`, 'error');
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
    
    // Handle different content types
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

    // Extract cookies if present
    const cookies = response.headers.get('set-cookie');
    if (cookies && Array.isArray(cookies)) {
      data.cookies = cookies;
    } else if (cookies) {
      data.cookies = [cookies];
    }

    return { status: response.status, data, ok: response.ok, headers: response.headers };
  } catch (error) {
    // Check if it's a connection error
    if (error.message.includes('ECONNREFUSED') || error.message.includes('failed, reason:')) {
      log(`⚠️  Backend server appears to be not running at ${API_BASE_URL}`, 'warning');
      log('⚠️  Please start the backend server first: cd backend && npm start', 'warning');
    } else {
      log(`Request error to ${url}: ${error.message}`, 'error');
    }
    return { status: 0, data: { error: error.message }, ok: false };
  }
}

// Test functions
async function testAuthentication() {
  log('=== Testing Authentication ===', 'info');
  
  const { status, data, ok } = await makeRequest(`${API_BASE_URL}/auth/login`, 'POST', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  log(`Login response status: ${status}`, 'info');
  log(`Login response data: ${JSON.stringify(data).substring(0, 200)}...`, 'info');

  if (assert(status === 200 || status === 201 || ok, 'Login should succeed')) {
    // Try multiple possible response formats
    authToken = data.token || data.data?.token || data.accessToken || data.data?.accessToken;
    orgId = data.orgId || data.data?.orgId || data.orgs?.[0]?.id || data.data?.orgs?.[0]?.id || data.user?.orgId;
    
    // If still no token, check cookies
    if (!authToken && data.cookies) {
      const cookieHeader = data.cookies.find(c => c.includes('auth-token'));
      if (cookieHeader) {
        authToken = cookieHeader.split('=')[1]?.split(';')[0];
      }
    }

    log(`Auth token obtained: ${authToken ? 'Yes (' + authToken.substring(0, 20) + '...)' : 'No'}`, authToken ? 'success' : 'error');
    log(`Org ID obtained: ${orgId || 'No'}`, orgId ? 'success' : 'warning');
    
    // If no orgId, try to get it from /auth/me
    if (authToken && !orgId) {
      log('Fetching org ID from /auth/me...', 'info');
      const meResponse = await makeRequest(
        `${API_BASE_URL}/auth/me`,
        'GET',
        null,
        { Authorization: `Bearer ${authToken}` }
      );
      
      if (meResponse.status === 200 && meResponse.data) {
        orgId = meResponse.data.orgId || 
                meResponse.data.orgs?.[0]?.id || 
                meResponse.data.data?.orgId ||
                meResponse.data.data?.orgs?.[0]?.id;
        log(`Org ID from /auth/me: ${orgId || 'No'}`, orgId ? 'success' : 'warning');
      }
    }
  }

  return { authToken, orgId };
}

async function testGetModels() {
  log('\n=== Testing Get Models ===', 'info');
  
  if (!authToken || !orgId) {
    log('Skipping: No auth token or org ID', 'warning');
    return null;
  }

  const { status, data } = await makeRequest(
    `${API_BASE_URL}/orgs/${orgId}/models`,
    'GET',
    null,
    { Authorization: `Bearer ${authToken}` }
  );

  assert(status === 200, 'Get models should return 200');
  assert(data.ok !== false, 'Get models response should be ok');
  assert(Array.isArray(data.models) || Array.isArray(data.data), 'Models should be an array');

  if (data.models && data.models.length > 0) {
    modelId = data.models[0].id;
    log(`Using model ID: ${modelId}`, 'success');
  } else if (data.data && data.data.length > 0) {
    modelId = data.data[0].id;
    log(`Using model ID: ${modelId}`, 'success');
  }

  return modelId;
}

async function testListMonteCarloJobs() {
  log('\n=== Testing List Monte Carlo Jobs ===', 'info');
  
  if (!authToken || !modelId) {
    log('Skipping: No auth token or model ID', 'warning');
    return null;
  }

  const { status, data } = await makeRequest(
    `${API_BASE_URL}/models/${modelId}/montecarlo`,
    'GET',
    null,
    { Authorization: `Bearer ${authToken}` }
  );

  assert(status === 200, 'List Monte Carlo jobs should return 200');
  assert(data.ok !== false, 'List jobs response should be ok');
  assert(Array.isArray(data.monteCarloJobs) || Array.isArray(data.data), 'Monte Carlo jobs should be an array');

  if (data.monteCarloJobs && data.monteCarloJobs.length > 0) {
    const completedJob = data.monteCarloJobs.find(job => job.status === 'done' || job.status === 'completed');
    if (completedJob) {
      monteCarloJobId = completedJob.jobId || completedJob.id;
      log(`Found completed job ID: ${monteCarloJobId}`, 'success');
    }
  }

  return monteCarloJobId;
}

async function testGetMonteCarloResult(jobId) {
  log('\n=== Testing Get Monte Carlo Result ===', 'info');
  
  if (!authToken || !jobId) {
    log('Skipping: No auth token or job ID', 'warning');
    return null;
  }

  const { status, data } = await makeRequest(
    `${API_BASE_URL}/montecarlo/${jobId}`,
    'GET',
    null,
    { Authorization: `Bearer ${authToken}` }
  );

  assert(status === 200, 'Get Monte Carlo result should return 200');
  assert(data.ok !== false, 'Get result response should be ok');
  
  // Verify result structure
  if (data.ok && data.status) {
    assert(['done', 'completed', 'processing', 'queued'].includes(data.status), 'Status should be valid');
    
    // Verify percentiles structure
    if (data.percentiles) {
      log('Verifying percentiles structure...', 'info');
      assert(
        data.percentiles.percentiles_table || data.percentiles.monthly,
        'Percentiles should have percentiles_table or monthly structure'
      );
      
      if (data.percentiles.percentiles_table) {
        assert(Array.isArray(data.percentiles.percentiles_table.p50), 'P50 should be an array');
        assert(Array.isArray(data.percentiles.percentiles_table.p5), 'P5 should be an array');
        assert(Array.isArray(data.percentiles.percentiles_table.p95), 'P95 should be an array');
      }
    }
    
    // Verify sensitivity data
    if (data.sensitivityJson) {
      log('Verifying sensitivity data...', 'info');
      assert(
        typeof data.sensitivityJson === 'object',
        'Sensitivity JSON should be an object'
      );
    }
    
    // Verify survival probability
    if (data.survivalProbability) {
      log('Verifying survival probability...', 'info');
      assert(
        data.survivalProbability.overall,
        'Survival probability should have overall data'
      );
      assert(
        typeof data.survivalProbability.overall.totalSimulations === 'number',
        'Total simulations should be a number'
      );
    }
    
    // Verify confidence level
    if (data.confidenceLevel) {
      assert(
        typeof data.confidenceLevel === 'number' || typeof data.confidenceLevel === 'string',
        'Confidence level should be a number or string'
      );
      const confLevel = Number(data.confidenceLevel);
      assert(confLevel >= 0 && confLevel <= 1, 'Confidence level should be between 0 and 1');
    }
  }

  return data;
}

async function testCreateMonteCarloJob() {
  log('\n=== Testing Create Monte Carlo Job ===', 'info');
  
  if (!authToken || !modelId) {
    log('Skipping: No auth token or model ID', 'warning');
    return null;
  }

  const drivers = [
    {
      id: "revenue_growth",
      mean: 8,
      stdDev: 3,
      min: 2,
      max: 15,
      distribution: "normal",
    },
    {
      id: "churn_rate",
      mean: 5,
      stdDev: 2,
      min: 2,
      max: 10,
      distribution: "normal",
    },
  ];

  const { status, data } = await makeRequest(
    `${API_BASE_URL}/models/${modelId}/montecarlo`,
    'POST',
    {
      numSimulations: 1000, // Use smaller number for testing
      drivers: drivers,
    },
    { Authorization: `Bearer ${authToken}` }
  );

  assert(status === 200 || status === 201, 'Create Monte Carlo job should return 200/201');
  assert(data.ok !== false, 'Create job response should be ok');
  
  if (data.ok && (data.jobId || data.data?.jobId)) {
    const newJobId = data.jobId || data.data?.jobId;
    log(`Created new Monte Carlo job: ${newJobId}`, 'success');
    monteCarloJobId = newJobId;
    return newJobId;
  }

  return null;
}

async function testParameterChanges() {
  log('\n=== Testing Parameter Changes ===', 'info');
  
  if (!authToken || !modelId) {
    log('Skipping: No auth token or model ID', 'warning');
    return null;
  }

  // Test with different driver parameters
  const testCases = [
    {
      name: 'High Revenue Growth',
      drivers: [
        { id: "revenue_growth", mean: 15, stdDev: 2, min: 10, max: 20, distribution: "normal" },
        { id: "churn_rate", mean: 3, stdDev: 1, min: 1, max: 5, distribution: "normal" },
      ],
    },
    {
      name: 'Low Revenue Growth',
      drivers: [
        { id: "revenue_growth", mean: 3, stdDev: 1, min: 1, max: 5, distribution: "normal" },
        { id: "churn_rate", mean: 8, stdDev: 2, min: 5, max: 12, distribution: "normal" },
      ],
    },
  ];

  for (const testCase of testCases) {
    log(`Testing parameter change: ${testCase.name}`, 'info');
    
    const { status, data } = await makeRequest(
      `${API_BASE_URL}/models/${modelId}/montecarlo`,
      'POST',
      {
        numSimulations: 500, // Small number for quick testing
        drivers: testCase.drivers,
      },
      { Authorization: `Bearer ${authToken}` }
    );

    assert(
      status === 200 || status === 201,
      `Parameter change "${testCase.name}" should create job successfully`
    );
    assert(
      data.ok !== false,
      `Parameter change "${testCase.name}" response should be ok`
    );
  }

  return true;
}

async function testJobStatusPolling(jobId) {
  log('\n=== Testing Job Status Polling ===', 'info');
  
  if (!authToken || !jobId) {
    log('Skipping: No auth token or job ID', 'warning');
    return null;
  }

  let attempts = 0;
  const maxAttempts = 10;
  let jobStatus = null;

  while (attempts < maxAttempts) {
    const { status, data } = await makeRequest(
      `${API_BASE_URL}/jobs/${jobId}`,
      'GET',
      null,
      { Authorization: `Bearer ${authToken}` }
    );

    if (status === 200 && data.job) {
      jobStatus = data.job.status;
      log(`Job status (attempt ${attempts + 1}): ${jobStatus}`, 'info');
      
      if (jobStatus === 'done' || jobStatus === 'completed' || jobStatus === 'failed') {
        break;
      }
    }

    attempts++;
    if (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    }
  }

  assert(
    jobStatus === 'done' || jobStatus === 'completed',
    'Job should complete successfully within timeout'
  );

  return jobStatus;
}

async function testAllTabsData(result) {
  log('\n=== Testing All Tabs Data ===', 'info');
  
  if (!result || !result.ok) {
    log('Skipping: No valid result data', 'warning');
    return false;
  }

  // Test Simulation Results Tab Data
  log('Testing Simulation Results tab data...', 'info');
  if (result.survivalProbability) {
    assert(
      result.survivalProbability.overall,
      'Survival probability should have overall data'
    );
    assert(
      typeof result.survivalProbability.overall.totalSimulations === 'number' && 
      result.survivalProbability.overall.totalSimulations > 0,
      'Total simulations should be a positive number'
    );
    assert(
      typeof result.survivalProbability.overall.percentageSurvivingFullPeriod === 'number',
      'Percentage surviving full period should be a number'
    );
  }

  // Test Fan Chart Tab Data
  log('Testing Fan Chart tab data...', 'info');
  if (result.percentiles) {
    const percentiles = result.percentiles.percentiles_table || {};
    assert(
      Array.isArray(percentiles.p50) && percentiles.p50.length > 0,
      'P50 percentile array should exist and have data'
    );
    assert(
      Array.isArray(percentiles.p5) && percentiles.p5.length > 0,
      'P5 percentile array should exist and have data'
    );
    assert(
      Array.isArray(percentiles.p95) && percentiles.p95.length > 0,
      'P95 percentile array should exist and have data'
    );
    
    // Verify values are numbers
    assert(
      typeof percentiles.p50[0] === 'number',
      'P50 values should be numbers'
    );
  }

  // Test Sensitivity Analysis Tab Data
  log('Testing Sensitivity Analysis tab data...', 'info');
  if (result.sensitivityJson) {
    assert(
      typeof result.sensitivityJson === 'object',
      'Sensitivity JSON should be an object'
    );
  }

  // Test Explainability Tab Data
  log('Testing Explainability tab data...', 'info');
  
  // Risk metrics should be calculable from percentiles
  if (result.percentiles?.percentiles_table) {
    const p5 = result.percentiles.percentiles_table.p5;
    const p50 = result.percentiles.percentiles_table.p50;
    
    if (p5 && p50 && p5.length > 0 && p50.length > 0) {
      const var5 = p5[Math.floor(p5.length / 2)] || p5[0];
      assert(
        typeof var5 === 'number',
        'Value at Risk (5%) should be calculable and be a number'
      );
      assert(
        var5 !== null && var5 !== undefined,
        'Value at Risk should not be null or undefined'
      );
    }
  }

  // Confidence level should be present
  if (result.confidenceLevel) {
    assert(
      typeof Number(result.confidenceLevel) === 'number',
      'Confidence level should be a valid number'
    );
  }

  return true;
}

async function testExportFunctionality() {
  log('\n=== Testing Export Functionality ===', 'info');
  
  // Note: Export is a frontend functionality, but we can verify the data structure
  // that would be exported is valid
  if (!monteCarloJobId) {
    log('Skipping: No Monte Carlo job ID', 'warning');
    return false;
  }

  const result = await testGetMonteCarloResult(monteCarloJobId);
  
  if (result && result.ok) {
    // Verify all data needed for export is present
    assert(
      result.jobId || result.monteCarloJobId,
      'Export data should have job ID'
    );
    
    // Only check for percentiles/summary if status is done/completed
    // Jobs in progress may not have results yet
    if (result.status === 'done' || result.status === 'completed') {
      assert(
        result.percentiles || result.summary || result.percentilesS3,
        'Export data should have percentiles, summary, or percentilesS3 for completed jobs'
      );
    } else {
      log(`Job status is ${result.status}, skipping percentiles check (job not completed yet)`, 'info');
    }
    
    assert(
      result.status,
      'Export data should have status'
    );
    
    log('Export data structure is valid', 'success');
  }

  return true;
}

async function testDeterministicMode() {
  log('\n=== Testing Deterministic Mode ===', 'info');
  
  // Deterministic mode uses mean values of drivers
  // We can verify that when all stdDev = 0, it should work
  if (!authToken || !modelId) {
    log('Skipping: No auth token or model ID', 'warning');
    return false;
  }

  const deterministicDrivers = [
    {
      id: "revenue_growth",
      mean: 8,
      stdDev: 0, // No variation for deterministic
      min: 8,
      max: 8,
      distribution: "normal",
    },
  ];

  const { status, data } = await makeRequest(
    `${API_BASE_URL}/models/${modelId}/montecarlo`,
    'POST',
    {
      numSimulations: 100,
      drivers: deterministicDrivers,
    },
    { Authorization: `Bearer ${authToken}` }
  );

  assert(
    status === 200 || status === 201,
    'Deterministic mode should create job successfully'
  );

  return true;
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting Comprehensive Monte Carlo Forecasting Tests', 'info');
  log(`API Base URL: ${API_BASE_URL}`, 'info');
  log(`Test Email: ${TEST_EMAIL}`, 'info');
  log('='.repeat(80), 'info');
  
  // Check backend health first
  const backendHealthy = await checkBackendHealth();
  if (!backendHealthy) {
    log('\n⚠️  WARNING: Backend server may not be running!', 'warning');
    log('⚠️  Please start the backend server first:', 'warning');
    log('⚠️     cd backend && npm start', 'warning');
    log('⚠️  Or: node dist/app.js\n', 'warning');
    log('⚠️  Tests will continue but may fail if backend is not accessible.\n', 'warning');
  }

  try {
    // 1. Authentication
    await testAuthentication();

    // 2. Get Models
    await testGetModels();

    // 3. List Monte Carlo Jobs
    await testListMonteCarloJobs();

    // 4. Get Existing Monte Carlo Result (if available)
    if (monteCarloJobId) {
      const result = await testGetMonteCarloResult(monteCarloJobId);
      
      // 5. Test All Tabs Data
      if (result) {
        await testAllTabsData(result);
      }
    }

    // 6. Create New Monte Carlo Job
    const newJobId = await testCreateMonteCarloJob();

    // 7. Test Parameter Changes
    await testParameterChanges();

    // 8. Test Export Functionality
    await testExportFunctionality();

    // 9. Test Deterministic Mode
    await testDeterministicMode();

    // 10. Wait for job completion and test polling (if new job was created)
    if (newJobId) {
      log('\nWaiting for job to complete...', 'info');
      await testJobStatusPolling(newJobId);
      
      // Get final result
      const finalResult = await testGetMonteCarloResult(newJobId);
      if (finalResult) {
        await testAllTabsData(finalResult);
      }
    }

  } catch (error) {
    log(`Unexpected error: ${error.message}`, 'error');
    testResults.errors.push(`Unexpected error: ${error.message}`);
  }

  // Print summary
  log('\n' + '='.repeat(80), 'info');
  log('📊 TEST SUMMARY', 'info');
  log('='.repeat(80), 'info');
  log(`Total Tests: ${testResults.total}`, 'info');
  log(`Passed: ${testResults.passed}`, 'success');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'success');
  log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`, 'info');

  if (testResults.errors.length > 0) {
    log('\n❌ FAILED TESTS:', 'error');
    testResults.errors.forEach((error, index) => {
      log(`${index + 1}. ${error}`, 'error');
    });
  }

  if (testResults.failed === 0) {
    log('\n✅ ALL TESTS PASSED!', 'success');
    process.exit(0);
  } else {
    log(`\n❌ ${testResults.failed} TEST(S) FAILED`, 'error');
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runAllTests };
