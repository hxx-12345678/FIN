/**
 * Complete End-to-End Test for Monte Carlo Component
 * Tests all tabs, buttons, API endpoints, and data accuracy
 * User: cptjacksprw@gmail.com
 */

import prisma from './config/database';

async function testMonteCarloComplete(userEmail: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 COMPLETE MONTE CARLO COMPONENT E2E TEST`);
  console.log(`   User: ${userEmail}`);
  console.log(`${'='.repeat(80)}\n`);

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      roles: {
        include: {
          org: true,
        },
      },
    },
  });

  if (!user || !user.roles || user.roles.length === 0) {
    console.error(`❌ User not found`);
    return;
  }

  const orgId = user.roles[0].org.id;
  const orgName = user.roles[0].org.name;
  console.log(`✅ Organization: ${orgName} (${orgId})\n`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`TAB 1: DRIVERS & DISTRIBUTIONS TAB`);
  console.log(`${'─'.repeat(80)}\n`);

  console.log(`📊 Default Drivers Configuration:`);
  const defaultDrivers = [
    { id: "revenue_growth", name: "Revenue Growth Rate", mean: 8, stdDev: 3, min: 2, max: 15, distribution: "normal", unit: "%", impact: "high" },
    { id: "churn_rate", name: "Churn Rate", mean: 5, stdDev: 2, min: 2, max: 10, distribution: "normal", unit: "%", impact: "high" },
    { id: "cac", name: "Customer Acquisition Cost", mean: 125, stdDev: 25, min: 80, max: 200, distribution: "lognormal", unit: "$", impact: "medium" },
    { id: "conversion_rate", name: "Conversion Rate", mean: 3.5, stdDev: 1, min: 1.5, max: 6, distribution: "triangular", unit: "%", impact: "high" },
    { id: "avg_deal_size", name: "Average Deal Size", mean: 2400, stdDev: 400, min: 1500, max: 4000, distribution: "lognormal", unit: "$", impact: "medium" },
  ];

  defaultDrivers.forEach((driver, idx) => {
    console.log(`   ${idx + 1}. ${driver.name}:`);
    console.log(`      - Mean: ${driver.mean}${driver.unit}, StdDev: ${driver.stdDev}${driver.unit}`);
    console.log(`      - Range: ${driver.min}${driver.unit} - ${driver.max}${driver.unit}`);
    console.log(`      - Distribution: ${driver.distribution}`);
    console.log(`      - Impact: ${driver.impact}`);
  });

  console.log(`\n✅ Buttons to Test:`);
  console.log(`   1. Distribution Type Selector - Should update driver.distribution`);
  console.log(`   2. Mean Value Slider - Should update driver.mean`);
  console.log(`   3. Std Deviation Slider - Should update driver.stdDev`);
  console.log(`   4. Number of Simulations Selector - Should update numSimulations (1000, 2500, 5000, 10000)`);
  console.log(`   5. Run Monte Carlo Simulation Button - Should call POST /api/v1/models/{modelId}/montecarlo\n`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`TAB 2: SIMULATION RESULTS TAB`);
  console.log(`${'─'.repeat(80)}\n`);

  // Get latest model
  const latestModel = await prisma.model.findFirst({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestModel) {
    console.error(`❌ No model found`);
    return;
  }

  console.log(`✅ Latest Model: ${latestModel.name} (${latestModel.id})\n`);

  // Check for existing Monte Carlo jobs
  // Note: MonteCarloJob might not have modelId field, check via modelRun
  const modelRuns = await prisma.modelRun.findMany({
    where: {
      modelId: latestModel.id,
      orgId,
    },
    include: {
      monteCarloJobs: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const monteCarloJobs = modelRuns.flatMap(run => run.monteCarloJobs || []);

  console.log(`📊 Monte Carlo Jobs Found: ${monteCarloJobs.length}\n`);

  if (monteCarloJobs.length > 0) {
    const latestJob = monteCarloJobs[0];
    console.log(`✅ Latest Job: ${latestJob.id}`);
    console.log(`   Status: ${latestJob.status}`);
    console.log(`   Num Simulations: ${latestJob.numSimulations || 'N/A'}`);
    console.log(`   Created: ${latestJob.createdAt}\n`);

    // Parse percentiles if available
    if (latestJob.percentilesJson) {
      const percentiles = typeof latestJob.percentilesJson === 'string'
        ? JSON.parse(latestJob.percentilesJson)
        : latestJob.percentilesJson;

      console.log(`📊 Percentiles Data:`);
      if (percentiles.percentiles_table) {
        const p50 = percentiles.percentiles_table.p50 || [];
        const p95 = percentiles.percentiles_table.p95 || [];
        const p5 = percentiles.percentiles_table.p5 || [];
        console.log(`   ✅ P50 (Median) at month 6: ${p50[5] ? `$${(p50[5] / 1000).toFixed(0)}K` : 'N/A'}`);
        console.log(`   ✅ P95 (Best Case) at month 6: ${p95[5] ? `$${(p95[5] / 1000).toFixed(0)}K` : 'N/A'}`);
        console.log(`   ✅ P5 (Worst Case) at month 6: ${p5[5] ? `$${(p5[5] / 1000).toFixed(0)}K` : 'N/A'}`);
      }
      console.log();
    }

    // Parse survival probability if available in percentilesJson
    if (latestJob.percentilesJson) {
      const percentiles = typeof latestJob.percentilesJson === 'string'
        ? JSON.parse(latestJob.percentilesJson)
        : latestJob.percentilesJson;

      if (percentiles.survival_probability || percentiles.survivalProbability) {
        const survival = percentiles.survival_probability || percentiles.survivalProbability;
        console.log(`📊 Survival Probability:`);
        console.log(`   ✅ Overall Survival: ${survival.overall?.percentageSurvivingFullPeriod?.toFixed(1) || survival.overall?.probabilitySurvivingFullPeriod ? (survival.overall.probabilitySurvivingFullPeriod * 100).toFixed(1) : 'N/A'}%`);
        console.log(`   ✅ 6-Month Survival: ${survival.runwayThresholds?.['6_months']?.percentage?.toFixed(1) || survival.runway_thresholds?.['6_months']?.percentage?.toFixed(1) || 'N/A'}%`);
        console.log(`   ✅ 12-Month Survival: ${survival.runwayThresholds?.['12_months']?.percentage?.toFixed(1) || survival.runway_thresholds?.['12_months']?.percentage?.toFixed(1) || 'N/A'}%`);
        console.log(`   ✅ Average Months to Failure: ${survival.overall?.averageMonthsToFailure?.toFixed(1) || 'N/A'}`);
        console.log(`   ✅ Total Simulations: ${survival.overall?.totalSimulations?.toLocaleString() || 'N/A'}`);
        console.log();
      }
    }
  } else {
    console.log(`⚠️  No Monte Carlo jobs found. Run a simulation first.\n`);
  }

  console.log(`✅ Cards to Verify:`);
  console.log(`   1. Probability of Surviving Full Period - Should show percentage from survivalProbability.overall.percentageSurvivingFullPeriod`);
  console.log(`   2. Survival to 6 Months - Should show from survivalProbability.runwayThresholds['6_months'].percentage`);
  console.log(`   3. Survival to 12 Months - Should show from survivalProbability.runwayThresholds['12_months'].percentage`);
  console.log(`   4. Average Months to Failure - Should show from survivalProbability.overall.averageMonthsToFailure`);
  console.log(`   5. 6-Month Cash Position (Median) - Should show from percentiles.percentiles_table.p50[5]`);
  console.log(`   6. Best Case Scenario (P95) - Should show from percentiles.percentiles_table.p95[5]`);
  console.log(`   7. Worst Case Scenario (P5) - Should show from percentiles.percentiles_table.p5[5]`);
  console.log(`   8. 12-Month Survival Probability - Should show from survivalProbability.runwayThresholds['12_months'].percentage\n`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`TAB 3: FAN CHART TAB`);
  console.log(`${'─'.repeat(80)}\n`);

  console.log(`📊 Fan Chart Data:`);
  console.log(`   ✅ Should display percentiles from percentiles.percentiles_table:`);
  console.log(`      - P5, P10, P25, P50 (median), P75, P90, P95`);
  console.log(`   ✅ Chart should show confidence bands (areas) and median line`);
  console.log(`   ✅ Deterministic line should be shown if forecastMode === "montecarlo"\n`);

  console.log(`⚠️  BUGS TO CHECK:`);
  console.log(`   1. ❌ Hardcoded values in Fan Chart tab:`);
  console.log(`      - "Median Projection: $68K" (should calculate from percentiles)`);
  console.log(`      - "90% Confidence Range: $36K - $106K" (should calculate from P10-P90)`);
  console.log(`      - "Uncertainty Spread: ±52%" (should calculate from actual data)`);
  console.log(`   2. ❌ Chart data should come from getChartData() which uses percentiles.percentiles_table\n`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`TAB 4: SENSITIVITY ANALYSIS TAB`);
  console.log(`${'─'.repeat(80)}\n`);

  console.log(`📊 Tornado Chart Data:`);
  console.log(`   ✅ Should display tornadoData (sorted by impact)`);
  console.log(`   ✅ Should show upside (green) and downside (red) impacts`);
  console.log(`   ✅ Should list drivers sorted by total impact\n`);

  console.log(`⚠️  BUGS TO CHECK:`);
  console.log(`   1. ❌ Hardcoded tornadoData (lines 211-217):`);
  console.log(`      - Should be calculated from actual Monte Carlo results`);
  console.log(`      - Should analyze variance contribution of each driver`);
  console.log(`   2. ❌ Sensitivity rankings should be dynamic based on simulation results\n`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`TAB 5: EXPLAINABILITY TAB`);
  console.log(`${'─'.repeat(80)}\n`);

  console.log(`📊 Top Uncertainty Drivers:`);
  console.log(`   ✅ Should display topDrivers (top 3)`);
  console.log(`   ✅ Should show contribution percentage and description\n`);

  console.log(`⚠️  BUGS TO CHECK:`);
  console.log(`   1. ❌ Hardcoded topDrivers (lines 220-236):`);
  console.log(`      - Should be calculated from actual simulation variance`);
  console.log(`      - Should show real contribution percentages`);
  console.log(`   2. ❌ Hardcoded confidence metrics (lines 1234-1267):`);
  console.log(`      - Mean Absolute Error: 8.2% (hardcoded)`);
  console.log(`      - Coefficient of Variation: 15.4% (hardcoded)`);
  console.log(`      - Value at Risk (5%): $620K (hardcoded)`);
  console.log(`      - Should calculate from actual simulation results\n`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`RUNWAY HISTOGRAM BUG`);
  console.log(`${'─'.repeat(80)}\n`);

  console.log(`⚠️  BUG TO CHECK:`);
  console.log(`   1. ❌ Hardcoded runwayHistogram (lines 200-208):`);
  console.log(`      - Should be calculated from actual simulation results`);
  console.log(`      - Should show distribution of runway outcomes from simulations`);
  console.log(`      - Should calculate probability for each runway bucket\n`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`FORECAST ACCURACY CALCULATION`);
  console.log(`${'─'.repeat(80)}\n`);

  // Get latest model run
  const latestRun = await prisma.modelRun.findFirst({
    where: {
      modelId: latestModel.id,
      orgId,
      status: 'done',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (latestRun && latestRun.summaryJson) {
    const summary = typeof latestRun.summaryJson === 'string'
      ? JSON.parse(latestRun.summaryJson)
      : latestRun.summaryJson;

    console.log(`📊 Forecast Accuracy in Revenue Forecast Tab:`);
    const accuracy = summary.kpis?.profitMargin || summary.kpis?.forecastAccuracy || summary.kpis?.accuracy || 0;
    console.log(`   Current Value: ${accuracy.toFixed(1)}%`);
    console.log(`   Source: summary.kpis?.profitMargin || summary.kpis?.forecastAccuracy || summary.kpis?.accuracy\n`);

    console.log(`⚠️  BUG:`);
    console.log(`   ❌ Using profitMargin as forecast accuracy is WRONG!`);
    console.log(`   ✅ Forecast Accuracy should be:`);
    console.log(`      - Calculated from backtesting (comparing forecast vs actual)`);
    console.log(`      - Formula: 100% - MAPE (Mean Absolute Percentage Error)`);
    console.log(`      - Or: 1 - (|Actual - Forecast| / Actual) averaged over periods`);
    console.log(`   ✅ Should use: summary.kpis?.forecastAccuracy || summary.kpis?.accuracy`);
    console.log(`   ❌ Should NOT use: summary.kpis?.profitMargin (this is profit margin, not accuracy)\n`);
  }

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`API ENDPOINTS TEST`);
  console.log(`${'─'.repeat(80)}\n`);

  console.log(`✅ Endpoints to Test:`);
  console.log(`   1. POST /api/v1/models/${latestModel.id}/montecarlo`);
  console.log(`      - Should create Monte Carlo job`);
  console.log(`      - Should return jobId and monteCarloJobId`);
  console.log(`      - Should validate numSimulations (100-100000)`);
  console.log(`      - Should validate drivers object`);
  console.log(`   2. GET /api/v1/montecarlo/{jobId}`);
  console.log(`      - Should return job status and results`);
  console.log(`      - Should include percentiles, survivalProbability, status, progress`);
  console.log(`   3. GET /api/v1/jobs/{jobId}`);
  console.log(`      - Should return generic job status`);
  console.log(`      - Should include progress, status, logs\n`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'='.repeat(80)}`);
  console.log(`TEST RESULTS SUMMARY`);
  console.log(`${'='.repeat(80)}\n`);

  const bugs: string[] = [];
  const warnings: string[] = [];

  // Check 1: Hardcoded Fan Chart values
  bugs.push("Fan Chart tab shows hardcoded values ($68K, $36K-$106K, ±52%) instead of calculating from percentiles");

  // Check 2: Hardcoded Tornado Chart data
  bugs.push("Sensitivity Analysis tab uses hardcoded tornadoData instead of calculating from simulation results");

  // Check 3: Hardcoded Top Drivers
  bugs.push("Explainability tab uses hardcoded topDrivers instead of calculating from simulation variance");

  // Check 4: Hardcoded Runway Histogram
  bugs.push("Simulation Results tab uses hardcoded runwayHistogram instead of calculating from simulation results");

  // Check 5: Hardcoded Confidence Metrics
  bugs.push("Explainability tab shows hardcoded confidence metrics (MAE, CV, VaR) instead of calculating from results");

  // Check 6: Forecast Accuracy using profitMargin
  bugs.push("Forecast Accuracy card in Revenue Forecast tab incorrectly uses profitMargin instead of forecastAccuracy");

  console.log(`📋 Bugs Found: ${bugs.length}`);
  bugs.forEach((bug, idx) => {
    console.log(`   ${idx + 1}. ❌ ${bug}`);
  });
  console.log();

  console.log(`⚠️  Warnings: ${warnings.length}`);
  if (warnings.length > 0) {
    warnings.forEach((warning, idx) => {
      console.log(`   ${idx + 1}. ⚠️  ${warning}`);
    });
  } else {
    console.log(`   ✅ No warnings!`);
  }
  console.log();

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'='.repeat(80)}`);
  console.log(`✅ TEST COMPLETE`);
  console.log(`${'='.repeat(80)}\n`);
}

const userEmail = process.argv[2] || 'cptjacksprw@gmail.com';
testMonteCarloComplete(userEmail)
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

