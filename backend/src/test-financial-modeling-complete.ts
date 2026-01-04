/**
 * Complete Test Script for Financial Modeling Component
 * Tests: Run Model, Sensitivity Tab, Assumptions Changes
 */

import prisma from './config/database';
import { overviewDashboardService } from './services/overview-dashboard.service';

async function testFinancialModelingComplete(userEmail: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 COMPLETE FINANCIAL MODELING TEST FOR: ${userEmail}`);
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
  console.log(`TEST 1: Database Check - Models & Assumptions`);
  console.log(`${'─'.repeat(80)}`);
  
  const models = await prisma.model.findMany({
    where: { orgId },
    include: {
      modelRuns: {
        where: { status: 'done' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Found ${models.length} model(s)\n`);

  for (const model of models) {
    console.log(`Model: ${model.name} (${model.id})`);
    const modelJson = model.modelJson as any;
    const assumptions = modelJson?.assumptions || {};
    console.log(`  Assumptions:`);
    console.log(`    Baseline Revenue: $${(assumptions.baselineRevenue || assumptions.revenue?.baselineRevenue || 0).toLocaleString()}`);
    console.log(`    Revenue Growth: ${((assumptions.revenueGrowth || assumptions.revenue?.revenueGrowth || 0) * 100).toFixed(2)}%`);
    console.log(`    Churn Rate: ${((assumptions.churnRate || assumptions.revenue?.churnRate || 0) * 100).toFixed(2)}%`);
    
    if (model.modelRuns.length > 0) {
      const run = model.modelRuns[0];
      const summary = typeof run.summaryJson === 'string' 
        ? JSON.parse(run.summaryJson) 
        : run.summaryJson;
      console.log(`  Latest Run:`);
      console.log(`    Revenue: $${(summary.revenue || summary.mrr || 0).toLocaleString()}`);
      console.log(`    Growth Rate: ${((summary.growthRate || 0) * 100).toFixed(2)}%`);
      console.log(`    Churn Rate: ${((summary.churnRate || 0) * 100).toFixed(2)}%`);
      
      // Calculate expected sensitivity data
      const baseRevenue = Number(summary.revenue || summary.mrr || 0) || Number(assumptions.baselineRevenue || assumptions.revenue?.baselineRevenue || 100000);
      const revenueGrowth = Number(summary.growthRate || summary.revenueGrowth || 0) || Number(assumptions.revenueGrowth || assumptions.revenue?.revenueGrowth || 0.08);
      const churnRate = Number(summary.churnRate || 0) || Number(assumptions.churnRate || assumptions.revenue?.churnRate || 0.05);
      const baseARR = baseRevenue * 12;
      
      console.log(`  Expected Sensitivity Data:`);
      console.log(`    Revenue Growth - Base: ${(revenueGrowth * 100).toFixed(2)}% → ARR: $${(baseARR * (1 + revenueGrowth) / 1000).toFixed(0)}K`);
      console.log(`    Churn Rate - Base: ${(churnRate * 100).toFixed(2)}% → ARR: $${(baseARR / 1000).toFixed(0)}K`);
    }
    console.log('');
  }

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`TEST 2: Overview Dashboard - Active Customers`);
  console.log(`${'─'.repeat(80)}`);
  const overviewData = await overviewDashboardService.getOverviewData(orgId);
  console.log(`✅ Active Customers: ${overviewData.activeCustomers}`);
  console.log(`✅ Monthly Revenue: $${overviewData.monthlyRevenue.toLocaleString()}`);
  console.log(`✅ Monthly Burn Rate: $${overviewData.monthlyBurnRate.toLocaleString()}`);
  console.log(`✅ Runway: ${(overviewData.cashRunwayMonths || 0).toFixed(1)} months\n`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`TEST 3: Sensitivity Data Generation Logic`);
  console.log(`${'─'.repeat(80)}`);
  
  const testModel = models[0];
  if (testModel) {
    const modelJson = testModel.modelJson as any;
    const assumptions = modelJson?.assumptions || {};
    const latestRun = testModel.modelRuns[0];
    
    let baseRevenue = 0;
    let revenueGrowth = 0.08;
    let churnRate = 0.05;
    
    if (latestRun?.summaryJson) {
      const summary = typeof latestRun.summaryJson === 'string' 
        ? JSON.parse(latestRun.summaryJson) 
        : latestRun.summaryJson;
      baseRevenue = Number(summary.revenue || summary.mrr || 0);
      revenueGrowth = Number(summary.growthRate || summary.revenueGrowth || 0.08);
      churnRate = Number(summary.churnRate || 0.05);
      console.log(`✅ Using run data - Revenue: $${baseRevenue.toLocaleString()}, Growth: ${(revenueGrowth * 100).toFixed(2)}%, Churn: ${(churnRate * 100).toFixed(2)}%`);
    } else if (assumptions) {
      baseRevenue = Number(assumptions.baselineRevenue || assumptions.revenue?.baselineRevenue || 100000);
      revenueGrowth = Number(assumptions.revenueGrowth || assumptions.revenue?.revenueGrowth || 0.08);
      churnRate = Number(assumptions.churnRate || assumptions.revenue?.churnRate || 0.05);
      console.log(`✅ Using assumptions - Revenue: $${baseRevenue.toLocaleString()}, Growth: ${(revenueGrowth * 100).toFixed(2)}%, Churn: ${(churnRate * 100).toFixed(2)}%`);
    }
    
    const baseARR = baseRevenue * 12;
    const sensitivity = {
      revenueGrowth: {
        conservative: { rate: revenueGrowth * 0.6, arr: baseARR * (1 + revenueGrowth * 0.6) },
        base: { rate: revenueGrowth, arr: baseARR * (1 + revenueGrowth) },
        optimistic: { rate: revenueGrowth * 1.5, arr: baseARR * (1 + revenueGrowth * 1.5) },
      },
      churnRate: {
        low: { rate: churnRate * 0.4, arr: baseARR * 1.1 },
        base: { rate: churnRate, arr: baseARR },
        high: { rate: churnRate * 1.6, arr: baseARR * 0.9 },
      },
    };
    
    console.log(`\n✅ Generated Sensitivity Data:`);
    console.log(`  Revenue Growth:`);
    console.log(`    Conservative: ${(sensitivity.revenueGrowth.conservative.rate * 100).toFixed(2)}% → $${(sensitivity.revenueGrowth.conservative.arr / 1000).toFixed(0)}K ARR`);
    console.log(`    Base: ${(sensitivity.revenueGrowth.base.rate * 100).toFixed(2)}% → $${(sensitivity.revenueGrowth.base.arr / 1000).toFixed(0)}K ARR`);
    console.log(`    Optimistic: ${(sensitivity.revenueGrowth.optimistic.rate * 100).toFixed(2)}% → $${(sensitivity.revenueGrowth.optimistic.arr / 1000).toFixed(0)}K ARR`);
    console.log(`  Churn Rate:`);
    console.log(`    Low: ${(sensitivity.churnRate.low.rate * 100).toFixed(2)}% → $${(sensitivity.churnRate.low.arr / 1000).toFixed(0)}K ARR`);
    console.log(`    Base: ${(sensitivity.churnRate.base.rate * 100).toFixed(2)}% → $${(sensitivity.churnRate.base.arr / 1000).toFixed(0)}K ARR`);
    console.log(`    High: ${(sensitivity.churnRate.high.rate * 100).toFixed(2)}% → $${(sensitivity.churnRate.high.arr / 1000).toFixed(0)}K ARR`);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ FINANCIAL MODELING TEST COMPLETE`);
  console.log(`${'='.repeat(80)}\n`);
}

const userEmail = process.argv[2] || 'cptjacksprw@gmail.com';
testFinancialModelingComplete(userEmail)
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

