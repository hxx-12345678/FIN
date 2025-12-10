/**
 * Final Verification Script
 * Runs all test suites and provides comprehensive summary
 */

const { spawn } = require('child_process');
const path = require('path');

const testSuites = [
  { name: 'Industry Templates', file: 'test-industry-templates.js' },
  { name: 'Monte Carlo Metering', file: 'test-monte-carlo-metering.js' },
  { name: 'Investor Export', file: 'test-investor-export.js' },
  { name: 'Onboarding Wizard', file: 'test-onboarding-wizard.js' },
  { name: 'Security Basics', file: 'test-security-basics.js' },
  { name: 'All Features', file: 'test-all-features.js' },
  { name: 'Edge Cases', file: 'test-comprehensive-edge-cases.js' },
];

const results = [];

function runTest(testFile, testName) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🧪 ${testName}`);
    console.log('='.repeat(70));

    const startTime = Date.now();
    const testProcess = spawn('node', [testFile], {
      cwd: __dirname,
      stdio: 'pipe',
      shell: true,
    });

    let output = '';
    let errorOutput = '';

    testProcess.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });

    testProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      process.stderr.write(data);
    });

    testProcess.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const passed = code === 0;
      
      // Extract test summary from output
      const summaryMatch = output.match(/Success Rate: ([\d.]+)%/);
      const successRate = summaryMatch ? summaryMatch[1] : (passed ? '100.0' : '0.0');
      
      // Extract passed/failed counts
      const passedMatch = output.match(/✅ Passed: (\d+)/);
      const failedMatch = output.match(/❌ Failed: (\d+)/);
      const passedCount = passedMatch ? parseInt(passedMatch[1]) : 0;
      const failedCount = failedMatch ? parseInt(failedMatch[1]) : 0;

      results.push({
        name: testName,
        file: testFile,
        passed,
        code,
        duration: `${duration}s`,
        successRate: `${successRate}%`,
        passedCount,
        failedCount,
      });

      console.log(`\n⏱️  Duration: ${duration}s | Success Rate: ${successRate}%`);
      resolve();
    });

    testProcess.on('error', (error) => {
      results.push({
        name: testName,
        file: testFile,
        passed: false,
        code: 1,
        duration: '0s',
        successRate: '0%',
        error: error.message,
      });
      resolve();
    });
  });
}

async function runAllTests() {
  console.log('\n🚀 FINAL VERIFICATION - ALL TEST SUITES');
  console.log('='.repeat(70));
  console.log(`Running ${testSuites.length} comprehensive test suites...\n`);

  for (const suite of testSuites) {
    await runTest(suite.file, suite.name);
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL VERIFICATION SUMMARY');
  console.log('='.repeat(70));

  const totalPassed = results.filter(r => r.passed).length;
  const totalFailed = results.filter(r => !r.passed).length;
  const totalTests = results.reduce((sum, r) => sum + r.passedCount + r.failedCount, 0);
  const totalPassedTests = results.reduce((sum, r) => sum + r.passedCount, 0);
  const totalFailedTests = results.reduce((sum, r) => sum + r.failedCount, 0);

  console.log(`\n✅ Test Suites Passed: ${totalPassed}/${testSuites.length}`);
  console.log(`❌ Test Suites Failed: ${totalFailed}/${testSuites.length}`);
  console.log(`\n📈 Individual Test Results:`);
  console.log(`   ✅ Passed: ${totalPassedTests}`);
  console.log(`   ❌ Failed: ${totalFailedTests}`);
  console.log(`   📊 Total: ${totalTests}`);

  console.log('\n' + '-'.repeat(70));
  console.log('📋 DETAILED RESULTS:');
  console.log('-'.repeat(70));

  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.name}`);
    console.log(`   Duration: ${result.duration} | Success Rate: ${result.successRate}`);
    console.log(`   Tests: ${result.passedCount} passed, ${result.failedCount} failed`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });

  const overallSuccessRate = totalTests > 0 
    ? ((totalPassedTests / totalTests) * 100).toFixed(1)
    : '0.0';

  console.log('='.repeat(70));
  console.log(`\n🎯 OVERALL SUCCESS RATE: ${overallSuccessRate}%`);
  console.log('='.repeat(70));

  if (totalFailed === 0 && totalFailedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Production ready! 🎉\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review and fix issues.\n');
    process.exit(1);
  }
}

runAllTests();

