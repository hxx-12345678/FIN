import prisma from '../src/config/database';
import { logger } from '../src/utils/logger';

async function backfillProvenanceEntries() {
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

  if (!modelRun || !modelRun.summaryJson) {
    logger.error(`❌ No model run or summary found.`);
    return;
  }

  logger.info(`\n📊 Backfilling Provenance Entries`);
  logger.info(`   Model Run ID: ${modelRun.id}`);
  logger.info(`   Org ID: ${org.id}`);

  const summary = typeof modelRun.summaryJson === 'string' 
    ? JSON.parse(modelRun.summaryJson) 
    : modelRun.summaryJson;

  if (!summary.monthly) {
    logger.error(`❌ No monthly data in summary.`);
    return;
  }

  const monthlyData = summary.monthly;
  let entriesCreated = 0;

  // Process each month
  for (const [monthKey, monthData] of Object.entries(monthlyData)) {
    try {
      const [year, month] = monthKey.split('-').map(Number);
      
      // Create provenance entries for missing metrics
      const metricsToCreate = [
        { key: 'cogs', value: monthData.cogs, assumptionId: 'cogsPercentage' },
        { key: 'grossProfit', value: monthData.grossProfit },
        { key: 'netIncome', value: monthData.netIncome },
      ];

      for (const metric of metricsToCreate) {
        if (metric.value === undefined || metric.value === null) continue;

        const cellKey = `${year}-${String(month).padStart(2, '0')}:${metric.key}`;
        
        // Check if entry already exists
        const existing = await prisma.provenanceEntry.findFirst({
          where: {
            modelRunId: modelRun.id,
            cellKey: cellKey,
          },
        });

        if (existing) {
          logger.info(`   ⏭️  Skipping ${cellKey} - already exists`);
          continue;
        }

        // Create appropriate source_ref based on metric
        let sourceRef: any = {};
        let sourceType = 'assumption';

        if (metric.key === 'cogs') {
          sourceRef = {
            assumption_id: 'cogsPercentage',
            value: metric.value,
            calculated_from: ['revenue'],
            formula: 'cogs = revenue * cogsPercentage',
          };
        } else if (metric.key === 'grossProfit') {
          sourceRef = {
            assumption_id: 'grossProfit',
            name: 'Gross Profit',
            calculated_from: ['revenue', 'cogs'],
            formula: 'grossProfit = revenue - cogs',
            value: metric.value,
          };
        } else if (metric.key === 'netIncome') {
          sourceRef = {
            assumption_id: 'netIncome',
            name: 'Net Income',
            calculated_from: ['revenue', 'cogs', 'expenses'],
            formula: 'netIncome = revenue - cogs - opex',
            value: metric.value,
          };
        }

        // Create provenance entry
        await prisma.provenanceEntry.create({
          data: {
            modelRunId: modelRun.id,
            orgId: org.id,
            cellKey: cellKey,
            sourceType: sourceType,
            sourceRef: sourceRef,
            confidenceScore: 0.9,
          },
        });

        entriesCreated++;
        logger.info(`   ✅ Created ${cellKey}`);
      }
    } catch (error: any) {
      logger.error(`   ❌ Error processing ${monthKey}: ${error.message}`);
    }
  }

  logger.info(`\n✅ Backfill complete! Created ${entriesCreated} provenance entries.`);
}

backfillProvenanceEntries()
  .catch((e) => {
    logger.error('Error backfilling provenance entries:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

