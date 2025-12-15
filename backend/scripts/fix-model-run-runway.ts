import prisma from '../src/config/database';
import { logger } from '../src/utils/logger';
import { runwayCalculationService } from '../src/services/runway-calculation.service';

const USER_EMAIL = 'cptjacksprw@gmail.com';

async function fixModelRunRunway() {
  logger.info(`\n${'='.repeat(80)}`);
  logger.info(`FIXING MODEL RUN RUNWAY VALUES FOR: ${USER_EMAIL}`);
  logger.info(`${'='.repeat(80)}\n`);

  // Get user and org
  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL },
    include: {
      roles: {
        include: {
          org: true,
        },
      },
    },
  });

  if (!user || user.roles.length === 0) {
    logger.error('User not found');
    return;
  }

  const org = user.roles[0].org;
  logger.info(`✅ Organization: ${org.name} (${org.id})\n`);

  // Get correct runway value
  const runwayData = await runwayCalculationService.calculateRunway(org.id);
  logger.info(`📋 Correct Runway Value:\n`);
  logger.info(`  Runway: ${runwayData.runwayMonths.toFixed(2)} months`);
  logger.info(`  Cash Balance: $${runwayData.cashBalance.toLocaleString()}`);
  logger.info(`  Monthly Burn Rate: $${runwayData.monthlyBurnRate.toLocaleString()}/month`);
  logger.info(`  Source: ${runwayData.source}\n`);

  // Update all model runs with incorrect runway (999)
  logger.info(`📋 Updating Model Runs...\n`);
  const modelRuns = await prisma.modelRun.findMany({
    where: {
      orgId: org.id,
      status: 'done',
    },
  });

  let updated = 0;
  for (const run of modelRuns) {
    if (run.summaryJson) {
      const summary = typeof run.summaryJson === 'string' 
        ? JSON.parse(run.summaryJson) 
        : run.summaryJson;
      
      const currentRunway = Number(summary.runwayMonths || summary.runway || 0);
      
      // Check if runway is 999 but should be calculated
      if (currentRunway >= 999 && runwayData.monthlyBurnRate > 0) {
        logger.info(`  Updating run ${run.id.substring(0, 8)}...`);
        logger.info(`    Old runway: ${currentRunway} months`);
        
        summary.runwayMonths = runwayData.runwayMonths;
        if (summary.runway) {
          summary.runway = runwayData.runwayMonths;
        }
        
        await prisma.modelRun.update({
          where: { id: run.id },
          data: {
            summaryJson: summary,
          },
        });
        
        logger.info(`    New runway: ${runwayData.runwayMonths.toFixed(2)} months`);
        updated++;
      } else if (currentRunway > 0 && currentRunway < 999) {
        // Verify existing runway is correct
        const cashBalance = Number(summary.cashBalance || 0);
        const monthlyBurnRate = Number(summary.monthlyBurn || summary.monthlyBurnRate || summary.burnRate || 0);
        if (monthlyBurnRate > 0) {
          const calculatedRunway = cashBalance / monthlyBurnRate;
          const diff = Math.abs(currentRunway - calculatedRunway);
          const percentDiff = (diff / calculatedRunway) * 100;
          
          if (percentDiff > 5) {
            logger.info(`  Updating run ${run.id.substring(0, 8)}... (runway off by ${percentDiff.toFixed(1)}%)`);
            summary.runwayMonths = calculatedRunway;
            if (summary.runway) {
              summary.runway = calculatedRunway;
            }
            
            await prisma.modelRun.update({
              where: { id: run.id },
              data: {
                summaryJson: summary,
              },
            });
            
            logger.info(`    Updated from ${currentRunway.toFixed(2)} to ${calculatedRunway.toFixed(2)} months`);
            updated++;
          }
        }
      }
    }
  }

  logger.info(`\n${'='.repeat(80)}`);
  logger.info(`SUMMARY`);
  logger.info(`${'='.repeat(80)}\n`);
  logger.info(`Updated ${updated} model run(s) with correct runway: ${runwayData.runwayMonths.toFixed(2)} months`);
  logger.info(`✅ Fix complete!\n`);
}

fixModelRunRunway()
  .then(() => {
    logger.info('✅ Script complete');
    process.exit(0);
  })
  .catch((e) => {
    logger.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

