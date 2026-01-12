/**
 * Script to set unlimited usage for a specific user
 * Usage: cd backend && npx ts-node scripts/set-unlimited-usage.ts
 * 
 * Sets unlimited quotas for:
 * - Monte Carlo simulations
 * - Exports
 * - Alerts
 * - All other feature limits
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USER_EMAIL = 'cptjacksprw@gmail.com';

// Set to a very high number to represent "unlimited" (2^31 - 1 is max safe integer for PostgreSQL INT)
const UNLIMITED = 2147483647; // Max PostgreSQL INTEGER value

async function setUnlimitedUsage() {
  console.log('='.repeat(80));
  console.log('SETTING UNLIMITED USAGE FOR USER');
  console.log(`Email: ${USER_EMAIL}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    // 1. Find user by email
    console.log('1. Finding user...');
    const user = await prisma.user.findUnique({
      where: { email: USER_EMAIL },
      include: {
        roles: {
          include: {
            org: true
          }
        }
      }
    });

    if (!user) {
      console.error(`❌ User not found: ${USER_EMAIL}`);
      process.exit(1);
    }

    console.log(`✅ User found: ${user.name || user.email} (ID: ${user.id})`);
    console.log(`   Organizations: ${user.roles.length}`);

    // 2. Get all organizations for this user
    const orgIds = user.roles.map(role => role.orgId);
    if (orgIds.length === 0) {
      console.error('❌ User has no organizations');
      process.exit(1);
    }

    console.log('');
    console.log('2. Updating quotas for organizations...');
    console.log(`   Found ${orgIds.length} organization(s)`);

    // 3. Update or create quota for each organization
    for (const orgId of orgIds) {
      const org = user.roles.find(r => r.orgId === orgId)?.org;
      const orgName = org?.name || orgId;

      console.log(`\n   Processing org: ${orgName} (${orgId})`);

      // Check if quota exists
      let quota = await prisma.orgQuota.findUnique({
        where: { orgId }
      });

      if (quota) {
        // Update existing quota
        quota = await prisma.orgQuota.update({
          where: { orgId },
          data: {
            monteCarloSimsLimit: UNLIMITED,
            monteCarloSimsUsed: 0, // Reset used count
            monteCarloResetAt: null, // No reset needed for unlimited
            exportsLimit: UNLIMITED,
            exportsUsed: 0, // Reset used count
            exportsResetAt: null, // No reset needed for unlimited
            alertsLimit: UNLIMITED,
            updatedAt: new Date()
          }
        });
        console.log(`   ✅ Updated existing quota`);
      } else {
        // Create new quota with unlimited limits
        quota = await prisma.orgQuota.create({
          data: {
            orgId,
            monteCarloSimsLimit: UNLIMITED,
            monteCarloSimsUsed: 0,
            monteCarloResetAt: null,
            exportsLimit: UNLIMITED,
            exportsUsed: 0,
            exportsResetAt: null,
            alertsLimit: UNLIMITED
          }
        });
        console.log(`   ✅ Created new quota with unlimited limits`);
      }

      // Update org plan tier to 'enterprise' (or 'unlimited')
      try {
        await prisma.org.update({
          where: { id: orgId },
          data: {
            planTier: 'enterprise'
          }
        });
        console.log(`   ✅ Updated plan tier to 'enterprise'`);
      } catch (error: any) {
        console.warn(`   ⚠️  Could not update plan tier: ${error.message}`);
      }

      // Display quota summary
      console.log(`\n   📊 Quota Summary for ${orgName}:`);
      console.log(`      Monte Carlo Simulations: ${quota.monteCarloSimsLimit.toLocaleString()} (used: ${quota.monteCarloSimsUsed})`);
      console.log(`      Exports: ${quota.exportsLimit.toLocaleString()} (used: ${quota.exportsUsed})`);
      console.log(`      Alerts: ${quota.alertsLimit.toLocaleString()}`);
      console.log(`      Plan Tier: enterprise (unlimited job quotas)`);
      console.log(`      Note: All job quotas (concurrent jobs, daily limits) are bypassed for enterprise orgs`);
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ SUCCESS');
    console.log('='.repeat(80));
    console.log(`Unlimited usage set for user: ${USER_EMAIL}`);
    console.log(`Affected organizations: ${orgIds.length}`);
    console.log('');
    console.log('Features with unlimited access:');
    console.log('  ✅ Monte Carlo Simulations (unlimited)');
    console.log('  ✅ Exports (PDF, PPTX, CSV) (unlimited)');
    console.log('  ✅ Alerts (unlimited)');
    console.log('  ✅ Concurrent Jobs (unlimited - enterprise plan bypasses job quotas)');
    console.log('  ✅ Daily Job Limits (unlimited - enterprise plan bypasses job quotas)');
    console.log('  ✅ All other quota-limited features');
    console.log('');
    console.log('Note: Used counts have been reset to 0');
    console.log('Note: Enterprise plan tier enables unlimited job quotas (concurrent & daily limits bypassed)');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('');
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
setUnlimitedUsage()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

