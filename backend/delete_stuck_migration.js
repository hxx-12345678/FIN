const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const result = await prisma.$executeRaw`DELETE FROM _prisma_migrations WHERE migration_name = '20260209053640_add_computation_trace'`;
        console.log('Deleted rows:', result);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
