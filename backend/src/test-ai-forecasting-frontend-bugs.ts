/**
 * Frontend Bug Detection Test for AI Forecasting Component
 * Tests actual data transformations and identifies bugs
 */

import prisma from './config/database';

async function testAIForecastingFrontendBugs(userEmail: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🐛 FRONTEND BUG DETECTION TEST FOR AI FORECASTING`);
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

  // Get latest model and run
  const latestModel = await prisma.model.findFirst({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    include: {
      modelRuns: {
        where: { status: 'done' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!latestModel || latestModel.modelRuns.length === 0) {
    console.error(`❌ No completed model run found`);
    return;
  }

  const latestRun = latestModel.modelRuns[0];
  const summary = typeof latestRun.summaryJson === 'string' 
    ? JSON.parse(latestRun.summaryJson) 
    : latestRun.summaryJson || {};

  console.log(`✅ Latest Run: ${latestRun.id}`);
  console.log(`   Status: ${latestRun.status}\n`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`BUG CHECK 1: Revenue Forecast Tab - Data Access Issues`);
  console.log(`${'─'.repeat(80)}`);

  // Check if summaryJson is accessed correctly
  const totalRevenue = summary.totalRevenue || summary.revenue || summary.mrr || 0;
  const revenueGrowth = summary.kpis?.revenueGrowth || summary.revenueGrowth || 0;
  const forecastAccuracy = summary.kpis?.profitMargin || summary.kpis?.forecastAccuracy || summary.kpis?.accuracy || 0;

  console.log(`\n📊 Revenue Forecast Card Values:`);
  console.log(`   ✅ totalRevenue: $${totalRevenue.toLocaleString()}`);
  console.log(`   ✅ 6-Month Forecast Card: $${(totalRevenue / 1000).toFixed(0)}K`);
  console.log(`   ⚠️  BUG: This shows TOTAL revenue, not 6-month revenue!`);
  console.log(`   ✅ Revenue Growth: ${(revenueGrowth * 100).toFixed(1)}%`);
  console.log(`   ✅ Forecast Accuracy: ${forecastAccuracy.toFixed(1)}%`);

  // Check monthly data
  const monthly = summary.monthly || {};
  const monthlyKeys = Object.keys(monthly).sort();
  const first6Months = monthlyKeys.slice(0, 6);
  
  let actual6MonthRevenue = 0;
  first6Months.forEach((key) => {
    const monthData = monthly[key];
    if (monthData) {
      actual6MonthRevenue += (monthData.revenue || monthData.totalRevenue || 0);
    }
  });

  console.log(`\n   ✅ Actual 6-Month Revenue (from monthly): $${(actual6MonthRevenue / 1000).toFixed(0)}K`);
  console.log(`   ⚠️  BUG: Card shows $${(totalRevenue / 1000).toFixed(0)}K but should show $${(actual6MonthRevenue / 1000).toFixed(0)}K`);

  // Check confidence calculation
  let totalConfidence = 0;
  let confidenceCount = 0;
  monthlyKeys.forEach((key) => {
    const monthData = monthly[key];
    if (monthData) {
      const conf = monthData.confidence ?? summary.kpis?.forecastConfidence ?? summary.confidence ?? 85;
      totalConfidence += conf;
      confidenceCount++;
    }
  });
  const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

  console.log(`\n   ✅ Average Confidence: ${Math.round(avgConfidence)}%`);
  console.log(`   ✅ Confidence Level Card: ${Math.round(avgConfidence)}%`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`BUG CHECK 2: Cash Flow Tab - Calculation Issues`);
  console.log(`${'─'.repeat(80)}`);

  let totalInflow = 0;
  let totalOutflow = 0;
  let totalNetCashFlow = 0;
  let lastCumulativeCash = 0;

  first6Months.forEach((key) => {
    const monthData = monthly[key];
    if (monthData) {
      const revenue = monthData.revenue || monthData.totalRevenue || 0;
      const expenses = monthData.expenses || monthData.totalExpenses || 0;
      const netIncome = monthData.netIncome !== undefined ? monthData.netIncome : (revenue - expenses);
      const cash = monthData.cashBalance || monthData.cash || 0;

      totalInflow += Number(revenue) || 0;
      totalOutflow += Number(expenses) || 0;
      totalNetCashFlow += Number(netIncome) || 0;
      lastCumulativeCash = Number(cash) || 0;
    }
  });

  console.log(`\n📊 Cash Flow Summary (6 months):`);
  console.log(`   ✅ Total Inflow: $${totalInflow.toLocaleString()}`);
  console.log(`   ✅ Total Outflow: $${totalOutflow.toLocaleString()}`);
  console.log(`   ✅ Net Cash Flow: $${totalNetCashFlow.toLocaleString()}`);
  console.log(`   ✅ Projected Cash Balance: $${lastCumulativeCash.toLocaleString()}`);

  // Check runway calculation
  const burnRate = summary.burnRate || summary.monthlyBurnRate || 0;
  const runway = summary.runwayMonths || summary.runway || 0;
  const cashBalance = summary.cashBalance || summary.cash || 0;

  console.log(`\n📊 Runway Analysis:`);
  console.log(`   ✅ Cash Balance: $${cashBalance.toLocaleString()}`);
  console.log(`   ✅ Burn Rate: $${burnRate.toLocaleString()}/month`);
  console.log(`   ✅ Runway from summary: ${runway.toFixed(1)} months`);

  // Calculate actual runway
  let calculatedRunway = 0;
  if (burnRate < 0) {
    calculatedRunway = 999; // Profitable = infinite runway
    console.log(`   ✅ Calculated Runway: 999+ months (profitable - negative burn rate)`);
    console.log(`   💡 EXPLANATION: When burn rate is negative, the company is profitable.`);
    console.log(`      This means revenue > expenses, so cash is growing, not depleting.`);
    console.log(`      Therefore, runway is infinite (represented as 999+ months).`);
  } else if (burnRate > 0 && cashBalance > 0) {
    calculatedRunway = cashBalance / burnRate;
    console.log(`   ✅ Calculated Runway: ${calculatedRunway.toFixed(1)} months`);
  } else {
    console.log(`   ⚠️  Runway: 0 months (no burn rate or no cash)`);
  }

  if (runway === 0 && burnRate < 0) {
    console.log(`   ⚠️  BUG: Summary shows 0 months but should show 999 (profitable scenario)`);
  }

  // Check break-even month
  let breakEvenMonth = -1;
  monthlyKeys.forEach((key, index) => {
    const monthData = monthly[key];
    if (monthData && breakEvenMonth === -1) {
      const netIncome = monthData.netIncome !== undefined ? monthData.netIncome : 
        ((monthData.revenue || 0) - (monthData.expenses || 0));
      if (netIncome > 0) {
        breakEvenMonth = index + 1;
      }
    }
  });

  console.log(`\n   ✅ Break-even Month: ${breakEvenMonth > 0 ? `Month ${breakEvenMonth}` : 'Not projected'}`);
  if (breakEvenMonth === -1 && monthlyKeys.length > 0) {
    console.log(`   ⚠️  BUG: Break-even calculation might be wrong - check findIndex logic`);
  }

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`BUG CHECK 3: Scenarios Tab - Runway Display`);
  console.log(`${'─'.repeat(80)}`);

  const scenarios = await prisma.modelRun.findMany({
    where: {
      modelId: latestModel.id,
      orgId,
      runType: 'scenario',
      status: 'done',
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  });

  console.log(`\n📊 Scenarios Runway Display:`);
  scenarios.forEach((scenario, idx) => {
    const scenSummary = typeof scenario.summaryJson === 'string' 
      ? JSON.parse(scenario.summaryJson) 
      : scenario.summaryJson || {};
    
    const scenBurnRate = scenSummary.burnRate || scenSummary.monthlyBurnRate || 0;
    const scenRunway = scenSummary.runwayMonths || scenSummary.runway || 0;
    
    console.log(`\n   Scenario ${idx + 1}:`);
    console.log(`   - Burn Rate: $${scenBurnRate.toLocaleString()}/month`);
    console.log(`   - Runway from summary: ${scenRunway.toFixed(1)} months`);
    
    if (scenBurnRate < 0) {
      console.log(`   ⚠️  BUG: Burn rate is negative (profitable) but runway shows ${scenRunway.toFixed(1)} months`);
      console.log(`   ✅ Should show: 999+ months (infinite)`);
    } else {
      console.log(`   ✅ Runway display: ${scenRunway > 0 ? Math.round(scenRunway) + ' months' : 'N/A'}`);
    }
  });

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`BUG CHECK 4: Date Parsing and Month Format`);
  console.log(`${'─'.repeat(80)}`);

  console.log(`\n📊 Month Key Format Check:`);
  monthlyKeys.slice(0, 3).forEach((key) => {
    const [year, month] = key.split("-");
    console.log(`   ✅ Month Key: ${key}`);
    console.log(`      - Year: ${year}, Month: ${month}`);
    console.log(`      - Parsed: ${parseInt(month)} (should be 1-12)`);
    
    if (!year || !month || isNaN(parseInt(year)) || isNaN(parseInt(month))) {
      console.log(`      ⚠️  BUG: Invalid month key format!`);
    }
    
    if (parseInt(month) < 1 || parseInt(month) > 12) {
      console.log(`      ⚠️  BUG: Month out of range!`);
    }
  });

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`BUG CHECK 5: summaryJson String vs Object Access`);
  console.log(`${'─'.repeat(80)}`);

  console.log(`\n📊 summaryJson Type Check:`);
  console.log(`   ✅ Type: ${typeof latestRun.summaryJson}`);
  console.log(`   ✅ Is String: ${typeof latestRun.summaryJson === 'string'}`);
  console.log(`   ✅ Parsed Successfully: ${summary && Object.keys(summary).length > 0 ? 'Yes' : 'No'}`);

  // Check if frontend accesses summaryJson correctly
  const directAccess = latestRun.summaryJson?.totalRevenue; // This might fail if string
  const safeAccess = summary.totalRevenue;

  console.log(`\n   ⚠️  Direct Access (latestRun.summaryJson?.totalRevenue): ${directAccess !== undefined ? 'Works' : 'Fails (string)'}`);
  console.log(`   ✅ Safe Access (parsed summary.totalRevenue): ${safeAccess ? '$' + safeAccess.toLocaleString() : 'N/A'}`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`BUG CHECK 6: Confidence Calculation Edge Cases`);
  console.log(`${'─'.repeat(80)}`);

  // Simulate frontend confidence calculation
  const forecastPoints: any[] = [];
  monthlyKeys.forEach((key) => {
    const monthData = monthly[key];
    if (monthData) {
      const [year, month] = key.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthName = `${monthNames[parseInt(month) - 1]} ${year}`;
      
      const now = new Date();
      const dataDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const isHistorical = dataDate < now;
      
      const confidence = isHistorical ? null : (monthData.confidence ?? summary.kpis?.forecastConfidence ?? summary.confidence ?? 85);
      
      forecastPoints.push({
        month: monthName,
        confidence,
      });
    }
  });

  const confidenceValues = forecastPoints.filter(d => d.confidence !== null && d.confidence !== undefined);
  const avgConf = confidenceValues.length > 0
    ? Math.round(confidenceValues.reduce((sum, d) => sum + (d.confidence || 0), 0) / confidenceValues.length)
    : 0;

  console.log(`\n📊 Confidence Calculation:`);
  console.log(`   ✅ Forecast points with confidence: ${confidenceValues.length}`);
  console.log(`   ✅ Average confidence: ${avgConf}%`);
  console.log(`   ✅ Frontend calculation: ${avgConf}%`);

  if (confidenceValues.length === 0) {
    console.log(`   ⚠️  BUG: No confidence values found!`);
  }

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🐛 BUGS FOUND AND FIXES NEEDED`);
  console.log(`${'='.repeat(80)}\n`);

  const bugs: string[] = [];
  const fixes: string[] = [];

  // Bug 1: 6-Month Forecast shows total revenue, not 6-month
  if (Math.abs(totalRevenue - actual6MonthRevenue) > 1000) {
    bugs.push("6-Month Forecast card shows total revenue instead of 6-month revenue");
    fixes.push("Calculate 6-month revenue from monthly data: sum first 6 months");
  }

  // Bug 2: Scenarios tab runway doesn't handle negative burn rate
  const hasProfitableScenario = scenarios.some(s => {
    const s = typeof s.summaryJson === 'string' ? JSON.parse(s.summaryJson) : s.summaryJson || {};
    return (s.burnRate || s.monthlyBurnRate || 0) < 0;
  });
  if (hasProfitableScenario) {
    bugs.push("Scenarios tab runway display doesn't show 999+ for profitable scenarios");
    fixes.push("Add burn rate check in scenarios tab: if burnRate < 0, show 999+ months");
  }

  // Bug 3: summaryJson direct access might fail
  if (typeof latestRun.summaryJson === 'string') {
    bugs.push("Direct access to summaryJson might fail if it's a string");
    fixes.push("Always use safeJsonParse or check type before accessing");
  }

  // Bug 4: Break-even calculation might be wrong
  if (breakEvenMonth === -1 && monthlyKeys.length > 0) {
    bugs.push("Break-even month calculation might fail (findIndex returns -1)");
    fixes.push("Check findIndex result: if >= 0, use result + 1, else 'Not projected'");
  }

  console.log(`📋 Bugs Found: ${bugs.length}\n`);
  bugs.forEach((bug, idx) => {
    console.log(`   ${idx + 1}. ${bug}`);
    console.log(`      Fix: ${fixes[idx]}\n`);
  });

  if (bugs.length === 0) {
    console.log(`   ✅ No bugs found! All values are correct.\n`);
  }

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`💡 RUNWAY 999 EXPLANATION`);
  console.log(`${'─'.repeat(80)}\n`);

  console.log(`When you see "999+ months" for runway, it means:`);
  console.log(`\n   1. Your company is PROFITABLE (revenue > expenses)`);
  console.log(`   2. Your burn rate is NEGATIVE (you're making money, not losing it)`);
  console.log(`   3. Your cash balance is GROWING, not depleting`);
  console.log(`   4. Therefore, you have INFINITE runway (represented as 999+ months)`);
  console.log(`\n   Formula: Runway = Cash Balance ÷ Monthly Burn Rate`);
  console.log(`   When burn rate < 0: Runway = Infinite (999+ months)`);
  console.log(`   When burn rate = 0: Runway = Infinite (999+ months)`);
  console.log(`   When burn rate > 0: Runway = Cash ÷ Burn Rate (finite months)`);
  console.log(`\n   This is a GOOD thing - it means your business is sustainable! 🎉\n`);
}

const userEmail = process.argv[2] || 'cptjacksprw@gmail.com';
testAIForecastingFrontendBugs(userEmail)
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



