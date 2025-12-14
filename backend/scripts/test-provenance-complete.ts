import prisma from '../src/config/database';
import { logger } from '../src/utils/logger';

const USER_EMAIL = 'cptjacksprw@gmail.com';

async function testProvenanceComplete() {
  logger.info(`🔍 Testing Provenance Data for ${USER_EMAIL}...`);
  
  const user = await prisma.user.findUnique({
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
            },
          },
        },
      },
    },
  });

  if (!user || user.roles.length === 0) {
    logger.error(`❌ User not found: ${USER_EMAIL}`);
    return;
  }

  const org = user.roles[0].org;
  const model = org.models[0];
  
  if (!model) {
    logger.error(`❌ No models found for org ${org.id}`);
    return;
  }

  const modelRun = model.modelRuns[0];
  
  if (!modelRun || !modelRun.summaryJson) {
    logger.error(`❌ No completed model runs found for model ${model.id}`);
    return;
  }

  logger.info(`\n📊 Model: ${model.name} (ID: ${model.id})`);
  logger.info(`   Model Run: ${modelRun.id}`);
  logger.info(`   Org ID: ${org.id}`);

  const summary = typeof modelRun.summaryJson === 'string' 
    ? JSON.parse(modelRun.summaryJson) 
    : modelRun.summaryJson;

  // Get all monthly data
  const monthlyData = summary.monthly || {};
  const monthKeys = Object.keys(monthlyData).sort();
  
  logger.info(`\n📅 Monthly Data Available: ${monthKeys.length} months`);
  logger.info(`   Months: ${monthKeys.join(', ')}`);

  // Test each metric for each month
  const metrics = ['revenue', 'cogs', 'grossProfit', 'netIncome'];
  let totalIssues = 0;

  for (const monthKey of monthKeys.slice(0, 3)) { // Test first 3 months
    logger.info(`\n   Testing Month: ${monthKey}`);
    const monthData = monthlyData[monthKey];
    
    for (const metric of metrics) {
      const cellKey = `${monthKey}:${metric}`;
      const value = monthData[metric];
      
      if (value === undefined || value === null) {
        logger.warn(`     ⚠️ ${metric}: Missing value`);
        totalIssues++;
        continue;
      }

      // Check if provenance entry exists
      const provenance = await prisma.provenanceEntry.findFirst({
        where: {
          modelRunId: modelRun.id,
          cellKey: cellKey,
        },
      });

      if (!provenance) {
        logger.error(`     ❌ ${metric}: No provenance entry found for ${cellKey}`);
        logger.error(`        Value in summary: ${value}`);
        totalIssues++;
      } else {
        logger.info(`     ✅ ${metric}: Provenance found`);
        logger.info(`        Value: ${value}`);
        logger.info(`        Source Type: ${provenance.sourceType}`);
        
        const sourceRef = typeof provenance.sourceRef === 'string'
          ? JSON.parse(provenance.sourceRef)
          : provenance.sourceRef;
        
        if (provenance.sourceType === 'transaction') {
          const txIds = sourceRef.transaction_ids || sourceRef.transactionIds || [];
          logger.info(`        Transaction IDs: ${txIds.length > 0 ? txIds.join(', ') : 'None'}`);
        } else if (provenance.sourceType === 'assumption') {
          const assumptionId = sourceRef.assumption_id || sourceRef.assumptionId || 'N/A';
          const assumptionValue = sourceRef.value || sourceRef.assumption_value || 'N/A';
          logger.info(`        Assumption: ${assumptionId} = ${assumptionValue}`);
        }
      }
    }
  }

  // Test API endpoint format
  logger.info(`\n🔗 Testing API Endpoint Format:`);
  for (const monthKey of monthKeys.slice(0, 1)) {
    for (const metric of metrics) {
      const cellKey = `${monthKey}:${metric}`;
      logger.info(`   GET /api/v1/orgs/${org.id}/models/${model.id}/runs/${modelRun.id}/provenance/${cellKey}`);
    }
  }

  logger.info(`\n📋 Summary:`);
  logger.info(`   Total months: ${monthKeys.length}`);
  logger.info(`   Metrics tested: ${metrics.length}`);
  logger.info(`   Issues found: ${totalIssues}`);
  
  if (totalIssues === 0) {
    logger.info(`   ✅ All provenance entries are present!`);
  } else {
    logger.warn(`   ⚠️ ${totalIssues} issues found - needs fixing`);
  }
}

testProvenanceComplete()
  .catch((e) => {
    logger.error('Error testing provenance:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

