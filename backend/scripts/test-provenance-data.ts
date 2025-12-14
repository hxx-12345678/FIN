import prisma from '../src/config/database';
import { logger } from '../src/utils/logger';

async function testProvenanceData() {
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
                    include: {
                      provenance: {
                        take: 10,
                        orderBy: {
                          createdAt: 'desc',
                        },
                      },
                    },
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

  if (!user) {
    logger.error(`❌ User ${userEmail} not found.`);
    return;
  }

  logger.info(`✅ Found user: ${user.email} (ID: ${user.id})`);
  
  if (user.roles.length === 0) {
    logger.warn(`⚠️ User has no organizations.`);
    return;
  }

  for (const role of user.roles) {
    const org = role.org;
    logger.info(`\n🏢 Organization: ${org.name} (ID: ${org.id})`);
    
    if (org.models.length === 0) {
      logger.warn(`  ⚠️ No models found for this organization.`);
      continue;
    }

    for (const model of org.models) {
      logger.info(`\n📊 Model: ${model.name} (ID: ${model.id})`);
      
      if (model.modelRuns.length === 0) {
        logger.warn(`  ⚠️ No completed model runs found.`);
        continue;
      }

      const latestRun = model.modelRuns[0];
      logger.info(`\n  📈 Latest Model Run: ${latestRun.id}`);
      logger.info(`     Status: ${latestRun.status}`);
      logger.info(`     Created: ${latestRun.createdAt}`);
      
      if (latestRun.summaryJson) {
        const summary = typeof latestRun.summaryJson === 'string' 
          ? JSON.parse(latestRun.summaryJson) 
          : latestRun.summaryJson;
        
        logger.info(`\n  📋 Summary Data:`);
        if (summary.monthly) {
          const monthlyKeys = Object.keys(summary.monthly).sort();
          logger.info(`     Monthly data for ${monthlyKeys.length} months:`);
          monthlyKeys.slice(-3).forEach((monthKey) => {
            const monthData = summary.monthly[monthKey];
            logger.info(`       ${monthKey}:`);
            logger.info(`         Revenue: $${(monthData.revenue || 0).toLocaleString()}`);
            logger.info(`         COGS: $${(monthData.cogs || 0).toLocaleString()}`);
            logger.info(`         Gross Profit: $${(monthData.grossProfit || 0).toLocaleString()}`);
            logger.info(`         Net Income: $${(monthData.netIncome || 0).toLocaleString()}`);
          });
        }
      }

      logger.info(`\n  🔗 Provenance Entries: ${latestRun.provenance.length}`);
      if (latestRun.provenance.length > 0) {
        const cellKeys = new Set<string>();
        latestRun.provenance.forEach((entry) => {
          cellKeys.add(entry.cellKey);
        });
        logger.info(`     Unique cell keys: ${cellKeys.size}`);
        logger.info(`     Sample cell keys:`);
        Array.from(cellKeys).slice(0, 10).forEach((key) => {
          logger.info(`       - ${key}`);
        });
        
        // Show sample entries
        logger.info(`\n     Sample provenance entries:`);
        latestRun.provenance.slice(0, 5).forEach((entry) => {
          logger.info(`       Cell: ${entry.cellKey}`);
          logger.info(`         Type: ${entry.sourceType}`);
          logger.info(`         Created: ${entry.createdAt}`);
          if (entry.sourceRef) {
            const ref = entry.sourceRef as any;
            if (ref.assumption_id) {
              logger.info(`         Assumption: ${ref.assumption_id} = ${ref.value}`);
            }
            if (ref.transaction_ids) {
              logger.info(`         Transactions: ${ref.transaction_ids.length} IDs`);
            }
          }
        });
      } else {
        logger.warn(`     ⚠️ No provenance entries found for this model run.`);
      }

      // Check for transactions
      const transactionCount = await prisma.rawTransaction.count({
        where: { orgId: org.id },
      });
      logger.info(`\n  💰 Raw Transactions: ${transactionCount}`);
    }
  }

  logger.info(`\n✅ Test complete!`);
}

testProvenanceData()
  .catch((e) => {
    logger.error('Error testing provenance data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

