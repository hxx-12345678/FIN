/**
 * Test Financial Modeling Component - Check Database and Verify Data Flow
 */

import prisma from './config/database';

async function testFinancialModelingDB(userEmail: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 TESTING FINANCIAL MODELING - DATABASE CHECK FOR: ${userEmail}`);
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

  // Check Models
  console.log(`${'─'.repeat(80)}`);
  console.log(`MODELS:`);
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
    console.log(`Model: ${model.name}`);
    console.log(`  ID: ${model.id}`);
    
    const modelJson = model.modelJson as any;
    console.log(`  Assumptions:`);
    if (modelJson?.assumptions) {
      const a = modelJson.assumptions;
      console.log(`    Baseline Revenue: $${(a.baselineRevenue || a.revenue?.baselineRevenue || 0).toLocaleString()}`);
      console.log(`    Revenue Growth: ${((a.revenueGrowth || a.revenue?.revenueGrowth || 0) * 100).toFixed(2)}%`);
      console.log(`    Churn Rate: ${((a.churnRate || a.revenue?.churnRate || 0) * 100).toFixed(2)}%`);
      console.log(`    Baseline Expenses: $${(a.baselineExpenses || a.costs?.baselineExpenses || 0).toLocaleString()}`);
      console.log(`    Initial Cash: $${(a.initialCash || a.cash?.initialCash || 0).toLocaleString()}`);
    } else {
      console.log(`    ⚠️  No assumptions found`);
    }
    
    console.log(`  Sensitivity Data:`);
    if (modelJson?.sensitivity) {
      console.log(`    ✅ Sensitivity data exists in modelJson`);
      console.log(`    Revenue Growth:`, modelJson.sensitivity.revenueGrowth);
      console.log(`    Churn Rate:`, modelJson.sensitivity.churnRate);
    } else {
      console.log(`    ⚠️  No sensitivity data in modelJson (will be generated)`);
    }
    
    console.log(`  Model Runs: ${model.modelRuns.length}`);
    if (model.modelRuns.length > 0) {
      const run = model.modelRuns[0];
      const summary = typeof run.summaryJson === 'string' 
        ? JSON.parse(run.summaryJson) 
        : run.summaryJson;
      console.log(`    Latest Run ID: ${run.id}`);
      console.log(`    Status: ${run.status}`);
      console.log(`    Revenue: $${(summary.revenue || summary.mrr || 0).toLocaleString()}`);
      console.log(`    Growth Rate: ${((summary.growthRate || 0) * 100).toFixed(2)}%`);
      console.log(`    Churn Rate: ${((summary.churnRate || 0) * 100).toFixed(2)}%`);
      console.log(`    Monthly Data: ${summary.monthly ? Object.keys(summary.monthly).length : 0} months`);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

const userEmail = process.argv[2] || 'cptjacksprw@gmail.com';
testFinancialModelingDB(userEmail)
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  });



