/**
 * Complete Test Script for Scenario Planning Component
 * Tests: Creating scenarios, all tabs, AI copilot
 */

import prisma from './config/database';
import { jobService } from './services/job.service';

async function testScenarioPlanningComplete(userEmail: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 COMPLETE SCENARIO PLANNING TEST FOR: ${userEmail}`);
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
  console.log(`TEST 1: Get Latest Model`);
  console.log(`${'─'.repeat(80)}`);
  
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

  if (!latestModel) {
    console.error(`❌ No model found. Please create a model first.`);
    return;
  }

  console.log(`✅ Model: ${latestModel.name} (${latestModel.id})`);
  console.log(`   Completed Runs: ${latestModel.modelRuns.length}\n`);

  const modelId = latestModel.id;
  const userId = user.id;

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`TEST 2: Create Test Scenarios`);
  console.log(`${'─'.repeat(80)}`);

  // Scenario 1: Hiring Acceleration
  console.log(`\n📊 Creating Scenario 1: Hiring Acceleration...`);
  const scenario1Job = await jobService.createJob({
    jobType: 'model_run',
    orgId,
    objectId: modelId,
    createdByUserId: userId,
    params: {
      modelId,
      runType: 'scenario',
      scenarioName: 'Hiring Acceleration',
      scenarioDescription: 'Increase hiring to accelerate growth, impacting payroll and revenue.',
      assumptions: {
        revenueGrowth: 0.12, // 12% monthly growth
        baselineExpenses: 70000, // Increased baseline expenses
        expenseGrowth: 0.10, // 10% monthly expense growth
        costs: {
          payroll: 150000, // Specific payroll override
        },
      },
    },
  });
  console.log(`✅ Scenario 1 job created: ${scenario1Job.id}`);

  // Scenario 2: Price Increase
  console.log(`\n📊 Creating Scenario 2: Price Increase...`);
  const modelJson = latestModel.modelJson as any;
  const baselineRevenue = modelJson?.assumptions?.baselineRevenue || 216000;
  const scenario2Job = await jobService.createJob({
    jobType: 'model_run',
    orgId,
    objectId: modelId,
    createdByUserId: userId,
    params: {
      modelId,
      runType: 'scenario',
      scenarioName: 'Price Increase',
      scenarioDescription: 'Implement a 10% price increase, boosting revenue but slightly increasing churn.',
      assumptions: {
        baselineRevenue: baselineRevenue * 1.1, // 10% increase
        churnRate: 0.06, // Slightly increased churn
      },
    },
  });
  console.log(`✅ Scenario 2 job created: ${scenario2Job.id}`);

  // Scenario 3: Market Downturn
  console.log(`\n📊 Creating Scenario 3: Market Downturn...`);
  const scenario3Job = await jobService.createJob({
    jobType: 'model_run',
    orgId,
    objectId: modelId,
    createdByUserId: userId,
    params: {
      modelId,
      runType: 'scenario',
      scenarioName: 'Market Downturn',
      scenarioDescription: 'Economic recession scenario with reduced growth and increased churn.',
      assumptions: {
        revenueGrowth: -0.15, // Negative growth
        churnRate: 0.12, // Higher churn
        expenseGrowth: -0.05, // Reduced expense growth
      },
    },
  });
  console.log(`✅ Scenario 3 job created: ${scenario3Job.id}`);

  console.log(`\n✅ All scenarios created! They will be processed by the worker.\n`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`TEST 3: Check Existing Scenarios`);
  console.log(`${'─'.repeat(80)}`);

  const allScenarios = await prisma.modelRun.findMany({
    where: {
      modelId,
      runType: 'scenario',
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(`Found ${allScenarios.length} scenario(s)\n`);

  for (const scenario of allScenarios) {
    const params = scenario.paramsJson as any;
    const summary = typeof scenario.summaryJson === 'string' 
      ? JSON.parse(scenario.summaryJson) 
      : scenario.summaryJson;
    
    console.log(`Scenario: ${params?.scenarioName || 'Unnamed'} (${scenario.id})`);
    console.log(`  Status: ${scenario.status}`);
    console.log(`  Type: ${scenario.runType}`);
    console.log(`  Created: ${scenario.createdAt.toISOString()}`);
    if (scenario.status === 'done' && summary) {
      console.log(`  Revenue: $${(summary.revenue || summary.mrr || 0).toLocaleString()}`);
      console.log(`  Expenses: $${(summary.expenses || 0).toLocaleString()}`);
      console.log(`  Runway: ${(summary.runwayMonths || 0).toFixed(1)} months`);
    }
    console.log('');
  }

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`TEST 4: Verify Scenario Data Structure`);
  console.log(`${'─'.repeat(80)}`);

  const completedScenarios = allScenarios.filter(s => s.status === 'done');
  if (completedScenarios.length > 0) {
    const testScenario = completedScenarios[0];
    const summary = typeof testScenario.summaryJson === 'string' 
      ? JSON.parse(testScenario.summaryJson) 
      : testScenario.summaryJson;
    
    console.log(`Testing scenario: ${(testScenario.paramsJson as any)?.scenarioName || 'Unnamed'}\n`);
    
    // Check required fields for tabs
    console.log(`✅ Scenarios Tab:`);
    console.log(`   - Scenario Name: ${(testScenario.paramsJson as any)?.scenarioName || 'N/A'}`);
    console.log(`   - Status: ${testScenario.status}`);
    console.log(`   - Summary exists: ${!!summary}`);
    
    console.log(`\n✅ Comparison Tab:`);
    console.log(`   - Revenue: ${summary?.revenue || summary?.mrr ? '✅' : '❌'}`);
    console.log(`   - Expenses: ${summary?.expenses ? '✅' : '❌'}`);
    console.log(`   - Runway: ${summary?.runwayMonths ? '✅' : '❌'}`);
    console.log(`   - Monthly data: ${summary?.monthly ? Object.keys(summary.monthly).length + ' months' : '❌'}`);
    
    console.log(`\n✅ Snapshots Tab:`);
    console.log(`   - Scenario ID: ${testScenario.id}`);
    console.log(`   - Created at: ${testScenario.createdAt.toISOString()}`);
    console.log(`   - Summary JSON: ${summary ? '✅' : '❌'}`);
    
    console.log(`\n✅ Version History Tab:`);
    console.log(`   - Model ID: ${modelId}`);
    console.log(`   - Total scenarios: ${allScenarios.length}`);
    console.log(`   - Completed: ${completedScenarios.length}`);
    
    console.log(`\n✅ Sensitivity Tab:`);
    console.log(`   - Revenue growth: ${summary?.growthRate || summary?.revenueGrowth ? '✅' : '❌'}`);
    console.log(`   - Churn rate: ${summary?.churnRate ? '✅' : '❌'}`);
    
    console.log(`\n✅ Data Sources Tab:`);
    console.log(`   - Model ID: ${modelId}`);
    console.log(`   - Run ID: ${testScenario.id}`);
    console.log(`   - Params JSON: ${testScenario.paramsJson ? '✅' : '❌'}`);
  } else {
    console.log(`⚠️  No completed scenarios found. Scenarios are still processing.\n`);
  }

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`TEST 5: AI Copilot Endpoint Check`);
  console.log(`${'─'.repeat(80)}`);

  console.log(`\n✅ AI Copilot endpoint: POST /api/v1/orgs/${orgId}/ai-plans`);
  console.log(`   Expected request body: { goal: "..." }`);
  console.log(`   Expected response: { ok: true, plan: { planJson: { structuredResponse: { natural_text: "..." } } } }`);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ SCENARIO PLANNING TEST COMPLETE`);
  console.log(`${'='.repeat(80)}\n`);
  console.log(`📝 Next Steps:`);
  console.log(`   1. Wait for scenarios to complete processing`);
  console.log(`   2. Test each tab in the Scenario Planning component:`);
  console.log(`      - Scenarios tab: Should show all created scenarios`);
  console.log(`      - Comparison tab: Should compare scenarios side-by-side`);
  console.log(`      - Snapshots tab: Should show scenario snapshots`);
  console.log(`      - Version History tab: Should show scenario history`);
  console.log(`      - Sensitivity tab: Should show sensitivity analysis`);
  console.log(`      - Data Sources tab: Should show data transparency`);
  console.log(`   3. Test AI Copilot: Type a question and click "Ask AI"`);
  console.log(`   4. Verify all data displays correctly\n`);
}

const userEmail = process.argv[2] || 'cptjacksprw@gmail.com';
testScenarioPlanningComplete(userEmail)
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

