import prisma from '../src/config/database';
import { logger } from '../src/utils/logger';

async function testModelDataAccuracy() {
  const userEmail = 'cptjacksprw@gmail.com';
  const orgName = 'HXX';

  logger.info(`🔍 Finding user: ${userEmail} and org: ${orgName}...`);
  
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
                    take: 5,
                  },
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
              rawTransactions: {
                orderBy: {
                  date: 'desc',
                },
                take: 20,
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

  const org = user.roles.find(r => r.org.name === orgName)?.org || user.roles[0].org;
  
  logger.info(`\n🏢 Organization: ${org.name} (ID: ${org.id})`);
  
  // Check transaction data
  logger.info(`\n💰 Transaction Data Analysis:`);
  logger.info(`   Total transactions: ${org.rawTransactions.length}`);
  
  if (org.rawTransactions.length > 0) {
    const dates = org.rawTransactions.map(t => t.date);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    logger.info(`   Date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`);
    logger.info(`   Sample transactions:`);
    org.rawTransactions.slice(0, 5).forEach((tx, idx) => {
      logger.info(`     ${idx + 1}. ${tx.date.toISOString().split('T')[0]} - $${tx.amount} - ${tx.description || 'N/A'}`);
    });
  } else {
    logger.warn(`   ⚠️ No transactions found!`);
  }

  // Check models
  logger.info(`\n📊 Models Analysis:`);
  logger.info(`   Total models: ${org.models.length}`);
  
  for (const model of org.models) {
    logger.info(`\n   Model: ${model.name} (ID: ${model.id})`);
    logger.info(`     Created: ${model.createdAt}`);
    
    // Check model JSON for start date
    const modelJson = typeof model.modelJson === 'string' 
      ? JSON.parse(model.modelJson) 
      : model.modelJson;
    
    if (modelJson.metadata?.startMonth) {
      logger.info(`     Start Month (from metadata): ${modelJson.metadata.startMonth}`);
    }
    if (modelJson.start_month) {
      logger.info(`     Start Month (from modelJson): ${modelJson.start_month}`);
    }
    
    // Check assumptions
    if (modelJson.assumptions) {
      logger.info(`     Assumptions:`);
      if (modelJson.assumptions.cash?.initialCash) {
        logger.info(`       Initial Cash: $${modelJson.assumptions.cash.initialCash}`);
      }
      if (modelJson.assumptions.revenue?.baselineRevenue) {
        logger.info(`       Baseline Revenue: $${modelJson.assumptions.revenue.baselineRevenue}`);
      }
      if (modelJson.assumptions.revenue?.customerCount) {
        logger.info(`       Customer Count: ${modelJson.assumptions.revenue.customerCount}`);
      }
    }
    
    // Check model runs
    logger.info(`     Model Runs: ${model.modelRuns.length}`);
    
    for (const run of model.modelRuns) {
      logger.info(`\n       Run ID: ${run.id}`);
      logger.info(`         Status: ${run.status}`);
      logger.info(`         Created: ${run.createdAt}`);
      
      if (run.summaryJson) {
        const summary = typeof run.summaryJson === 'string' 
          ? JSON.parse(run.summaryJson) 
          : run.summaryJson;
        
        logger.info(`         Summary Data:`);
        
        // Check monthly data dates
        if (summary.monthly) {
          const monthKeys = Object.keys(summary.monthly).sort();
          logger.info(`           Monthly data for ${monthKeys.length} months:`);
          logger.info(`           First month: ${monthKeys[0]}`);
          logger.info(`           Last month: ${monthKeys[monthKeys.length - 1]}`);
          
          // Check if dates are in 2024 (old data issue)
          const has2024 = monthKeys.some(key => key.startsWith('2024'));
          if (has2024) {
            logger.warn(`           ⚠️ WARNING: Contains 2024 data!`);
          }
          
          // Show sample data
          monthKeys.slice(0, 3).forEach((monthKey) => {
            const monthData = summary.monthly[monthKey];
            logger.info(`           ${monthKey}:`);
            logger.info(`             Revenue: $${(monthData.revenue || 0).toLocaleString()}`);
            logger.info(`             COGS: $${(monthData.cogs || 0).toLocaleString()}`);
            logger.info(`             Net Income: $${(monthData.netIncome || 0).toLocaleString()}`);
          });
        }
        
        // Check if data seems realistic
        if (summary.revenue) {
          logger.info(`           Total Revenue: $${summary.revenue.toLocaleString()}`);
        }
        if (summary.activeCustomers) {
          logger.info(`           Active Customers: ${summary.activeCustomers}`);
        } else {
          logger.warn(`           ⚠️ No activeCustomers in summary`);
        }
      }
    }
  }

  logger.info(`\n✅ Analysis complete!`);
}

testModelDataAccuracy()
  .catch((e) => {
    logger.error('Error testing model data accuracy:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

