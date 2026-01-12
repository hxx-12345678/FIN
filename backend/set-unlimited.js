const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const email = 'cptjacksprw@gmail.com';
  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { org: true } } }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  const orgId = user.roles[0].orgId;
  console.log(`Setting unlimited usage for Org: ${user.roles[0].org.name} (${orgId})`);

  // Update or create OrgQuota
  await prisma.orgQuota.upsert({
    where: { orgId },
    update: {
      monteCarloSimsLimit: 999999,
      exportsLimit: 999999,
      alertsLimit: 999999,
      updatedAt: new Date()
    },
    create: {
      orgId,
      monteCarloSimsLimit: 999999,
      exportsLimit: 999999,
      alertsLimit: 999999,
    }
  });

  console.log('✅ Unlimited usage granted for Monte Carlo, Exports, and Alerts.');
  await prisma.$disconnect();
}

run();
