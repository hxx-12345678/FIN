/**
 * COMPREHENSIVE TEST SCRIPT FOR ABACUM FEATURES
 * Tests all implemented features with cptjacksprw@gmail.com account
 */

const API_BASE_URL = process.env.API_URL || 'http://localhost:8000/api/v1';

let authToken = '';
let orgId = '';
let userId = '';

// Test account credentials
const TEST_EMAIL = 'cptjacksprw@gmail.com';
const TEST_PASSWORD = 'Player@123';

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
};

/**
 * Make API request
 */
async function apiRequest(method, endpoint, body = null, token = null) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const data = await response.json().catch(() => ({ error: 'Invalid JSON response' }));

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: { error: error.message },
    };
  }
}

/**
 * Test helper
 */
function test(name, fn) {
  return async () => {
    try {
      console.log(`\n🧪 Testing: ${name}`);
      await fn();
      testResults.passed++;
      console.log(`✅ PASSED: ${name}`);
    } catch (error) {
      testResults.failed++;
      testResults.errors.push({ test: name, error: error.message });
      console.log(`❌ FAILED: ${name}`);
      console.log(`   Error: ${error.message}`);
    }
  };
}

/**
 * Test 1: Login
 */
const testLogin = test('Login with test account', async () => {
  const response = await apiRequest('POST', '/auth/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (!response.ok) {
    // Try signup if login fails
    console.log('   Login failed, trying signup...');
    const signupResponse = await apiRequest('POST', '/auth/signup', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      orgName: 'Test Organization',
      name: 'Test User',
    });

    if (!signupResponse.ok) {
      throw new Error(`Signup failed: ${JSON.stringify(signupResponse.data)}`);
    }

    authToken = signupResponse.data.token;
    orgId = signupResponse.data.org?.id;
    userId = signupResponse.data.user?.id;
  } else {
    authToken = response.data.token;
    // Get user info to get orgId
    const meResponse = await apiRequest('GET', '/auth/me', null, authToken);
    if (meResponse.ok && meResponse.data.user) {
      userId = meResponse.data.user.id;
      // Get orgs
      const orgsResponse = await apiRequest('GET', '/orgs', null, authToken);
      if (orgsResponse.ok && orgsResponse.data.orgs && orgsResponse.data.orgs.length > 0) {
        orgId = orgsResponse.data.orgs[0].id;
      }
    }
  }

  if (!authToken) {
    throw new Error('Failed to get auth token');
  }

  if (!orgId) {
    throw new Error('Failed to get org ID');
  }

  console.log(`   ✅ Token: ${authToken.substring(0, 20)}...`);
  console.log(`   ✅ Org ID: ${orgId}`);
  console.log(`   ✅ User ID: ${userId}`);
});

/**
 * Test 2: AI Summaries
 */
const testAISummaries = test('AI Summaries - Generate summary', async () => {
  if (!orgId) throw new Error('No org ID');

  const response = await apiRequest('POST', `/orgs/${orgId}/ai-summaries`, {
    reportType: 'overview',
    includeMetrics: true,
  }, authToken);

  if (!response.ok) {
    throw new Error(`Failed: ${JSON.stringify(response.data)}`);
  }

  if (!response.data.summary) {
    throw new Error('No summary in response');
  }

  console.log(`   ✅ Summary generated: ${response.data.summary.executiveSummary?.substring(0, 50)}...`);
});

/**
 * Test 3: AI Anomaly Detection
 */
const testAnomalyDetection = test('AI Anomaly Detection - Detect anomalies', async () => {
  if (!orgId) throw new Error('No org ID');

  const response = await apiRequest('POST', `/orgs/${orgId}/anomalies/detect`, {
    checkTypes: ['spending', 'revenue', 'data_quality'],
    threshold: 0.7,
  }, authToken);

  if (!response.ok) {
    throw new Error(`Failed: ${JSON.stringify(response.data)}`);
  }

  console.log(`   ✅ Anomalies detected: ${response.data.anomalies?.length || 0}`);
  console.log(`   ✅ Summary: ${JSON.stringify(response.data.summary)}`);
});

/**
 * Test 4: Formula Autocomplete
 */
