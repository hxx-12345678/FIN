/**
 * Script to delete all financial models for a specific user
 * Usage: node scripts/delete-user-models.js <email>
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteUserModels(email) {
  try {
    console.log(`Finding user: ${email}...`);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            org: true,
          },
        },
      },
    });

    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.id} (${user.email})`);
    console.log(`User has ${user.roles.length} organization(s)`);

    // Delete models for each org the user belongs to
    for (const role of user.roles) {
      const orgId = role.orgId;
      console.log(`\nDeleting models for org: ${role.org.name} (${orgId})...`);

      // Get all models for this org
      const models = await prisma.model.findMany({
        where: { orgId },
        select: { id: true, name: true },
      });

      console.log(`Found ${models.length} model(s) to delete`);

      // Delete model runs first (cascade)
      for (const model of models) {
        const runCount = await prisma.modelRun.count({
          where: { modelId: model.id },
        });
        
        if (runCount > 0) {
          await prisma.modelRun.deleteMany({
            where: { modelId: model.id },
          });
          console.log(`  Deleted ${runCount} run(s) for model: ${model.name}`);
        }
      }

      // Delete models
      const deleted = await prisma.model.deleteMany({
        where: { orgId },
      });

      console.log(`Deleted ${deleted.count} model(s) for org: ${role.org.name}`);
    }

    console.log('\n✅ All models deleted successfully!');
  } catch (error) {
    console.error('Error deleting models:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/delete-user-models.js <email>');
  process.exit(1);
}

deleteUserModels(email);


