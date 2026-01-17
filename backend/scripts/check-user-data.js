/**
 * Check User Data Script
 * Verifies user cptjacksprw@gmail.com exists and has proper data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const USER_EMAIL = 'cptjacksprw@gmail.com';

async function checkUserData() {
  console.log('='.repeat(80));
  console.log('CHECKING USER DATA');
  console.log(`Email: ${USER_EMAIL}`);
  console.log('='.repeat(80));
  console.log('');

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: USER_EMAIL },
      include: {
        roles: {
          include: {
            org: {
              include: {
                quota: true,
              }
            }
          }
        }
      }
    });

    if (!user) {
      console.error(`❌ User not found: ${USER_EMAIL}`);
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log(`✅ User found:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name || 'N/A'}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log(`   Last Login: ${user.lastLogin || 'Never'}`);
    console.log('');

    // Check organizations
    console.log(`Organizations: ${user.roles.length}`);
    user.roles.forEach((role, index) => {
      console.log(`   ${index + 1}. ${role.org.name}`);
      console.log(`      Role: ${role.role}`);
      console.log(`      Org ID: ${role.orgId}`);
      if (role.org.quota) {
        console.log(`      Monte Carlo Limit: ${role.org.quota.monteCarloSimsLimit}`);
        console.log(`      Exports Limit: ${role.org.quota.exportsLimit}`);
      }
    });
    console.log('');

    // Check models
    const models = await prisma.model.findMany({
      where: { orgId: user.roles[0]?.orgId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        modelRuns: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            createdAt: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    console.log(`Models: ${models.length}`);
    models.forEach((model, index) => {
      console.log(`   ${index + 1}. ${model.name} (${model.id})`);
      console.log(`      Created: ${model.createdAt}`);
      if (model.modelRuns && model.modelRuns.length > 0) {
        console.log(`      Latest Run: ${model.modelRuns[0].id} (${model.modelRuns[0].status})`);
      }
    });
    console.log('');

    // Check Monte Carlo jobs
    const orgId = user.roles[0]?.orgId;
    if (orgId) {
      const monteCarloJobs = await prisma.monteCarloJob.findMany({
        where: { orgId },
        select: {
          id: true,
          status: true,
          numSimulations: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      console.log(`Monte Carlo Jobs: ${monteCarloJobs.length}`);
      monteCarloJobs.forEach((job, index) => {
        console.log(`   ${index + 1}. ${job.id}`);
        console.log(`      Status: ${job.status}`);
        console.log(`      Simulations: ${job.numSimulations}`);
        console.log(`      Created: ${job.createdAt}`);
      });
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ USER DATA CHECK COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error checking user data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkUserData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
