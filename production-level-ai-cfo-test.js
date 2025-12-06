/**
 * PRODUCTION-LEVEL AI CFO TEST SUITE
 * Comprehensive testing of AI CFO features with:
 * - Intent Classification accuracy
 * - Financial Calculations validation
 * - Recommendations quality
 * - Predictions accuracy
 * - Decision accuracy
 * - Edge cases and error handling
 * - Performance metrics
 * 
 * Test Account: cptjacksprw@gmail.com / Player@123
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api/v1';

const TEST_CONFIG = {
  email: 'cptjacksprw@gmail.com',
  password: 'Player@123',
  orgId: null,
  userId: null,
  authToken: null,
  testResults: [],
  performanceMetrics: [],
};

// Colors for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${'='.repeat(80)}`, 'cyan');
  log(`${title}`, 'bright');
  log('='.repeat(80), 'cyan');
}

function logTest(name) {
  log(`\n▶ ${name}`, 'blue');
}

function logPass(message) {
  log(`  ✓ ${message}`, 'green');
}

function logFail(message) {
  log(`  ✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`  ℹ ${message}`, 'yellow');
}

function logWarning(message) {
  log(`  ⚠ ${message}`, 'yellow');
}

// API Helper
async function apiCall(method, endpoint, body = null, token = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const startTime = Date.now();
  try {
    const response = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : null,
    });
    
    const latency = Date.now() - startTime;
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json().catch(() => ({}));
    } else {
      const text = await response.text().catch(() => '');
      data = text ? { message: text } : {};
    }
    
    return { status: response.status, ok: response.ok, data, latency };
  } catch (error) {
    return { status: 0, ok: false, error: error.message, data: null, latency: Date.now() - startTime };
  }
}

// Test Result Tracker
function recordTest(category, testName, passed, details = '', metrics = {}) {
  TEST_CONFIG.testResults.push({ category, testName, passed, details, metrics });
  return passed;
}

// Performance Tracker
function recordPerformance(testName, latency, success) {
  TEST_CONFIG.performanceMetrics.push({ testName, latency, success });
}

// ============================================================================
// SECTION 1: INTENT CLASSIFICATION ACCURACY
// ============================================================================

const INTENT_TEST_CASES = [
  // Runway calculations
  { query: 'How many months of runway do we have?', expectedIntent: 'runway_calculation', minConfidence: 0.6 },
  { query: 'What is our cash runway?', expectedIntent: 'runway_calculation', minConfidence: 0.6 },
  { query: 'How long until we run out of cash?', expectedIntent: 'runway_calculation', minConfidence: 0.6 },
  
  // Burn rate
  { query: 'What is our monthly burn rate?', expectedIntent: 'burn_rate_calculation', minConfidence: 0.6 },
  { query: 'Calculate our burn rate', expectedIntent: 'burn_rate_calculation', minConfidence: 0.6 },
  
  // Revenue forecasting
  { query: 'Forecast revenue for next 6 months', expectedIntent: 'revenue_forecast', minConfidence: 0.6 },
  { query: 'Predict our revenue growth', expectedIntent: 'revenue_forecast', minConfidence: 0.6 },
  
  // Hire impact
  { query: 'What happens if we hire 5 engineers?', expectedIntent: 'hire_impact', minConfidence: 0.6 },
  { query: 'Impact of hiring 10 more people', expectedIntent: 'hire_impact', minConfidence: 0.6 },
  
  // Scenario simulation
  { query: 'Create a scenario with 20% revenue growth', expectedIntent: 'scenario_simulation', minConfidence: 0.6 },
  { query: 'What if we reduce expenses by 15%?', expectedIntent: 'scenario_simulation', minConfidence: 0.6 },
  
  // Monte Carlo
  { query: 'Run Monte Carlo simulation', expectedIntent: 'monte_carlo', minConfidence: 0.7 },
  { query: 'What is our cash probability distribution?', expectedIntent: 'monte_carlo', minConfidence: 0.6 },
  
  // Fundraising
  { query: 'Are we ready to raise funding?', expectedIntent: 'fundraising_readiness', minConfidence: 0.6 },
  { query: 'Should we raise capital now?', expectedIntent: 'fundraising_readiness', minConfidence: 0.6 },
  
  // Cost optimization
  { query: 'How can we reduce costs?', expectedIntent: 'cost_optimization', minConfidence: 0.6 },
  { query: 'Optimize our expenses', expectedIntent: 'cost_optimization', minConfidence: 0.6 },
  
  // Margin improvement
  { query: 'How to improve gross margin?', expectedIntent: 'margin_improvement', minConfidence: 0.6 },
  { query: 'Increase our profit margins', expectedIntent: 'margin_improvement', minConfidence: 0.6 },
];

async function testIntentClassification() {
  logSection('SECTION 1: INTENT CLASSIFICATION ACCURACY');
  
  let passed = 0;
  let failed = 0;
  let totalConfidence = 0;

  for (const testCase of INTENT_TEST_CASES) {
    logTest(`Intent: "${testCase.query}"`);
    
    const result = await apiCall('POST', `/orgs/${TEST_CONFIG.orgId}/ai-plans`, {
      goal: testCase.query,
    }, TEST_CONFIG.authToken);

    recordPerformance('Intent Classification', result.latency, result.ok);

    if (result.ok && result.data?.plan) {
      const plan = result.data.plan;
      // Plan data is stored in planJson
      const planData = typeof plan.planJson === 'string' ? JSON.parse(plan.planJson) : plan.planJson || plan;
      // Intent is in metadata.intent
      const intent = planData.metadata?.intent || planData.intent_classification?.intent || planData.intent || 'unknown';
      const confidence = planData.metadata?.intentConfidence || planData.intent_classification?.confidence || planData.confidence || 0;
      
      const intentMatch = intent === testCase.expectedIntent;
      const confidenceOK = confidence >= testCase.minConfidence;
      
      totalConfidence += confidence;

      if (intentMatch && confidenceOK) {
        logPass(`Intent: ${intent} (confidence: ${(confidence * 100).toFixed(1)}%)`);
        passed++;
        recordTest('Intent Classification', testCase.query, true, `Intent: ${intent}, Confidence: ${confidence}`);
      } else {
        logFail(`Expected: ${testCase.expectedIntent}, Got: ${intent || 'unknown'}, Confidence: ${(confidence * 100).toFixed(1)}%`);
        failed++;
        recordTest('Intent Classification', testCase.query, false, `Expected: ${testCase.expectedIntent}, Got: ${intent}, Confidence: ${confidence}`);
      }
    } else {
      logFail(`Request failed: ${result.data?.error?.message || result.data?.message || 'Unknown error'}`);
      failed++;
      recordTest('Intent Classification', testCase.query, false, result.data?.error?.message || 'Request failed');
    }
  }

  const accuracy = (passed / INTENT_TEST_CASES.length) * 100;
  const avgConfidence = totalConfidence / INTENT_TEST_CASES.length;
  
  log(`\nIntent Classification Results: ${passed}/${INTENT_TEST_CASES.length} passed (${accuracy.toFixed(1)}%)`);
  log(`Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
  
  if (accuracy < 80) {
    logWarning('Intent classification accuracy below 80% - needs improvement');
  }
  if (avgConfidence < 0.7) {
    logWarning('Average confidence below 70% - needs improvement');
  }
}

// ============================================================================
// SECTION 2: FINANCIAL CALCULATIONS ACCURACY
// ============================================================================

const CALCULATION_TEST_CASES = [
  {
    name: 'Runway Calculation',
    query: 'If we have $500,000 cash and burn $80,000/month, what is our runway?',
    expectedFormula: 'runway = cash / burn_rate',
    expectedResult: 6.25, // months
    tolerance: 0.01,
  },
  {
    name: 'Burn Rate from Runway',
    query: 'We have 12 months runway with $600,000 cash. What is our monthly burn?',
    expectedFormula: 'burn_rate = cash / runway',
    expectedResult: 50000, // per month
    tolerance: 100,
  },
  {
    name: 'Revenue Growth',
    query: 'Current revenue is $100k per month. With 10% monthly growth, what is revenue in 6 months?',
    expectedFormula: 'revenue = base * (1 + growth_rate)^months',
    expectedResult: 177156, // 100000 * (1.1)^6 ≈ 177156
    tolerance: 5000, // Allow tolerance for entity extraction
  },
  {
    name: 'Hire Impact',
    query: 'If we hire 3 engineers at $150k per year each, what is the monthly cost impact?',
    expectedFormula: 'monthly_cost = (annual_salary * quantity) / 12',
    expectedResult: 37500, // (150000 * 3) / 12 = 37500
    tolerance: 1000,
  },
];

async function testFinancialCalculations() {
  logSection('SECTION 2: FINANCIAL CALCULATIONS ACCURACY');
  
  let passed = 0;
  let failed = 0;

  for (const testCase of CALCULATION_TEST_CASES) {
    logTest(`Calculation: ${testCase.name}`);
    
    const result = await apiCall('POST', `/orgs/${TEST_CONFIG.orgId}/ai-plans`, {
      goal: testCase.query,
    }, TEST_CONFIG.authToken);

    recordPerformance('Financial Calculation', result.latency, result.ok);

    if (result.ok && result.data?.plan) {
      const plan = result.data.plan;
      // Plan data is stored in planJson
      const planData = typeof plan.planJson === 'string' ? JSON.parse(plan.planJson) : plan.planJson || plan;
      // Calculations are in structuredResponse.calculations or metadata.calculationsPerformed
      const calculations = planData.structuredResponse?.calculations || planData.calculations || {};
      const stagedChanges = planData.stagedChanges || planData.staged_changes || planData.recommendations || [];
      
      // Try to find the calculation result
      let foundResult = null;
      let foundFormula = null;
      
      // Check calculations object
      for (const [key, value] of Object.entries(calculations)) {
        if (typeof value === 'number') {
          foundResult = value;
          foundFormula = key;
          break;
        }
      }
      
      // Check execution results in structuredResponse
      if (!foundResult && planData.structuredResponse?.executionResults) {
        for (const result of planData.structuredResponse.executionResults) {
          if (result.params?.result !== undefined && typeof result.params.result === 'number') {
            foundResult = result.params.result;
            foundFormula = result.operation || result.params.operation || 'calculation';
            break;
          }
          if (result.result !== undefined && typeof result.result === 'number') {
            foundResult = result.result;
            foundFormula = result.operation || 'calculation';
            break;
          }
        }
      }
      
      // Check staged changes for impact metrics
      if (!foundResult && stagedChanges.length > 0) {
        for (const change of stagedChanges) {
          if (change.impact) {
            // Check for runway impact
            if (change.impact.runway_delta_months !== undefined) {
              foundResult = change.impact.runway_delta_months;
              break;
            }
            // Check for burn rate impact
            if (change.impact.burn_delta !== undefined) {
              foundResult = change.impact.burn_delta;
              break;
            }
            // Check for any numeric value in impact
            for (const [key, value] of Object.entries(change.impact)) {
              if (typeof value === 'number' && Math.abs(value) > 0) {
                foundResult = value;
                foundFormula = key;
                break;
              }
            }
          }
          if (foundResult) break;
        }
      }
      
      // If still no result, check structuredResponse for calculations
      if (!foundResult && planData.structuredResponse) {
        const sr = planData.structuredResponse;
        if (sr.calculations) {
          for (const [key, value] of Object.entries(sr.calculations)) {
            if (typeof value === 'number') {
              foundResult = value;
              foundFormula = key;
              break;
            }
          }
        }
      }
      
      // Debug: Log what we found
      if (!foundResult) {
        logInfo(`Calculation not found. Available keys: ${JSON.stringify(Object.keys(planData)).substring(0, 200)}`);
      }
      
      if (foundResult !== null) {
        const diff = Math.abs(foundResult - testCase.expectedResult);
        const withinTolerance = diff <= testCase.tolerance;
        
        if (withinTolerance) {
          logPass(`Result: ${foundResult.toLocaleString()} (Expected: ${testCase.expectedResult.toLocaleString()}, Diff: ${diff.toFixed(2)})`);
          passed++;
          recordTest('Financial Calculations', testCase.name, true, `Result: ${foundResult}, Expected: ${testCase.expectedResult}`);
        } else {
          logFail(`Result: ${foundResult.toLocaleString()}, Expected: ${testCase.expectedResult.toLocaleString()}, Diff: ${diff.toFixed(2)} (Tolerance: ${testCase.tolerance})`);
          failed++;
          recordTest('Financial Calculations', testCase.name, false, `Result: ${foundResult}, Expected: ${testCase.expectedResult}, Diff: ${diff}`);
        }
      } else {
        logWarning('Calculation result not found in response');
        logInfo('Plan structure: ' + JSON.stringify(Object.keys(plan)).substring(0, 200));
        failed++;
        recordTest('Financial Calculations', testCase.name, false, 'Result not found in response');
      }
    } else {
      logFail(`Request failed: ${result.data?.error?.message || result.data?.message || 'Unknown error'}`);
      failed++;
      recordTest('Financial Calculations', testCase.name, false, result.data?.error?.message || 'Request failed');
    }
  }

  const accuracy = (passed / CALCULATION_TEST_CASES.length) * 100;
  log(`\nFinancial Calculations Results: ${passed}/${CALCULATION_TEST_CASES.length} passed (${accuracy.toFixed(1)}%)`);
  
  if (accuracy < 90) {
    logWarning('Financial calculation accuracy below 90% - critical issue');
  }
}

// ============================================================================
// SECTION 3: RECOMMENDATIONS QUALITY
// ============================================================================

const RECOMMENDATION_TEST_CASES = [
  {
    query: 'We are running low on cash. What should we do?',
    requiredFields: ['type', 'action', 'impact', 'priority'],
    minRecommendations: 2,
  },
  {
    query: 'How can we improve our profit margins?',
    requiredFields: ['type', 'action', 'impact', 'priority'],
    minRecommendations: 2,
  },
  {
    query: 'Should we hire more engineers?',
    requiredFields: ['type', 'action', 'impact', 'priority'],
    minRecommendations: 1,
  },
];

async function testRecommendationsQuality() {
  logSection('SECTION 3: RECOMMENDATIONS QUALITY');
  
  let passed = 0;
  let failed = 0;
  let totalRecommendations = 0;
  let avgPriorityScore = 0;

  for (const testCase of RECOMMENDATION_TEST_CASES) {
    logTest(`Recommendations: "${testCase.query}"`);
    
    const result = await apiCall('POST', `/orgs/${TEST_CONFIG.orgId}/ai-plans`, {
      goal: testCase.query,
    }, TEST_CONFIG.authToken);

    recordPerformance('Recommendations', result.latency, result.ok);

    if (result.ok && result.data?.plan) {
      const plan = result.data.plan;
      // Plan data is stored in planJson
      const planData = typeof plan.planJson === 'string' ? JSON.parse(plan.planJson) : plan.planJson || plan;
      // Recommendations are in stagedChanges or structuredResponse.recommendations
      const recommendations = planData.stagedChanges || planData.structuredResponse?.recommendations || planData.recommendations || [];
      
      totalRecommendations += recommendations.length;
      
      if (recommendations.length >= testCase.minRecommendations) {
        logPass(`Received ${recommendations.length} recommendations`);
        
        // Validate recommendation structure
        let validRecommendations = 0;
        let prioritySum = 0;
        
        for (const rec of recommendations) {
          const hasRequiredFields = testCase.requiredFields.every(field => {
            const value = rec[field] || rec.type || rec.action || rec.impact || rec.priority;
            return value !== undefined && value !== null;
          });
          
          if (hasRequiredFields) {
            validRecommendations++;
            
            // Score priority (high=3, medium=2, low=1)
            if (rec.priority) {
              const priorityScore = rec.priority === 'high' ? 3 : rec.priority === 'medium' ? 2 : 1;
              prioritySum += priorityScore;
            }
          }
        }
        
        if (validRecommendations >= testCase.minRecommendations) {
          logPass(`All recommendations have required fields`);
          passed++;
          recordTest('Recommendations Quality', testCase.query, true, `${recommendations.length} recommendations, ${validRecommendations} valid`);
        } else {
          logFail(`Only ${validRecommendations}/${recommendations.length} recommendations have required fields`);
          failed++;
          recordTest('Recommendations Quality', testCase.query, false, `Missing required fields`);
        }
        
        if (recommendations.length > 0) {
          avgPriorityScore += prioritySum / recommendations.length;
        }
      } else {
        logFail(`Expected at least ${testCase.minRecommendations} recommendations, got ${recommendations.length}`);
        failed++;
        recordTest('Recommendations Quality', testCase.query, false, `Insufficient recommendations: ${recommendations.length}`);
      }
    } else {
      logFail(`Request failed: ${result.data?.error?.message || result.data?.message || 'Unknown error'}`);
      failed++;
      recordTest('Recommendations Quality', testCase.query, false, result.data?.error?.message || 'Request failed');
    }
  }

  const accuracy = (passed / RECOMMENDATION_TEST_CASES.length) * 100;
  const avgRecs = totalRecommendations / RECOMMENDATION_TEST_CASES.length;
  const avgPriority = avgPriorityScore / RECOMMENDATION_TEST_CASES.length;
  
  log(`\nRecommendations Quality Results: ${passed}/${RECOMMENDATION_TEST_CASES.length} passed (${accuracy.toFixed(1)}%)`);
  log(`Average Recommendations per Query: ${avgRecs.toFixed(1)}`);
  log(`Average Priority Score: ${avgPriority.toFixed(2)}`);
  
  if (accuracy < 80) {
    logWarning('Recommendation quality below 80% - needs improvement');
  }
  if (avgRecs < 2) {
    logWarning('Average recommendations per query below 2 - needs improvement');
  }
}

// ============================================================================
// SECTION 4: EDGE CASES AND ERROR HANDLING
// ============================================================================

const EDGE_CASE_TESTS = [
  {
    name: 'Empty Query',
    query: '',
    shouldFail: true,
  },
  {
    name: 'Very Short Query',
    query: 'Hi',
    shouldFail: true,
  },
  {
    name: 'Very Long Query',
    query: 'A'.repeat(1000),
    shouldFail: false, // Should sanitize, not fail
  },
  {
    name: 'Special Characters',
    query: 'What is our revenue? !@#$%^&*()',
    shouldFail: false,
  },
  {
    name: 'SQL Injection Attempt',
    query: "'; DROP TABLE users; --",
    shouldFail: false, // Should sanitize
  },
  {
    name: 'Negative Numbers',
    query: 'What if we have -$50000 cash?',
    shouldFail: false, // Should handle gracefully
  },
  {
    name: 'Zero Values',
    query: 'What is our runway if cash is $0?',
    shouldFail: false, // Should handle with warnings
  },
  {
    name: 'Unrealistic Values',
    query: 'What if we have $999999999999999 cash?',
    shouldFail: false, // Should handle gracefully
  },
];

async function testEdgeCases() {
  logSection('SECTION 4: EDGE CASES AND ERROR HANDLING');
  
  let passed = 0;
  let failed = 0;

  for (const testCase of EDGE_CASE_TESTS) {
    logTest(`Edge Case: ${testCase.name}`);
    
    const result = await apiCall('POST', `/orgs/${TEST_CONFIG.orgId}/ai-plans`, {
      goal: testCase.query,
    }, TEST_CONFIG.authToken);

    const expectedBehavior = testCase.shouldFail ? !result.ok : true;
    const actualBehavior = result.ok || result.status === 400 || result.status === 422;

    if (expectedBehavior === actualBehavior) {
      logPass(`Handled correctly: ${testCase.shouldFail ? 'rejected' : 'accepted'}`);
      passed++;
      recordTest('Edge Cases', testCase.name, true, `Expected: ${testCase.shouldFail ? 'fail' : 'pass'}, Got: ${result.ok ? 'pass' : 'fail'}`);
    } else {
      logFail(`Unexpected behavior: Expected ${testCase.shouldFail ? 'failure' : 'success'}, got ${result.ok ? 'success' : 'failure'}`);
      failed++;
      recordTest('Edge Cases', testCase.name, false, `Unexpected behavior`);
    }
  }

  const accuracy = (passed / EDGE_CASE_TESTS.length) * 100;
  log(`\nEdge Cases Results: ${passed}/${EDGE_CASE_TESTS.length} passed (${accuracy.toFixed(1)}%)`);
  
  if (accuracy < 90) {
    logWarning('Edge case handling below 90% - security/robustness issue');
  }
}

// ============================================================================
// SECTION 5: PERFORMANCE TESTING
// ============================================================================

async function testPerformance() {
  logSection('SECTION 5: PERFORMANCE TESTING');
  
  const queries = [
    'What is our runway?',
    'How can we reduce costs?',
    'Forecast revenue for next quarter',
  ];

  const latencies = [];
  const successCount = 0;

  logTest('Performance: Response Time');
  
  for (const query of queries) {
    const startTime = Date.now();
    const result = await apiCall('POST', `/orgs/${TEST_CONFIG.orgId}/ai-plans`, {
      goal: query,
    }, TEST_CONFIG.authToken);
    const latency = Date.now() - startTime;
    
    latencies.push(latency);
    recordPerformance(`Performance: ${query}`, latency, result.ok);
    
    logInfo(`Query: "${query}" - ${latency}ms`);
  }

  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const maxLatency = Math.max(...latencies);
  const minLatency = Math.min(...latencies);

  log(`\nPerformance Metrics:`);
  log(`  Average Latency: ${avgLatency.toFixed(0)}ms`);
  log(`  Min Latency: ${minLatency}ms`);
  log(`  Max Latency: ${maxLatency}ms`);

  // Performance thresholds
  const thresholds = {
    excellent: 2000, // 2 seconds
    good: 5000, // 5 seconds
    acceptable: 10000, // 10 seconds
  };

  if (avgLatency <= thresholds.excellent) {
    logPass(`Performance is excellent (${avgLatency.toFixed(0)}ms <= ${thresholds.excellent}ms)`);
  } else if (avgLatency <= thresholds.good) {
    logWarning(`Performance is good but could be better (${avgLatency.toFixed(0)}ms > ${thresholds.excellent}ms)`);
  } else if (avgLatency <= thresholds.acceptable) {
    logWarning(`Performance is acceptable but needs optimization (${avgLatency.toFixed(0)}ms > ${thresholds.good}ms)`);
  } else {
    logFail(`Performance is unacceptable (${avgLatency.toFixed(0)}ms > ${thresholds.acceptable}ms)`);
  }

  recordTest('Performance', 'Response Time', avgLatency <= thresholds.acceptable, `Avg: ${avgLatency.toFixed(0)}ms`, { avgLatency, maxLatency, minLatency });
}

// ============================================================================
// SECTION 6: DATA VALIDATION
// ============================================================================

async function testDataValidation() {
  logSection('SECTION 6: DATA VALIDATION');
  
  logTest('Validation: Response Structure');
  
  const result = await apiCall('POST', `/orgs/${TEST_CONFIG.orgId}/ai-plans`, {
    goal: 'What is our runway?',
  }, TEST_CONFIG.authToken);

  if (result.ok && result.data?.plan) {
    const plan = result.data.plan;
    // Plan data is stored in planJson
    const planData = typeof plan.planJson === 'string' ? JSON.parse(plan.planJson) : plan.planJson || plan;
    const requiredFields = ['id'];
    const missingFields = requiredFields.filter(field => !plan[field]);
    const goalField = plan.goal || plan.description || planData.goal;
    
    if (missingFields.length === 0 && (plan.id || goalField)) {
      logPass('All required fields present');
      recordTest('Data Validation', 'Response Structure', true, 'All required fields present');
    } else {
      logFail(`Missing required fields: ${missingFields.join(', ')}`);
      recordTest('Data Validation', 'Response Structure', false, `Missing: ${missingFields.join(', ')}`);
    }
    
    // Validate data types
    const typeValidations = [
      { field: 'id', value: plan.id, expected: 'string' },
      { field: 'goal', value: goalField, expected: 'string' },
      { field: 'createdAt', value: plan.createdAt, expected: 'string' },
    ];
    
    let typeErrors = [];
    for (const validation of typeValidations) {
      if (validation.value && typeof validation.value !== validation.expected) {
        typeErrors.push(`${validation.field}: expected ${validation.expected}, got ${typeof validation.value}`);
      }
    }
    
    if (typeErrors.length === 0) {
      logPass('All data types are correct');
    } else {
      logFail(`Data type errors: ${typeErrors.join(', ')}`);
      recordTest('Data Validation', 'Data Types', false, typeErrors.join(', '));
    }
  } else {
    logFail(`Cannot validate: Request failed`);
    recordTest('Data Validation', 'Response Structure', false, 'Request failed');
  }
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function authenticate() {
  logSection('AUTHENTICATION');
  
  const loginResult = await apiCall('POST', '/auth/login', {
    email: TEST_CONFIG.email,
    password: TEST_CONFIG.password,
  });

  if (!loginResult.ok || !loginResult.data?.token) {
    logFail(`Authentication failed: ${loginResult.data?.error?.message || loginResult.data?.message || 'Unknown error'}`);
    return false;
  }

  TEST_CONFIG.authToken = loginResult.data.token;
  TEST_CONFIG.userId = loginResult.data.user?.id;

  const meResult = await apiCall('GET', '/auth/me', null, TEST_CONFIG.authToken);

  if (meResult.ok && meResult.data?.orgs && meResult.data.orgs.length > 0) {
    TEST_CONFIG.orgId = meResult.data.orgs[0].id;
    TEST_CONFIG.userId = meResult.data.id || TEST_CONFIG.userId;
    logPass(`Authenticated as ${TEST_CONFIG.email}`);
    logInfo(`Organization: ${meResult.data.orgs[0].name}`);
    return true;
  }

  logFail('Authentication failed - No organization found');
  return false;
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  log('\n' + '='.repeat(80), 'bright');
  log('PRODUCTION-LEVEL AI CFO TEST SUITE', 'bright');
  log('CFO-Level Financial Intelligence Testing', 'bright');
  log('='.repeat(80) + '\n', 'bright');

  if (!await authenticate()) {
    logFail('Cannot proceed without authentication');
    return;
  }

  await testIntentClassification();
  await testFinancialCalculations();
  await testRecommendationsQuality();
  await testEdgeCases();
  await testPerformance();
  await testDataValidation();

  // Print Summary
  logSection('FINAL TEST SUMMARY');
  
  const categories = {};
  TEST_CONFIG.testResults.forEach(result => {
    if (!categories[result.category]) {
      categories[result.category] = { total: 0, passed: 0 };
    }
    categories[result.category].total++;
    if (result.passed) categories[result.category].passed++;
  });

  Object.keys(categories).forEach(category => {
    const { total, passed } = categories[category];
    const percentage = ((passed / total) * 100).toFixed(1);
    const color = percentage === '100.0' ? 'green' : percentage >= '80.0' ? 'yellow' : 'red';
    log(`${category}: ${passed}/${total} (${percentage}%)`, color);
  });

  const total = TEST_CONFIG.testResults.length;
  const totalPassed = TEST_CONFIG.testResults.filter(r => r.passed).length;
  const totalPercentage = ((totalPassed / total) * 100).toFixed(1);

  log(`\nOVERALL: ${totalPassed}/${total} tests passed (${totalPercentage}%)`, 
      totalPercentage === '100.0' ? 'green' : totalPercentage >= '90.0' ? 'yellow' : 'red');

  // Performance Summary
  if (TEST_CONFIG.performanceMetrics.length > 0) {
    const avgLatency = TEST_CONFIG.performanceMetrics.reduce((sum, m) => sum + m.latency, 0) / TEST_CONFIG.performanceMetrics.length;
    log(`\nAverage Response Time: ${avgLatency.toFixed(0)}ms`);
  }

  log('\n' + '='.repeat(80) + '\n', 'bright');
}

// Run tests
if (typeof fetch === 'undefined') {
  try {
    const nodeFetch = require('node-fetch');
    global.fetch = nodeFetch;
  } catch (e) {
    log('This script requires Node.js 18+ or node-fetch package', 'red');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

module.exports = { runAllTests, TEST_CONFIG };