const testFormulaAutocomplete = test('Formula Autocomplete - Get suggestions', async () => {
  const response = await apiRequest('GET', '/formulas/suggestions?category=revenue&partialFormula=SUM', null, authToken);

  if (!response.ok) {
    throw new Error(`Failed: ${JSON.stringify(response.data)}`);
  }

  if (!response.data.suggestions || response.data.suggestions.length === 0) {
    throw new Error('No suggestions returned');
  }

  console.log(`   ✅ Suggestions: ${response.data.suggestions.length}`);
});

/**
 * Test 5: Formula Validation
 */
const testFormulaValidation = test('Formula Autocomplete - Validate formula', async () => {
  const response = await apiRequest('POST', '/formulas/validate', {
    formula: 'SUM(A1:A10)',
  }, authToken);

  if (!response.ok) {
    throw new Error(`Failed: ${JSON.stringify(response.data)}`);
  }

  console.log(`   ✅ Valid: ${response.data.isValid}`);
});

/**
 * Test 6: Report Approval - Create Report
 */
const testReportApprovalCreate = test('Report Approval - Create report', async () => {
  if (!orgId) throw new Error('No org ID');

  const response = await apiRequest('POST', `/orgs/${orgId}/reports`, {
    type: 'pdf',
    approvalRequired: false,
  }, authToken);

  if (!response.ok) {
    throw new Error(`Failed: ${JSON.stringify(response.data)}`);
  }

  console.log(`   ✅ Report created: ${response.data.report?.id}`);
});

/**
 * Test 7: Drill-down
 */
const testDrillDown = test('Drill-down - Get data', async () => {
  if (!orgId) throw new Error('No org ID');

  const response = await apiRequest('POST', `/orgs/${orgId}/drill-down`, {
    metricType: 'revenue',
    metricValue: 10000,
    level: 0,
  }, authToken);

  if (!response.ok) {
    throw new Error(`Failed: ${JSON.stringify(response.data)}`);
  }

  console.log(`   ✅ Data items: ${response.data.data?.length || 0}`);
});

/**
 * Test 8: Data Transformation - Get Templates
 */
const testDataTransformationTemplates = test('Data Transformation - Get templates', async () => {
  const response = await apiRequest('GET', '/data/transformation-templates', null, authToken);

  if (!response.ok) {
    throw new Error(`Failed: ${JSON.stringify(response.data)}`);
  }

  if (!response.data.templates || response.data.templates.length === 0) {
    throw new Error('No templates returned');
  }

  console.log(`   ✅ Templates: ${response.data.templates.length}`);
});

/**
 * Test 9: Headcount Planning - Create Plan
 */
const testHeadcountPlanning = test('Headcount Planning - Create plan', async () => {
  if (!orgId) throw new Error('No org ID');

  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 1);

  const response = await apiRequest('POST', `/orgs/${orgId}/headcount-plans`, {
    name: 'Engineering Team Expansion',
    role: 'Software Engineer',
    department: 'Engineering',
    startDate: futureDate.toISOString().split('T')[0],
    quantity: 5,
    salary: 100000,
    notes: 'Test headcount plan',
  }, authToken);

  if (!response.ok) {
    throw new Error(`Failed: ${JSON.stringify(response.data)}`);
  }

  console.log(`   ✅ Plan created: ${response.data.plan?.name}`);
});

/**
 * Test 10: Headcount Planning - Get Forecast
 */
const testHeadcountForecast = test('Headcount Planning - Get forecast', async () => {
  if (!orgId) throw new Error('No org ID');

  const response = await apiRequest('GET', `/orgs/${orgId}/headcount-plans/forecast?months=12`, null, authToken);

  if (!response.ok) {
    throw new Error(`Failed: ${JSON.stringify(response.data)}`);
  }

  console.log(`   ✅ Forecast months: ${response.data.forecast?.length || 0}`);
});

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Feature Tests');
  console.log('='.repeat(60));
  console.log(`Test Account: ${TEST_EMAIL}`);
  console.log(`API URL: ${API_BASE_URL}`);
  console.log('='.repeat(60));

  // Run tests in sequence
  await testLogin();
  await testAISummaries();
  await testAnomalyDetection();
  await testFormulaAutocomplete();
  await testFormulaValidation();
  await testReportApprovalCreate();
  await testDrillDown();
  await testDataTransformationTemplates();
  await testHeadcountPlanning();
  await testHeadcountForecast();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

  if (testResults.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    testResults.errors.forEach(({ test, error }) => {
      console.log(`   - ${test}: ${error}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

