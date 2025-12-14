import prisma from '../src/config/database';
import { logger } from '../src/utils/logger';
import { provenanceService } from '../src/services/provenance.service';

const USER_EMAIL = 'cptjacksprw@gmail.com';

async function testProvenanceAPIEndpoint() {
  logger.info(`🔍 Testing Provenance API Endpoint for ${USER_EMAIL}...`);
  
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

  const summary = typeof modelRun.summaryJson === 'string' 
    ? JSON.parse(modelRun.summaryJson) 
    : modelRun.summaryJson;

  const monthlyData = summary.monthly || {};
  const monthKeys = Object.keys(monthlyData).sort();
  
  logger.info(`\n📊 Testing API Endpoint:`);
  logger.info(`   Model Run ID: ${modelRun.id}`);
  logger.info(`   Org ID: ${org.id}`);
  logger.info(`   Model ID: ${model.id}`);

  // Test each metric for first month
  const testMonth = monthKeys[0];
  const metrics = ['revenue', 'cogs', 'grossProfit', 'netIncome'];
  
  for (const metric of metrics) {
    const cellKey = `${testMonth}:${metric}`;
    const expectedValue = monthlyData[testMonth][metric];
    
    logger.info(`\n   Testing: ${cellKey}`);
    logger.info(`   Expected Value: ${expectedValue}`);
    
    try {
      const result = await provenanceService.getProvenance(
        modelRun.id,
        cellKey,
        user.id,
        50,
        0,
        true
      );
      
      if (result.ok && result.entries.length > 0) {
        logger.info(`   ✅ API returned ${result.entries.length} entry(ies)`);
        
        const firstEntry = result.entries[0];
        logger.info(`   Source Type: ${firstEntry.sourceType}`);
        
        if (firstEntry.summary) {
          logger.info(`   Summary Total: ${firstEntry.summary.totalAmount}`);
        }
        
        if (firstEntry.assumptionRef) {
          logger.info(`   Assumption: ${firstEntry.assumptionRef.assumption_id} = ${firstEntry.assumptionRef.value}`);
        }
        
        if (firstEntry.sampleTransactions) {
          logger.info(`   Transactions: ${firstEntry.sampleTransactions.length}`);
        }
      } else {
        logger.warn(`   ⚠️ API returned no entries`);
      }
    } catch (error: any) {
      logger.error(`   ❌ API Error: ${error.message}`);
    }
  }

  logger.info(`\n✅ API Testing Complete!`);
}

testProvenanceAPIEndpoint()
  .catch((e) => {
    logger.error('Error testing API:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

