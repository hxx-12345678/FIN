/**
 * Script to generate a financial model for a specific user
 * Usage: npx ts-node src/generate-model-for-user.ts
 */

import prisma from './config/database';
import { financialModelService } from './services/financial-model.service';
import { jobService } from './services/job.service';

async function generateModelForUser(userEmail: string) {
  console.log(`🔍 Generating model for user: ${userEmail}`);

  // Find user
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

  if (!user) {
    console.error(`❌ User with email ${userEmail} not found.`);
    return;
  }

  if (!user.roles || user.roles.length === 0) {
    console.error(`❌ User ${userEmail} is not associated with any organization.`);
    return;
  }

  const orgId = user.roles[0].org.id;
  const orgName = user.roles[0].org.name;
  console.log(`✅ Found organization: ${orgName} (${orgId})`);

  // Check if model already exists
  const existingModel = await prisma.model.findFirst({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });

  if (existingModel) {
    console.log(`⚠️  Model already exists: ${existingModel.name} (${existingModel.id})`);
    console.log(`   Updating assumptions instead...`);
    
    // Update existing model with new assumptions based on transaction data
    const assumptions = await financialModelService.generateAssumptionsFromData(
      orgId,
      existingModel.id,
      'csv' // Assume CSV data source
    );

    const existingModelJson: any = existingModel.modelJson || {};
    const updatedModelJson = {
      ...existingModelJson,
      assumptions: {
        ...(existingModelJson.assumptions || {}),
        ...assumptions,
      },
    };

    await prisma.model.update({
      where: { id: existingModel.id },
      data: { modelJson: updatedModelJson },
    });

    console.log(`✅ Updated model assumptions`);
    console.log(`   Revenue: $${assumptions.revenue.baselineRevenue?.toLocaleString() || 0}/month`);
    console.log(`   Revenue Growth: ${((assumptions.revenue.revenueGrowth || 0) * 100).toFixed(1)}%`);
    console.log(`   Expenses: $${assumptions.costs.baselineExpenses?.toLocaleString() || 0}/month`);
    console.log(`   Initial Cash: $${assumptions.cash.initialCash?.toLocaleString() || 0}`);

    // Trigger a baseline model run
    console.log(`\n🚀 Triggering baseline model run...`);
    const job = await jobService.createJob({
      jobType: 'model_run',
      orgId,
      objectId: existingModel.id,
      createdByUserId: user.id,
      params: {
        modelId: existingModel.id,
        runType: 'baseline',
        assumptions: assumptions,
      },
    });

    console.log(`✅ Model run job created: ${job.id}`);
    console.log(`   Status: ${job.status}`);
    console.log(`\n📊 Model will be generated with the following assumptions:`);
    console.log(`   - Baseline Revenue: $${assumptions.revenue.baselineRevenue?.toLocaleString() || 0}/month`);
    console.log(`   - Revenue Growth: ${((assumptions.revenue.revenueGrowth || 0) * 100).toFixed(1)}% monthly`);
    console.log(`   - Churn Rate: ${((assumptions.revenue.churnRate || 0) * 100).toFixed(1)}% monthly`);
    console.log(`   - Baseline Expenses: $${assumptions.costs.baselineExpenses?.toLocaleString() || 0}/month`);
    console.log(`   - Expense Growth: ${((assumptions.costs.expenseGrowth || 0) * 100).toFixed(1)}% monthly`);
    console.log(`   - Initial Cash: $${assumptions.cash.initialCash?.toLocaleString() || 0}`);
    console.log(`   - CAC: $${assumptions.unitEconomics.cac?.toLocaleString() || 0}`);
    console.log(`   - LTV: $${assumptions.unitEconomics.ltv?.toLocaleString() || 0}`);

    return;
  }

  // Create new model
  console.log(`\n📊 Creating new financial model...`);

  // Get transaction data to inform assumptions
  const transactions = await prisma.rawTransaction.findMany({
    where: { orgId, isDuplicate: false },
    orderBy: { date: 'desc' },
    take: 100,
  });

  console.log(`   Found ${transactions.length} transactions`);

  // Generate assumptions from data
  const assumptions = await financialModelService.generateAssumptionsFromData(
    orgId,
    '', // Will be set after model creation
    transactions.length > 0 ? 'csv' : 'blank'
  );

  // Create model
  const result = await financialModelService.createModel(
    user.id,
    orgId,
    {
      model_name: `${orgName} Financial Model`,
      industry: 'technology',
      revenue_model_type: 'hybrid',
      forecast_duration: 36,
      start_month: new Date().toISOString().slice(0, 7), // Current month
      data_source_type: transactions.length > 0 ? 'csv' : 'blank',
      description: 'Auto-generated financial model based on transaction data',
      assumptions: assumptions,
    }
  );

  console.log(`✅ Model created: ${result.model.name} (${result.model.id})`);
  if (result.jobId) {
    console.log(`   Auto-model job: ${result.jobId}`);
  }

  console.log(`\n📊 Model created with the following assumptions:`);
  console.log(`   - Baseline Revenue: $${assumptions.revenue.baselineRevenue?.toLocaleString() || 0}/month`);
  console.log(`   - Revenue Growth: ${((assumptions.revenue.revenueGrowth || 0) * 100).toFixed(1)}% monthly`);
  console.log(`   - Churn Rate: ${((assumptions.revenue.churnRate || 0) * 100).toFixed(1)}% monthly`);
  console.log(`   - Baseline Expenses: $${assumptions.costs.baselineExpenses?.toLocaleString() || 0}/month`);
  console.log(`   - Expense Growth: ${((assumptions.costs.expenseGrowth || 0) * 100).toFixed(1)}% monthly`);
  console.log(`   - Initial Cash: $${assumptions.cash.initialCash?.toLocaleString() || 0}`);
  console.log(`   - CAC: $${assumptions.unitEconomics.cac?.toLocaleString() || 0}`);
  console.log(`   - LTV: $${assumptions.unitEconomics.ltv?.toLocaleString() || 0}`);

  // If no auto-model job was created, trigger a baseline run manually
  if (!result.jobId) {
    console.log(`\n🚀 Triggering baseline model run...`);
    const job = await jobService.createJob({
      jobType: 'model_run',
      orgId,
      objectId: result.model.id,
      createdByUserId: user.id,
      params: {
        modelId: result.model.id,
        runType: 'baseline',
        assumptions: assumptions,
      },
    });

    console.log(`✅ Model run job created: ${job.id}`);
    console.log(`   Status: ${job.status}`);
  }
}

// Run the script
const userEmail = process.argv[2] || 'cptjacksprw@gmail.com';
generateModelForUser(userEmail)
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



