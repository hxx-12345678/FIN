import prisma from '../src/config/database';
import { provenanceService } from '../src/services/provenance.service';
import { logger } from '../src/utils/logger';

async function testProvenanceAPI() {
  const userEmail = 'cptjacksprw@gmail.com';

  logger.info(`🔍 Finding user: ${userEmail}...`);
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
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
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!user || user.roles.length === 0) {
    logger.error(`❌ User or org not found.`);
    return;
  }

  const org = user.roles[0].org;
  const model = org.models[0];
  const modelRun = model.modelRuns[0];

  if (!modelRun) {
    logger.error(`❌ No model run found.`);
    return;
  }

  logger.info(`\n📊 Testing Provenance API`);
  logger.info(`   Model Run ID: ${modelRun.id}`);
  logger.info(`   User ID: ${user.id}`);

  // Test cell keys that should exist
  const testCellKeys = [
    '2026-03:revenue',
    '2026-03:cogs',
    '2026-03:grossProfit',
    '2026-03:netIncome',
    '2026-04:revenue',
    '2026-05:revenue',
    'revenue', // Fallback
  ];

  for (const cellKey of testCellKeys) {
    try {
      logger.info(`\n🔍 Testing cell key: ${cellKey}`);
      const result = await provenanceService.getProvenance(
        modelRun.id,
        cellKey,
        user.id,
        50,
        0,
        true
      );

      logger.info(`   ✅ Found ${result.entries.length} entries`);
      if (result.entries.length > 0) {
        result.entries.forEach((entry, idx) => {
          logger.info(`   Entry ${idx + 1}:`);
          logger.info(`     Type: ${entry.sourceType}`);
          logger.info(`     Created: ${entry.createdAt}`);
          if (entry.sampleTransactions && entry.sampleTransactions.length > 0) {
            logger.info(`     Transactions: ${entry.sampleTransactions.length}`);
          }
          if (entry.assumptionRef) {
            logger.info(`     Assumption: ${entry.assumptionRef.assumption_id || 'N/A'} = ${entry.assumptionRef.value || 'N/A'}`);
          }
          if (entry.sourceRef) {
            const ref = entry.sourceRef as any;
            if (ref.assumption_id) {
              logger.info(`     Assumption (sourceRef): ${ref.assumption_id} = ${ref.value || 'N/A'}`);
            }
            if (ref.transaction_ids) {
              logger.info(`     Transaction IDs: ${ref.transaction_ids.length}`);
            }
          }
        });
      } else {
        logger.warn(`   ⚠️ No provenance entries found for this cell key`);
      }
    } catch (error: any) {
      logger.error(`   ❌ Error: ${error.message}`);
    }
  }

  logger.info(`\n✅ Test complete!`);
}

testProvenanceAPI()
  .catch((e) => {
    logger.error('Error testing provenance API:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

