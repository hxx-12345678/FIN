
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const orgId = 'e4711415-1ae2-4b91-99d8-6e3e4606107e';
        const txs = await prisma.$queryRawUnsafe(`SELECT date, amount FROM raw_transactions WHERE \"orgId\" = '${orgId}' ORDER BY date DESC LIMIT 5`);
        console.log('Latest Transactions:', txs);

        const models = await prisma.model.findMany({
            where: { orgId },
            include: { modelRuns: { orderBy: { createdAt: 'desc' }, take: 1 } },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        console.log('--- Last 5 Models Comparison ---');
        models.forEach(m => {
            const run = m.modelRuns[0];
            const summary = run?.summaryJson || {};
            console.log(`Model: ${m.name}`);
            console.log(`  ID: ${m.id}`);
            console.log(`  Revenue: ${summary.totalRevenue || summary.revenue}`);
            console.log(`  Net Income: ${summary.netIncome}`);
            console.log(`  Created At: ${m.createdAt}`);
            console.log('---------------------------');
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
