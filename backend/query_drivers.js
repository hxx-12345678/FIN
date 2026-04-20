const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'cptjacksprw@gmail.com' },
    include: {
      roles: {
        include: { org: true }
      }
    }
  });

  if (!user) {
    console.log('User not found.');
    return;
  }

  console.log('User:', user.email);

  if (user.roles.length > 0) {
    const orgId = user.roles[0].orgId;
    const drivers = await prisma.driver.findMany({
      where: { orgId }
    });
    console.log('Drivers Count:', drivers.length);
    console.log(JSON.stringify(drivers.map(d => ({ id: d.id, name: d.name, dependencies: d.dependencies })), null, 2));
  } else {
    console.log('No org roles found for user');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
