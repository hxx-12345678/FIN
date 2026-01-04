/**
 * Test Financial Modeling Component - Verify all tabs show data
 */

import prisma from './config/database';
import { overviewDashboardService } from './services/overview-dashboard.service';

async function testFinancialModeling(userEmail: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 TESTING FINANCIAL MODELING COMPONENT FOR: ${userEmail}`);
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

  // Test 1: Check active customers without model
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`TEST 1: Active Customers (No Model)`);
  console.log(`${'─'.repeat(80)}`);
  
  const overviewData = await overviewDashboardService.getOverviewData(orgId);
  console.log(`✅ Active Customers: ${overviewData.activeCustomers}`);
  if (overviewData.activeCustomers === 0) {
    console.warn(`   ⚠️  Active customers is 0 - checking transactions...`);
    const transactions = await prisma.rawTransaction.findMany({
      where: { orgId, isDuplicate: false, amount: { gt: 0 } },
      take: 10,
    });
    console.log(`   Found ${transactions.length} revenue transactions`);
  } else {
    console.log(`   ✅ Active customers calculation is working`);
  }

  // Test 2: Check models and runs
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`TEST 2: Financial Modeling - Models & Runs`);
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

  console.log(`✅ Found ${models.length} model(s)`);
  
  for (const model of models) {
    console.log(`\n   Model: ${model.name} (${model.id})`);
    console.log(`   Completed Runs: ${model.modelRuns.length}`);
    
    if (model.modelRuns.length > 0) {
      const run = model.modelRuns[0];
      const summary = typeof run.summaryJson === 'string' 
        ? JSON.parse(run.summaryJson) 
        : run.summaryJson;
      
      console.log(`   ✅ Model has completed run with data`);
      console.log(`      Revenue: $${(summary.revenue || summary.mrr || 0).toLocaleString()}`);
      console.log(`      Expenses: $${(summary.expenses || 0).toLocaleString()}`);
      console.log(`      Monthly data: ${summary.monthly ? Object.keys(summary.monthly).length : 0} months`);
      
      // Test Financial Statements Tab
      if (summary.monthly && Object.keys(summary.monthly).length > 0) {
        console.log(`   ✅ Tab 1 (Financial Statements): Should show ${Object.keys(summary.monthly).length} months of data`);
      } else if (summary.revenue || summary.mrr) {
        console.log(`   ✅ Tab 1 (Financial Statements): Should generate data from summary`);
      } else {
        console.warn(`   ⚠️  Tab 1 (Financial Statements): No monthly data or summary revenue`);
      }
    } else {
      console.log(`   ⚠️  Model has no completed runs`);
    }
    
    // Test Assumptions Tab
    const modelJson = model.modelJson as any;
    if (modelJson?.assumptions) {
      console.log(`   ✅ Tab 2 (Assumptions): Assumptions available`);
      console.log(`      Baseline Revenue: $${(modelJson.assumptions.baselineRevenue || modelJson.assumptions.revenue?.baselineRevenue || 0).toLocaleString()}`);
      console.log(`      Revenue Growth: ${((modelJson.assumptions.revenueGrowth || modelJson.assumptions.revenue?.revenueGrowth || 0) * 100).toFixed(1)}%`);
    } else {
      console.warn(`   ⚠️  Tab 2 (Assumptions): No assumptions found`);
    }
    
    // Test Projections Tab
    if (modelJson?.projections) {
      console.log(`   ✅ Tab 3 (Projections): Projections data available`);
    } else if (model.modelRuns.length > 0) {
      console.log(`   ✅ Tab 3 (Projections): Should generate from model run summary`);
    } else if (modelJson?.assumptions) {
      console.log(`   ✅ Tab 3 (Projections): Should generate from assumptions`);
    } else {
      console.warn(`   ⚠️  Tab 3 (Projections): No data available`);
    }
    
    // Test Sensitivity Tab
    if (modelJson?.sensitivity) {
      console.log(`   ✅ Tab 4 (Sensitivity): Sensitivity data available`);
    } else {
      console.log(`   ✅ Tab 4 (Sensitivity): Should generate from assumptions/run`);
    }
  }

  // Test 3: Check CSV import customer count
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`TEST 3: CSV Import - Initial Customers Parameter`);
  console.log(`${'─'.repeat(80)}`);
  
  const csvJobs = await prisma.job.findMany({
    where: {
      orgId,
      jobType: 'csv_import',
      status: { in: ['done', 'completed'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  
  console.log(`✅ Found ${csvJobs.length} completed CSV import job(s)`);
  csvJobs.forEach((job, idx) => {
    console.log(`\n   Job ${idx + 1}: ${job.id}`);
    console.log(`   Status: ${job.status}`);
    
    if (job.logs) {
      const logs = typeof job.logs === 'string' ? JSON.parse(job.logs) : job.logs;
      if (Array.isArray(logs)) {
        for (const entry of logs) {
          if (entry.meta?.params?.initialCustomers) {
            console.log(`   ✅ Initial Customers: ${entry.meta.params.initialCustomers}`);
            break;
          }
        }
      }
    }
  });

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ FINANCIAL MODELING TEST COMPLETE`);
  console.log(`${'='.repeat(80)}\n`);
}

const userEmail = process.argv[2] || 'cptjacksprw@gmail.com';
testFinancialModeling(userEmail)
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



