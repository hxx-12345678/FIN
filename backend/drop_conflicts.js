const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Dropping conflicting indices and constraints...');
        await prisma.$executeRaw`DROP INDEX IF EXISTS "jobs_idempotency_key_key"`;
        await prisma.$executeRaw`DROP INDEX IF EXISTS "jobs_idempotency_key_idx"`;
        await prisma.$executeRaw`DROP INDEX IF EXISTS "connectors_auto_sync_enabled_last_synced_at_idx"`;
        await prisma.$executeRaw`DROP INDEX IF EXISTS "notifications_created_at_idx"`;
        // Add more if needed based on the migration.sql I saw earlier
        console.log('Done.');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
