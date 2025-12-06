/**
 * FINAL PRODUCTION-LEVEL AI CFO TEST SUITE
 * Comprehensive testing with focus on:
 * - 90%+ confidence requirements
 * - No hallucinations
 * - Perfect accuracy
 * - All test cases must pass
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
// SECTION 1: INTENT CLASSIFICATION - 90%+ CONFIDENCE REQUIREMENT
// ============================================================================

const INTENT_TEST_CASES = [
  { query: 'How many months of runway do we have?', expectedIntent: 'runway_calculation', minConfidence: 0.90 },
  { query: 'What is our cash runway?', expectedIntent: 'runway_calculation', minConfidence: 0.90 },
  { query: 'How long until we run out of cash?', expectedIntent: 'runway_calculation', minConfidence: 0.90 },
  { query: 'What is our monthly burn rate?', expectedIntent: 'burn_rate_calculation', minConfidence: 0.90 },
  { query: 'Calculate our burn rate', expectedIntent: 'burn_rate_calculation', minConfidence: 0.90 },
  { query: 'Forecast revenue for next 6 months', expectedIntent: 'revenue_forecast', minConfidence: 0.90 },
  { query: 'Predict our revenue growth', expectedIntent: 'revenue_forecast', minConfidence: 0.90 },
  { query: 'What happens if we hire 5 engineers?', expectedIntent: 'hire_impact', minConfidence: 0.90 },
  { query: 'Impact of hiring 10 more people', expectedIntent: 'hire_impact', minConfidence: 0.90 },
  { query: 'Create a scenario with 20% revenue growth', expectedIntent: 'scenario_simulation', minConfidence: 0.90 },
  { query: 'What if we reduce expenses by 15%?', expectedIntent: 'scenario_simulation', minConfidence: 0.90 },
  { query: 'Run Monte Carlo simulation', expectedIntent: 'monte_carlo', minConfidence: 0.90 },
  { query: 'What is our cash probability distribution?', expectedIntent: 'monte_carlo', minConfidence: 0.90 },
  { query: 'Are we ready to raise funding?', expectedIntent: 'fundraising_readiness', minConfidence: 0.90 },
  { query: 'Should we raise capital now?', expectedIntent: 'fundraising_readiness', minConfidence: 0.90 },
  { query: 'How can we reduce costs?', expectedIntent: 'cost_optimization', minConfidence: 0.90 },
  { query: 'Optimize our expenses', expectedIntent: 'cost_optimization', minConfidence: 0.90 },
  { query: 'How to improve gross margin?', expectedIntent: 'margin_improvement', minConfidence: 0.90 },
  { query: 'Increase our profit margins', expectedIntent: 'margin_improvement', minConfidence: 0.90 },
];

async function testIntentClassification90Percent() {
  logSection('SECTION 1: INTENT CLASSIFICATION - 90%+ CONFIDENCE REQUIREMENT');
  
  let passed = 0;
  let failed = 0;
  let totalConfidence = 0;
  let confidenceFailures = [];

  for (const testCase of INTENT_TEST_CASES) {
    logTest(`Intent: "${testCase.query}"`);
    
    const result = await apiCall('POST', `/orgs/${TEST_CONFIG.orgId}/ai-plans`, {
      goal: testCase.query,
    }, TEST_CONFIG.authToken);

    recordPerformance('Intent Classification', result.latency, result.ok);

    if (result.ok && result.data?.plan) {
      const plan = result.data.plan;
      const planData = typeof plan.planJson === 'string' ? JSON.parse(plan.planJson) : plan.planJson || plan;
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
        if (!intentMatch) {
          logFail(`Intent mismatch: Expected ${testCase.expectedIntent}, Got ${intent}`);
        }
        if (!confidenceOK) {
          logFail(`Low confidence: ${(confidence * 100).toFixed(1)}% < ${(testCase.minConfidence * 100).toFixed(0)}%`);
          confidenceFailures.push({ query: testCase.query, confidence, required: testCase.minConfidence });
        }
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
  
  if (accuracy < 100) {
    logFail(`Intent classification accuracy below 100% - CRITICAL`);
  }
  if (avgConfidence < 0.90) {
    logFail(`Average confidence below 90% - CRITICAL`);
    logInfo(`Confidence failures:`);
    confidenceFailures.forEach(f => {
      logInfo(`  "${f.query}": ${(f.confidence * 100).toFixed(1)}% (required: ${(f.required * 100).toFixed(0)}%)`);
    });
  }
}

// ============================================================================
// SECTION 2: ANTI-HALLUCINATION TESTING
// ============================================================================

const HALLUCINATION_TEST_CASES = [
  {
    name: 'No Data - Should Not Invent Numbers',
    query: 'What is our current revenue?',
    shouldHaveDataWarnings: true,
    shouldNotHaveSpecificNumbers: true,
  },
  {
    name: 'Limited Data - Should State Limitations',
    query: 'Forecast revenue for next 12 months',
    shouldHaveDataWarnings: true,
  },
  {
    name: 'Calculations Must Be Grounded',
    query: 'If we have $500,000 cash and burn $80,000/month, what is our runway?',
    shouldHaveCalculations: true,
    shouldHaveEvidence: true,
  },
];

async function testAntiHallucination() {
  logSection('SECTION 2: ANTI-HALLUCINATION TESTING');
  
  let passed = 0;
  let failed = 0;

  for (const testCase of HALLUCINATION_TEST_CASES) {
    logTest(`Anti-Hallucination: ${testCase.name}`);
    
    const result = await apiCall('POST', `/orgs/${TEST_CONFIG.orgId}/ai-plans`, {
      goal: testCase.query,
    }, TEST_CONFIG.authToken);

    if (result.ok && result.data?.plan) {
      const plan = result.data.plan;
      const planData = typeof plan.planJson === 'string' ? JSON.parse(plan.planJson) : plan.planJson || plan;
      const naturalText = planData.structuredResponse?.natural_text || planData.natural_text || '';
      const recommendations = planData.stagedChanges || planData.structuredResponse?.recommendations || [];
      const evidence = planData.structuredResponse?.evidence || [];
      
      let testPassed = true;
      
      // Check for data warnings if required
      if (testCase.shouldHaveDataWarnings) {
        const hasDataWarning = naturalText.toLowerCase().includes('insufficient data') ||
                               naturalText.toLowerCase().includes('connect your accounting') ||
                               naturalText.toLowerCase().includes('no data available') ||
                               naturalText.toLowerCase().includes('data limitation');
        if (!hasDataWarning) {
          logFail('Missing data warning - may be hallucinating');
          testPassed = false;
        } else {
          logPass('Has appropriate data warnings');
        }
      }
      
      // Check that specific numbers aren't invented
      if (testCase.shouldNotHaveSpecificNumbers) {
        const hasUnsupportedNumbers = recommendations.some(rec => {
          if (rec.impact) {
            for (const value of Object.values(rec.impact)) {
              if (typeof value === 'number' && value > 1000 && !rec.evidence && !rec.dataSources) {
                return true; // Large number without evidence
              }
            }
          }
          return false;
        });
        if (hasUnsupportedNumbers) {
          logFail('Found numbers without evidence - potential hallucination');
          testPassed = false;
        } else {
          logPass('No unsupported numbers found');
        }
      }
      
      // Check for evidence/calculations
      if (testCase.shouldHaveEvidence) {
        const hasEvidence = evidence.length > 0 || 
                           planData.metadata?.groundingEvidenceCount > 0 ||
                           recommendations.some(r => r.evidence && r.evidence.length > 0);
        if (!hasEvidence) {
          logFail('Missing evidence - response not grounded');
          testPassed = false;
        } else {
          logPass('Has evidence/grounding');
        }
      }
      
      if (testCase.shouldHaveCalculations) {
        const hasCalculations = planData.structuredResponse?.calculations ||
                               planData.metadata?.calculationsPerformed > 0;
        if (!hasCalculations) {
          logFail('Missing calculations - response not grounded');
          testPassed = false;
        } else {
          logPass('Has calculations');
        }
      }
      
      if (testPassed) {
        passed++;
        recordTest('Anti-Hallucination', testCase.name, true, 'All checks passed');
      } else {
        failed++;
        recordTest('Anti-Hallucination', testCase.name, false, 'Hallucination detected');
      }
    } else {
      logFail(`Request failed: ${result.data?.error?.message || 'Unknown error'}`);
      failed++;
      recordTest('Anti-Hallucination', testCase.name, false, 'Request failed');
    }
  }

  const accuracy = (passed / HALLUCINATION_TEST_CASES.length) * 100;
  log(`\nAnti-Hallucination Results: ${passed}/${HALLUCINATION_TEST_CASES.length} passed (${accuracy.toFixed(1)}%)`);
  
  if (accuracy < 100) {
    logFail(`Anti-hallucination accuracy below 100% - CRITICAL`);
  }
}

// ============================================================================
// SECTION 3: FINANCIAL CALCULATIONS - PERFECT ACCURACY
// ============================================================================

const CALCULATION_TEST_CASES = [
  {
    name: 'Runway Calculation',
    query: 'If we have $500,000 cash and burn $80,000/month, what is our runway?',
    expectedResult: 6.25,
    tolerance: 0.01,
  },
  {
    name: 'Burn Rate from Runway',
    query: 'We have 12 months runway with $600,000 cash. What is our monthly burn?',
    expectedResult: 50000,
    tolerance: 1000,
  },
  {
    name: 'Revenue Growth',
    query: 'Current revenue is $100k per month. With 10% monthly growth, what is revenue in 6 months?',
    expectedResult: 177156,
    tolerance: 5000,
  },
  {
    name: 'Hire Impact',
    query: 'If we hire 3 engineers at $150k per year each, what is the monthly cost impact?',
    expectedResult: 37500,
    tolerance: 1000,
  },
];

async function testFinancialCalculationsPerfect() {
  logSection('SECTION 3: FINANCIAL CALCULATIONS - PERFECT ACCURACY');
  
  let passed = 0;
  let failed = 0;

  for (const testCase of CALCULATION_TEST_CASES) {
    logTest(`Calculation: ${testCase.name}`);
    
    const result = await apiCall('POST', `/orgs/${TEST_CONFIG.orgId}/ai-plans`, {
      goal: testCase.query,
    }, TEST_CONFIG.authToken);

    if (result.ok && result.data?.plan) {
      const plan = result.data.plan;
      const planData = typeof plan.planJson === 'string' ? JSON.parse(plan.planJson) : plan.planJson || plan;
      const calculations = planData.structuredResponse?.calculations || planData.calculations || {};
      const stagedChanges = planData.stagedChanges || [];
      
      let foundResult = null;
      
      // Check calculations object - prioritize specific keys
      if (testCase.name === 'Burn Rate from Runway') {
        if (calculations.burnRate !== undefined) {
          foundResult = calculations.burnRate;
        } else if (calculations.calculate_burn_rate !== undefined) {
          foundResult = calculations.calculate_burn_rate;
        }
      } else if (testCase.name === 'Revenue Growth') {
        if (calculations.futureRevenue !== undefined) {
          foundResult = calculations.futureRevenue;
        } else if (calculations.forecast_revenue !== undefined) {
          foundResult = calculations.forecast_revenue;
        }
      } else if (testCase.name === 'Hire Impact') {
        if (calculations.monthlyCost !== undefined) {
          foundResult = calculations.monthlyCost;
        } else if (calculations.calculate_hire_impact !== undefined) {
          foundResult = calculations.calculate_hire_impact;
        }
      } else if (testCase.name === 'Runway Calculation') {
        if (calculations.runway !== undefined) {
          foundResult = calculations.runway;
        } else if (calculations.calculate_runway !== undefined) {
          foundResult = calculations.calculate_runway;
        }
      }
      
      // Fallback: check all calculation values
      if (!foundResult) {
        for (const [key, value] of Object.entries(calculations)) {
          if (typeof value === 'number') {
            // Skip runway months if we're looking for burn rate
            if (testCase.name === 'Burn Rate from Runway' && (key.includes('runway') || value < 100)) {
              continue;
            }
            foundResult = value;
            break;
          }
        }
      }
      
      // Check staged changes for calculation results in impact
      if (!foundResult && stagedChanges.length > 0) {
        for (const change of stagedChanges) {
          if (change.impact) {
            // Specific checks for each test case
            if (testCase.name === 'Burn Rate from Runway') {
              if (change.impact.monthlyBurn !== undefined) {
                foundResult = change.impact.monthlyBurn;
                break;
              }
              if (change.impact.burnRate !== undefined) {
                foundResult = change.impact.burnRate;
                break;
              }
              if (change.impact.calculated_monthly_burn !== undefined) {
                foundResult = change.impact.calculated_monthly_burn;
                break;
              }
            } else if (testCase.name === 'Revenue Growth') {
              if (change.impact.futureRevenue !== undefined) {
                foundResult = change.impact.futureRevenue;
                break;
              }
              if (change.impact.projectedRevenue !== undefined) {
                foundResult = change.impact.projectedRevenue;
                break;
              }
            } else if (testCase.name === 'Hire Impact') {
              if (change.impact.monthlyCost !== undefined) {
                foundResult = change.impact.monthlyCost;
                break;
              }
              if (change.impact.cost !== undefined) {
                foundResult = change.impact.cost;
                break;
              }
            }
            // Fallback: any numeric value in impact
            for (const [key, value] of Object.entries(change.impact)) {
              if (typeof value === 'number' && value > 0) {
                foundResult = value;
                break;
              }
            }
          }
          if (foundResult) break;
        }
      }
      
      // Check execution results (from execute method) - prioritize calculated_monthly_burn for burn rate
      if (!foundResult && planData.structuredResponse?.executionResults) {
        for (const result of planData.structuredResponse.executionResults) {
          // For burn rate, prioritize calculated_monthly_burn
          if (testCase.name === 'Burn Rate from Runway' && result.params?.calculated_monthly_burn !== undefined) {
            foundResult = result.params.calculated_monthly_burn;
            break;
          }
          if (result.params?.result !== undefined && typeof result.params.result === 'number') {
            // Skip runway months if we're looking for burn rate
            if (testCase.name === 'Burn Rate from Runway' && result.params.result < 100) {
              continue;
            }
            foundResult = result.params.result;
            break;
          }
          if (result.result !== undefined && typeof result.result === 'number') {
            // Skip runway months if we're looking for burn rate
            if (testCase.name === 'Burn Rate from Runway' && result.result < 100) {
              continue;
            }
            foundResult = result.result;
            break;
          }
        }
      }
      
      // Also check planData.executionResults (alternative location)
      if (!foundResult && planData.executionResults) {
        for (const result of planData.executionResults) {
          // For burn rate, prioritize calculated_monthly_burn
          if (testCase.name === 'Burn Rate from Runway' && result.params?.calculated_monthly_burn !== undefined) {
            foundResult = result.params.calculated_monthly_burn;
            break;
          }
          if (result.params?.result !== undefined && typeof result.params.result === 'number') {
            if (testCase.name === 'Burn Rate from Runway' && result.params.result < 100) {
              continue;
            }
            foundResult = result.params.result;
            break;
          }
          if (result.result !== undefined && typeof result.result === 'number') {
            if (testCase.name === 'Burn Rate from Runway' && result.result < 100) {
              continue;
            }
            foundResult = result.result;
            break;
          }
        }
      }
      
      // Check params directly in executionResults for calculated_monthly_burn
      if (!foundResult && testCase.name === 'Burn Rate from Runway') {
        const execResults = planData.structuredResponse?.executionResults || planData.executionResults || [];
        for (const result of execResults) {
          if (result.params?.calculated_monthly_burn !== undefined) {
            foundResult = result.params.calculated_monthly_burn;
            break;
          }
        }
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
        logFail('Calculation result not found in response');
        failed++;
        recordTest('Financial Calculations', testCase.name, false, 'Result not found');
      }
    } else {
      logFail(`Request failed: ${result.data?.error?.message || 'Unknown error'}`);
      failed++;
      recordTest('Financial Calculations', testCase.name, false, 'Request failed');
    }
  }

  const accuracy = (passed / CALCULATION_TEST_CASES.length) * 100;
  log(`\nFinancial Calculations Results: ${passed}/${CALCULATION_TEST_CASES.length} passed (${accuracy.toFixed(1)}%)`);
  
  if (accuracy < 100) {
    logFail(`Financial calculation accuracy below 100% - CRITICAL`);
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
  log('FINAL PRODUCTION-LEVEL AI CFO TEST SUITE', 'bright');
  log('90%+ Confidence | No Hallucinations | Perfect Accuracy', 'bright');
  log('='.repeat(80) + '\n', 'bright');

  if (!await authenticate()) {
    logFail('Cannot proceed without authentication');
    return;
  }

  await testIntentClassification90Percent();
  await testAntiHallucination();
  await testFinancialCalculationsPerfect();

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
    const color = percentage === '100.0' ? 'green' : 'red';
    log(`${category}: ${passed}/${total} (${percentage}%)`, color);
  });

  const total = TEST_CONFIG.testResults.length;
  const totalPassed = TEST_CONFIG.testResults.filter(r => r.passed).length;
  const totalPercentage = ((totalPassed / total) * 100).toFixed(1);

  log(`\nOVERALL: ${totalPassed}/${total} tests passed (${totalPercentage}%)`, 
      totalPercentage === '100.0' ? 'green' : 'red');

  if (totalPercentage === '100.0') {
    log('\n✅ ALL TESTS PASSED - PRODUCTION READY', 'green');
  } else {
    log('\n❌ SOME TESTS FAILED - NOT PRODUCTION READY', 'red');
    process.exit(1);
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

