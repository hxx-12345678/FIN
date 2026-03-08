
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJobs() {
    const jobs = await prisma.job.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    jobs.forEach(job => {
        console.log(`--- JOB: ${job.id} ---`);
        console.log(`Type: ${job.jobType}`);
        console.log(`Status: ${job.status}`);
        console.log(`LastError: ${job.lastError || 'None'}`);
        console.log(`Logs: ${JSON.stringify(job.logs)}`);
        console.log('------------------------\n');
    });

    await prisma.$disconnect();
}

checkJobs().catch(e => console.error(e));
