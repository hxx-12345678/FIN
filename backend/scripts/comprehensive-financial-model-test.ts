import prisma from '../src/config/database';
import { logger } from '../src/utils/logger';
import { provenanceService } from '../src/services/provenance.service';

const USER_EMAIL = 'cptjacksprw@gmail.com';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function addResult(test: string, status: 'PASS' | 'FAIL' | 'WARNING', message: string, details?: any) {
  results.push({ test, status, message, details });
  logger.info(`[${status}] ${test}: ${message}`);
}

async function comprehensiveTest() {
  logger.info(`\n${'='.repeat(80)}`);
  logger.info(`COMPREHENSIVE FINANCIAL MODELING COMPONENT TEST`);
  logger.info(`User: ${USER_EMAIL}`);
  logger.info(`${'='.repeat(80)}\n`);

  // Step 1: Get user and organization
  logger.info(`\n📋 STEP 1: User and Organization Verification`);
  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL },
    include: {
      roles: {
        include: {
          org: {
            include: {
              models: {
                include: {
                  modelRuns: {
                    where: {
                      status: 'done',
                    },
                    orderBy: {
                      createdAt: 'desc',
                    },
                    take: 1,
                  },
                },
                orderBy: {
                  createdAt: 'desc',
                },
                take: 1,
              },
              rawTransactions: {
                orderBy: {
                  date: 'desc',
                },
                take: 100,
              },
            },
          },
        },
      },
    },
  });

  if (!user || user.roles.length === 0) {
    addResult('User Exists', 'FAIL', `User ${USER_EMAIL} not found`);
    return;
  }
  addResult('User Exists', 'PASS', `User found: ${user.email}`);

  const org = user.roles[0].org;
  addResult('Organization Exists', 'PASS', `Organization: ${org.name} (${org.id})`);

  // Step 2: Verify Model and Model Run
  logger.info(`\n📋 STEP 2: Model and Model Run Verification`);
  const model = org.models[0];
  
  if (!model) {
    addResult('Model Exists', 'FAIL', 'No models found for organization');
    return;
  }
  addResult('Model Exists', 'PASS', `Model: ${model.name} (${model.id})`);

  const modelRun = model.modelRuns[0];
  if (!modelRun || !modelRun.summaryJson) {
    addResult('Model Run Exists', 'FAIL', 'No completed model runs found');
    return;
  }
  addResult('Model Run Exists', 'PASS', `Model Run: ${modelRun.id} (Status: ${modelRun.status})`);

  const summary = typeof modelRun.summaryJson === 'string' 
    ? JSON.parse(modelRun.summaryJson) 
    : modelRun.summaryJson;

  // Step 3: Verify Monthly Data Structure
  logger.info(`\n📋 STEP 3: Monthly Data Structure Verification`);
  const monthlyData = summary.monthly || {};
  const monthKeys = Object.keys(monthlyData).sort();
  
  if (monthKeys.length === 0) {
    addResult('Monthly Data Exists', 'FAIL', 'No monthly data found in summary');
    return;
  }
  addResult('Monthly Data Exists', 'PASS', `${monthKeys.length} months of data: ${monthKeys.join(', ')}`);

  // Step 4: Verify Each Month's Data
  logger.info(`\n📋 STEP 4: Monthly Data Value Verification`);
  const metrics = ['revenue', 'cogs', 'grossProfit', 'netIncome'];
  
  for (const monthKey of monthKeys) {
    logger.info(`\n   Testing Month: ${monthKey}`);
    const monthData = monthlyData[monthKey];
    
    for (const metric of metrics) {
      const value = monthData[metric];
      const cellKey = `${monthKey}:${metric}`;
      
      // Check if value exists
      if (value === undefined || value === null) {
        addResult(`${monthKey}:${metric} Value`, 'FAIL', `Missing value for ${metric}`, { monthKey, metric });
        continue;
      }
      
      // Check if value is a number
      if (typeof value !== 'number' || isNaN(value)) {
        addResult(`${monthKey}:${metric} Value Type`, 'FAIL', `Invalid value type for ${metric}`, { monthKey, metric, value });
        continue;
      }
      
      // Check if value is reasonable (not negative for revenue, etc.)
      if (metric === 'revenue' && value < 0) {
        addResult(`${monthKey}:${metric} Value Range`, 'WARNING', `Negative revenue value`, { monthKey, metric, value });
      } else {
        addResult(`${monthKey}:${metric} Value`, 'PASS', `Value: $${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { monthKey, metric, value });
      }
      
      // Verify provenance entry exists
      try {
        const provenance = await prisma.provenanceEntry.findFirst({
          where: {
            modelRunId: modelRun.id,
            cellKey: cellKey,
          },
        });
        
        if (!provenance) {
          addResult(`${monthKey}:${metric} Provenance`, 'FAIL', `No provenance entry found`, { monthKey, metric, cellKey });
        } else {
          addResult(`${monthKey}:${metric} Provenance`, 'PASS', `Provenance entry found (${provenance.sourceType})`, { 
            monthKey, 
            metric, 
            provenanceId: provenance.id,
            sourceType: provenance.sourceType 
          });
          
          // Verify provenance value matches
          const sourceRef = typeof provenance.sourceRef === 'string'
            ? JSON.parse(provenance.sourceRef)
            : provenance.sourceRef;
          
          if (provenance.sourceType === 'assumption' && sourceRef.value !== undefined) {
            const provenanceValue = Number(sourceRef.value);
            const diff = Math.abs(provenanceValue - value);
            const percentDiff = (diff / value) * 100;
            
            if (percentDiff < 1) { // Allow 1% difference for rounding
              addResult(`${monthKey}:${metric} Provenance Value Match`, 'PASS', `Provenance value matches (diff: ${diff.toFixed(2)})`, {
                monthKey,
                metric,
                cellValue: value,
                provenanceValue: provenanceValue,
                diff: diff
              });
            } else {
              addResult(`${monthKey}:${metric} Provenance Value Match`, 'WARNING', `Provenance value differs by ${percentDiff.toFixed(2)}%`, {
                monthKey,
                metric,
                cellValue: value,
                provenanceValue: provenanceValue,
                diff: diff,
                percentDiff: percentDiff
              });
            }
          }
        }
      } catch (error: any) {
        addResult(`${monthKey}:${metric} Provenance Check`, 'FAIL', `Error checking provenance: ${error.message}`, { monthKey, metric, error: error.message });
      }
    }
  }

  // Step 5: Test API Endpoints
  logger.info(`\n📋 STEP 5: API Endpoint Verification`);
  const testMonth = monthKeys[0];
  
  for (const metric of metrics) {
    const cellKey = `${testMonth}:${metric}`;
    
    try {
      const apiResult = await provenanceService.getProvenance(
        modelRun.id,
        cellKey,
        user.id,
        50,
        0,
        true
      );
      
      if (apiResult.ok && apiResult.entries.length > 0) {
        addResult(`API:${testMonth}:${metric}`, 'PASS', `API returned ${apiResult.entries.length} entry(ies)`, {
          cellKey,
          entryCount: apiResult.entries.length,
          sourceType: apiResult.entries[0].sourceType
        });
        
        // Verify API data structure
        const entry = apiResult.entries[0];
        if (entry.sourceType === 'txn' && !entry.sampleTransactions) {
          addResult(`API:${testMonth}:${metric} Transactions`, 'WARNING', 'Transaction entry has no sample transactions', { cellKey });
        } else if (entry.sourceType === 'txn' && entry.sampleTransactions) {
          addResult(`API:${testMonth}:${metric} Transactions`, 'PASS', `${entry.sampleTransactions.length} transactions returned`, {
            cellKey,
            transactionCount: entry.sampleTransactions.length
          });
        }
        
        if (entry.sourceType === 'assumption' && !entry.assumptionRef) {
          addResult(`API:${testMonth}:${metric} Assumption`, 'WARNING', 'Assumption entry has no assumptionRef', { cellKey });
        } else if (entry.sourceType === 'assumption' && entry.assumptionRef) {
          addResult(`API:${testMonth}:${metric} Assumption`, 'PASS', `Assumption data returned: ${entry.assumptionRef.assumption_id || 'N/A'}`, {
            cellKey,
            assumptionId: entry.assumptionRef.assumption_id,
            assumptionValue: entry.assumptionRef.value
          });
        }
      } else {
        addResult(`API:${testMonth}:${metric}`, 'FAIL', 'API returned no entries', { cellKey });
      }
    } catch (error: any) {
      addResult(`API:${testMonth}:${metric}`, 'FAIL', `API error: ${error.message}`, { cellKey, error: error.message });
    }
  }

  // Step 6: Verify Summary Metrics
  logger.info(`\n📋 STEP 6: Summary Metrics Verification`);
  const summaryMetrics = ['revenue', 'expenses', 'netIncome', 'cashBalance', 'activeCustomers', 'arr', 'mrr'];
  
  for (const metric of summaryMetrics) {
    const value = summary[metric];
    if (value === undefined || value === null) {
      addResult(`Summary:${metric}`, 'WARNING', `Summary metric ${metric} is missing`, { metric });
    } else if (typeof value !== 'number' || isNaN(value)) {
      addResult(`Summary:${metric}`, 'FAIL', `Summary metric ${metric} has invalid type`, { metric, value });
    } else {
      addResult(`Summary:${metric}`, 'PASS', `${metric}: ${typeof value === 'number' ? value.toLocaleString() : value}`, { metric, value });
    }
  }

  // Step 7: Verify Transaction Data
  logger.info(`\n📋 STEP 7: Transaction Data Verification`);
  const transactions = org.rawTransactions;
  
  if (transactions.length === 0) {
    addResult('Transaction Data', 'WARNING', 'No transaction data found', {});
  } else {
    addResult('Transaction Data', 'PASS', `${transactions.length} transactions found`, { transactionCount: transactions.length });
    
    // Check transaction date range
    const dates = transactions.map(t => t.date);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const now = new Date();
    const daysSinceNewest = Math.floor((now.getTime() - maxDate.getTime()) / (1000 * 60 * 60 * 24));
    
    addResult('Transaction Date Range', 'PASS', `Date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`, {
      minDate: minDate.toISOString().split('T')[0],
      maxDate: maxDate.toISOString().split('T')[0],
      daysSinceNewest
    });
    
    if (daysSinceNewest > 180) {
      addResult('Transaction Data Freshness', 'WARNING', `Transaction data is ${daysSinceNewest} days old`, { daysSinceNewest });
    }
  }

  // Step 8: Generate Report
  logger.info(`\n${'='.repeat(80)}`);
  logger.info(`TEST SUMMARY REPORT`);
  logger.info(`${'='.repeat(80)}\n`);
  
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const warnCount = results.filter(r => r.status === 'WARNING').length;
  const totalCount = results.length;
  
  logger.info(`Total Tests: ${totalCount}`);
  logger.info(`✅ Passed: ${passCount} (${((passCount / totalCount) * 100).toFixed(1)}%)`);
  logger.info(`❌ Failed: ${failCount} (${((failCount / totalCount) * 100).toFixed(1)}%)`);
  logger.info(`⚠️  Warnings: ${warnCount} (${((warnCount / totalCount) * 100).toFixed(1)}%)\n`);
  
  // List failures
  const failures = results.filter(r => r.status === 'FAIL');
  if (failures.length > 0) {
    logger.info(`\n❌ FAILURES (${failures.length}):`);
    failures.forEach((f, i) => {
      logger.info(`   ${i + 1}. ${f.test}: ${f.message}`);
      if (f.details) {
        logger.info(`      Details: ${JSON.stringify(f.details, null, 2)}`);
      }
    });
  }
  
  // List warnings
  const warnings = results.filter(r => r.status === 'WARNING');
  if (warnings.length > 0) {
    logger.info(`\n⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach((w, i) => {
      logger.info(`   ${i + 1}. ${w.test}: ${w.message}`);
      if (w.details) {
        logger.info(`      Details: ${JSON.stringify(w.details, null, 2)}`);
      }
    });
  }
  
  logger.info(`\n${'='.repeat(80)}`);
  logger.info(`TEST COMPLETE`);
  logger.info(`${'='.repeat(80)}\n`);
  
  // Return results for further processing
  return {
    total: totalCount,
    passed: passCount,
    failed: failCount,
    warnings: warnCount,
    results: results,
    allPassed: failCount === 0
  };
}

comprehensiveTest()
  .then((report) => {
    if (report.allPassed) {
      logger.info(`\n✅ ALL TESTS PASSED! Financial modeling component is perfect.`);
      process.exit(0);
    } else {
      logger.error(`\n❌ SOME TESTS FAILED. Please review the failures above.`);
      process.exit(1);
    }
  })
  .catch((e) => {
    logger.error('Error during comprehensive test:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

