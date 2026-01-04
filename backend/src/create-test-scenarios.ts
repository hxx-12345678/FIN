/**
 * Create 2 test scenarios for scenario planning component testing
 */

import prisma from './config/database';
import { jobService } from './services/job.service';

async function createTestScenarios(userEmail: string) {
  console.log(`\n🔍 Creating test scenarios for: ${userEmail}`);

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

  if (!user || !user.roles || user.roles.length === 0) {
    console.error(`❌ User not found or no organization`);
    return;
  }

  const orgId = user.roles[0].org.id;
  const orgName = user.roles[0].org.name;
  console.log(`✅ Organization: ${orgName} (${orgId})`);

  // Get the first model
  const model = await prisma.model.findFirst({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });

  if (!model) {
    console.error(`❌ No model found. Please create a model first.`);
    return;
  }

  console.log(`✅ Using model: ${model.name} (${model.id})`);

  // Create Scenario 1: Hiring Acceleration
  console.log(`\n📊 Creating Scenario 1: Hiring Acceleration...`);
  const scenario1Job = await jobService.createJob({
    jobType: 'model_run',
    orgId,
    objectId: model.id,
    createdByUserId: user.id,
    params: {
      modelId: model.id,
      runType: 'scenario',
      scenarioName: 'Hiring Acceleration',
      scenarioType: 'adhoc',
      overrides: {
        costs: {
          payroll: 600000,
          growth: 0.15,
        },
        revenue: {
          growth: 0.12,
        },
      },
    },
  });
  console.log(`✅ Scenario 1 job created: ${scenario1Job.id}`);

  // Create Scenario 2: Price Increase
  console.log(`\n📊 Creating Scenario 2: Price Increase...`);
  const scenario2Job = await jobService.createJob({
    jobType: 'model_run',
    orgId,
    objectId: model.id,
    createdByUserId: user.id,
    params: {
      modelId: model.id,
      runType: 'scenario',
      scenarioName: 'Price Increase',
      scenarioType: 'adhoc',
      overrides: {
        revenue: {
          baseline: 1.2,
          churn: 0.08,
        },
      },
    },
  });
  console.log(`✅ Scenario 2 job created: ${scenario2Job.id}`);

  console.log(`\n✅ Both scenarios created successfully!`);
  console.log(`   They will be processed by the worker and appear in the Scenario Planning component.`);
}

const userEmail = process.argv[2] || 'cptjacksprw@gmail.com';
createTestScenarios(userEmail)
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



