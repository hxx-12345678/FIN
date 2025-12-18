"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../src/config/database"));
const logger_1 = require("../src/utils/logger");
const provenance_service_1 = require("../src/services/provenance.service");
const USER_EMAIL = 'cptjacksprw@gmail.com';
const results = [];
function addResult(test, status, message, details) {
    results.push({ test, status, message, details });
    logger_1.logger.info(`[${status}] ${test}: ${message}`);
}
function buildReport() {
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    const warnCount = results.filter(r => r.status === 'WARNING').length;
    const totalCount = results.length;
    return {
        total: totalCount,
        passed: passCount,
        failed: failCount,
        warnings: warnCount,
        results,
        allPassed: failCount === 0,
    };
}
async function comprehensiveTest() {
    logger_1.logger.info(`\n${'='.repeat(80)}`);
    logger_1.logger.info(`COMPREHENSIVE FINANCIAL MODELING COMPONENT TEST`);
    logger_1.logger.info(`User: ${USER_EMAIL}`);
    logger_1.logger.info(`${'='.repeat(80)}\n`);
    // Step 1: Get user and organization
    logger_1.logger.info(`\n📋 STEP 1: User and Organization Verification`);
    const user = await database_1.default.user.findUnique({
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
        return buildReport();
    }
    addResult('User Exists', 'PASS', `User found: ${user.email}`);
    const org = user.roles[0].org;
    addResult('Organization Exists', 'PASS', `Organization: ${org.name} (${org.id})`);
    // Step 2: Verify Model and Model Run
    logger_1.logger.info(`\n📋 STEP 2: Model and Model Run Verification`);
    const model = org.models[0];
    if (!model) {
        addResult('Model Exists', 'FAIL', 'No models found for organization');
        return buildReport();
    }
    addResult('Model Exists', 'PASS', `Model: ${model.name} (${model.id})`);
    const modelRun = model.modelRuns[0];
    if (!modelRun || !modelRun.summaryJson) {
        addResult('Model Run Exists', 'FAIL', 'No completed model runs found');
        return buildReport();
    }
    addResult('Model Run Exists', 'PASS', `Model Run: ${modelRun.id} (Status: ${modelRun.status})`);
    const summary = typeof modelRun.summaryJson === 'string'
        ? JSON.parse(modelRun.summaryJson)
        : modelRun.summaryJson;
    // Step 3: Verify Monthly Data Structure
    logger_1.logger.info(`\n📋 STEP 3: Monthly Data Structure Verification`);
    const monthlyData = summary.monthly || summary.fullResult?.monthly || {};
    const monthKeys = Object.keys(monthlyData).sort();
    if (monthKeys.length === 0) {
        addResult('Monthly Data Exists', 'FAIL', 'No monthly data found in summary');
        return buildReport();
    }
    addResult('Monthly Data Exists', 'PASS', `${monthKeys.length} months of data: ${monthKeys.join(', ')}`);
    // Step 4: Verify Each Month's Data
    logger_1.logger.info(`\n📋 STEP 4: Monthly Data Value Verification`);
    const metrics = ['revenue', 'cogs', 'grossProfit', 'netIncome'];
    for (const monthKey of monthKeys) {
        logger_1.logger.info(`\n   Testing Month: ${monthKey}`);
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
            }
            else {
                addResult(`${monthKey}:${metric} Value`, 'PASS', `Value: $${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { monthKey, metric, value });
            }
            // Verify provenance entry exists
            try {
                const provenance = await database_1.default.provenanceEntry.findFirst({
                    where: {
                        modelRunId: modelRun.id,
                        cellKey: cellKey,
                    },
                });
                if (!provenance) {
                    addResult(`${monthKey}:${metric} Provenance`, 'FAIL', `No provenance entry found`, { monthKey, metric, cellKey });
                }
                else {
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
                        }
                        else {
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
            }
            catch (error) {
                addResult(`${monthKey}:${metric} Provenance Check`, 'FAIL', `Error checking provenance: ${error.message}`, { monthKey, metric, error: error.message });
            }
        }
    }
    // Step 5: Test API Endpoints
    logger_1.logger.info(`\n📋 STEP 5: API Endpoint Verification`);
    const testMonth = monthKeys[0];
    for (const metric of metrics) {
        const cellKey = `${testMonth}:${metric}`;
        try {
            const apiResult = await provenance_service_1.provenanceService.getProvenance(modelRun.id, cellKey, user.id, 50, 0, true);
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
                }
                else if (entry.sourceType === 'txn' && entry.sampleTransactions) {
                    addResult(`API:${testMonth}:${metric} Transactions`, 'PASS', `${entry.sampleTransactions.length} transactions returned`, {
                        cellKey,
                        transactionCount: entry.sampleTransactions.length
                    });
                }
                if (entry.sourceType === 'assumption' && !entry.assumptionRef) {
                    addResult(`API:${testMonth}:${metric} Assumption`, 'WARNING', 'Assumption entry has no assumptionRef', { cellKey });
                }
                else if (entry.sourceType === 'assumption' && entry.assumptionRef) {
                    addResult(`API:${testMonth}:${metric} Assumption`, 'PASS', `Assumption data returned: ${entry.assumptionRef.assumption_id || 'N/A'}`, {
                        cellKey,
                        assumptionId: entry.assumptionRef.assumption_id,
                        assumptionValue: entry.assumptionRef.value
                    });
                }
            }
            else {
                addResult(`API:${testMonth}:${metric}`, 'FAIL', 'API returned no entries', { cellKey });
            }
        }
        catch (error) {
            addResult(`API:${testMonth}:${metric}`, 'FAIL', `API error: ${error.message}`, { cellKey, error: error.message });
        }
    }
    // Step 6: Verify Summary Metrics
    logger_1.logger.info(`\n📋 STEP 6: Summary Metrics Verification`);
    const summaryMetrics = ['revenue', 'expenses', 'netIncome', 'cashBalance', 'activeCustomers', 'arr', 'mrr'];
    for (const metric of summaryMetrics) {
        const value = summary[metric];
        if (value === undefined || value === null) {
            addResult(`Summary:${metric}`, 'WARNING', `Summary metric ${metric} is missing`, { metric });
        }
        else if (typeof value !== 'number' || isNaN(value)) {
            addResult(`Summary:${metric}`, 'FAIL', `Summary metric ${metric} has invalid type`, { metric, value });
        }
        else {
            addResult(`Summary:${metric}`, 'PASS', `${metric}: ${typeof value === 'number' ? value.toLocaleString() : value}`, { metric, value });
        }
    }
    // Step 7: Verify Transaction Data
    logger_1.logger.info(`\n📋 STEP 7: Transaction Data Verification`);
    const transactions = org.rawTransactions;
    if (transactions.length === 0) {
        addResult('Transaction Data', 'WARNING', 'No transaction data found', {});
    }
    else {
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
    logger_1.logger.info(`\n${'='.repeat(80)}`);
    logger_1.logger.info(`TEST SUMMARY REPORT`);
    logger_1.logger.info(`${'='.repeat(80)}\n`);
    const report = buildReport();
    logger_1.logger.info(`Total Tests: ${report.total}`);
    logger_1.logger.info(`✅ Passed: ${report.passed} (${((report.passed / report.total) * 100).toFixed(1)}%)`);
    logger_1.logger.info(`❌ Failed: ${report.failed} (${((report.failed / report.total) * 100).toFixed(1)}%)`);
    logger_1.logger.info(`⚠️  Warnings: ${report.warnings} (${((report.warnings / report.total) * 100).toFixed(1)}%)\n`);
    // List failures
    const failures = results.filter(r => r.status === 'FAIL');
    if (failures.length > 0) {
        logger_1.logger.info(`\n❌ FAILURES (${failures.length}):`);
        failures.forEach((f, i) => {
            logger_1.logger.info(`   ${i + 1}. ${f.test}: ${f.message}`);
            if (f.details) {
                logger_1.logger.info(`      Details: ${JSON.stringify(f.details, null, 2)}`);
            }
        });
    }
    // List warnings
    const warnings = results.filter(r => r.status === 'WARNING');
    if (warnings.length > 0) {
        logger_1.logger.info(`\n⚠️  WARNINGS (${warnings.length}):`);
        warnings.forEach((w, i) => {
            logger_1.logger.info(`   ${i + 1}. ${w.test}: ${w.message}`);
            if (w.details) {
                logger_1.logger.info(`      Details: ${JSON.stringify(w.details, null, 2)}`);
            }
        });
    }
    logger_1.logger.info(`\n${'='.repeat(80)}`);
    logger_1.logger.info(`TEST COMPLETE`);
    logger_1.logger.info(`${'='.repeat(80)}\n`);
    // Return results for further processing
    return report;
}
comprehensiveTest()
    .then((report) => {
    if (report.allPassed) {
        logger_1.logger.info(`\n✅ ALL TESTS PASSED! Financial modeling component is perfect.`);
        process.exit(0);
    }
    else {
        logger_1.logger.error(`\n❌ SOME TESTS FAILED. Please review the failures above.`);
        process.exit(1);
    }
})
    .catch((e) => {
    logger_1.logger.error('Error during comprehensive test:', e);
    process.exit(1);
})
    .finally(async () => {
    await database_1.default.$disconnect();
});
//# sourceMappingURL=comprehensive-financial-model-test.js.map