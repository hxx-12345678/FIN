import prisma from '../src/config/database';
import { logger } from '../src/utils/logger';

async function testModelAccuracyComplete() {
  const userEmail = 'cptjacksprw@gmail.com';
  const orgName = 'HXX';

  logger.info(`🔍 Testing Model Data Accuracy for ${userEmail} / ${orgName}...`);
  
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
                orderBy: {
                  createdAt: 'desc',
                },
                take: 5,
              },
              rawTransactions: {
                orderBy: {
                  date: 'desc',
                },
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
  
  // Analyze transaction data
  logger.info(`\n💰 Transaction Data Analysis:`);
  logger.info(`   Total transactions: ${org.rawTransactions.length}`);
  
  if (org.rawTransactions.length > 0) {
    const dates = org.rawTransactions.map(t => t.date);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const now = new Date();
    const daysSinceNewest = Math.floor((now.getTime() - maxDate.getTime()) / (1000 * 60 * 60 * 24));
    
    logger.info(`   Date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`);
    logger.info(`   Newest transaction: ${daysSinceNewest} days ago`);
    
    if (daysSinceNewest > 180) {
      logger.warn(`   ⚠️ WARNING: Transaction data is ${daysSinceNewest} days old! Consider importing recent data.`);
    }
    
    // Calculate totals
    const totalRevenue = org.rawTransactions
      .filter(t => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = org.rawTransactions
      .filter(t => Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    
    logger.info(`   Total Revenue: $${totalRevenue.toLocaleString()}`);
    logger.info(`   Total Expenses: $${totalExpenses.toLocaleString()}`);
  } else {
    logger.warn(`   ⚠️ No transactions found! Models will use default/assumed values.`);
  }

  // Analyze each model
  logger.info(`\n📊 Models Analysis (${org.models.length} models):`);
  
  for (const model of org.models) {
    logger.info(`\n   Model: ${model.name} (ID: ${model.id})`);
    logger.info(`     Created: ${model.createdAt}`);
    
    const modelJson = typeof model.modelJson === 'string' 
      ? JSON.parse(model.modelJson) 
      : model.modelJson;
    
    const metadata = modelJson.metadata || {};
    const assumptions = modelJson.assumptions || {};
    
    logger.info(`     Start Month: ${metadata.startMonth || metadata.start_month || 'NOT SET'}`);
    logger.info(`     Data Source: ${metadata.dataSourceType || 'unknown'}`);
    
    // Check assumptions
    if (assumptions.cash?.initialCash) {
      logger.info(`     Initial Cash: $${assumptions.cash.initialCash.toLocaleString()}`);
    }
    if (assumptions.revenue?.baselineRevenue) {
      logger.info(`     Baseline Revenue: $${assumptions.revenue.baselineRevenue.toLocaleString()}/month`);
    }
    if (assumptions.revenue?.customerCount) {
      logger.info(`     Customer Count: ${assumptions.revenue.customerCount}`);
    }
    
    // Check model runs
    if (model.modelRuns.length === 0) {
      logger.warn(`     ⚠️ No completed model runs`);
      continue;
    }
    
    const latestRun = model.modelRuns[0];
    logger.info(`\n     Latest Run: ${latestRun.id}`);
    logger.info(`       Status: ${latestRun.status}`);
    logger.info(`       Created: ${latestRun.createdAt}`);
    
    if (latestRun.summaryJson) {
      const summary = typeof latestRun.summaryJson === 'string' 
        ? JSON.parse(latestRun.summaryJson) 
        : latestRun.summaryJson;
      
      logger.info(`\n       Summary Data:`);
      
      // Check monthly data dates
      if (summary.monthly) {
        const monthKeys = Object.keys(summary.monthly).sort();
        logger.info(`         Monthly projections: ${monthKeys.length} months`);
        logger.info(`         First month: ${monthKeys[0]}`);
        logger.info(`         Last month: ${monthKeys[monthKeys.length - 1]}`);
        
        // Verify dates match start month
        const expectedStart = metadata.startMonth || metadata.start_month;
        if (expectedStart && monthKeys[0] !== expectedStart) {
          logger.error(`         ❌ ERROR: First month (${monthKeys[0]}) doesn't match start month (${expectedStart})!`);
        } else if (expectedStart) {
          logger.info(`         ✅ Dates match start month`);
        }
        
        // Check if dates are in 2024 (old data issue)
        const has2024 = monthKeys.some(key => key.startsWith('2024'));
        if (has2024) {
          logger.error(`         ❌ ERROR: Contains 2024 data! This is old data.`);
        }
        
        // Show sample data with verification
        logger.info(`\n         Sample Monthly Data:`);
        monthKeys.slice(0, 3).forEach((monthKey) => {
          const monthData = summary.monthly[monthKey];
          logger.info(`           ${monthKey}:`);
          logger.info(`             Revenue: $${(monthData.revenue || 0).toLocaleString()}`);
          logger.info(`             COGS: $${(monthData.cogs || 0).toLocaleString()}`);
          logger.info(`             Net Income: $${(monthData.netIncome || 0).toLocaleString()}`);
        });
      }
      
      // Verify key metrics
      logger.info(`\n       Key Metrics:`);
      if (summary.revenue) {
        logger.info(`         Total Revenue: $${summary.revenue.toLocaleString()}`);
      }
      if (summary.activeCustomers !== undefined) {
        logger.info(`         Active Customers: ${summary.activeCustomers}`);
        if (summary.activeCustomers === 100 && !assumptions.revenue?.customerCount) {
          logger.warn(`         ⚠️ Using default customer count (100) - no actual data`);
        }
      } else {
        logger.warn(`         ⚠️ No activeCustomers in summary`);
      }
      if (summary.cashBalance) {
        logger.info(`         Cash Balance: $${summary.cashBalance.toLocaleString()}`);
        if (summary.cashBalance === 500000 && !assumptions.cash?.initialCash) {
          logger.warn(`         ⚠️ Using default cash balance (500,000) - no actual data`);
        }
      }
      
      // Data source verification
      logger.info(`\n       Data Source Verification:`);
      if (org.rawTransactions.length > 0) {
        const transactionBased = summary.revenue && summary.revenue > 0;
        logger.info(`         ✅ Has transaction data: ${org.rawTransactions.length} transactions`);
        logger.info(`         ${transactionBased ? '✅' : '⚠️'} Revenue appears ${transactionBased ? 'transaction-based' : 'assumption-based'}`);
      } else {
        logger.warn(`         ⚠️ No transaction data - using assumptions/defaults`);
      }
    }
  }

  logger.info(`\n✅ Analysis complete!`);
  logger.info(`\n📋 Summary:`);
  logger.info(`   - Transaction data: ${org.rawTransactions.length > 0 ? 'Available' : 'Missing'}`);
  logger.info(`   - Models: ${org.models.length}`);
  logger.info(`   - Completed runs: ${org.models.reduce((sum, m) => sum + m.modelRuns.length, 0)}`);
}

testModelAccuracyComplete()
  .catch((e) => {
    logger.error('Error testing model accuracy:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

