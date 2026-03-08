
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkJobs() {
    const jobs = await prisma.job.findMany({
        where: { jobType: 'auto_model' },
        orderBy: { createdAt: 'desc' },
        take: 2,
        include: {
            org: true
        }
    });

    for (const job of jobs) {
        console.log(`--- JOB: ${job.id} ---`);
        console.log(`Type: ${job.jobType}`);
        console.log(`Status: ${job.status}`);
        console.log(`LastError: ${job.lastError || 'None'}`);
        if (job.logs && Array.isArray(job.logs)) {
            job.logs.forEach(log => {
                console.log(`[${log.level}] ${log.msg}`);
                if (log.meta && log.meta.error) {
                    console.log(`  Error: ${log.meta.error}`);
                }
                if (log.meta && log.meta.traceback) {
                    console.log(`  Traceback: ${log.meta.traceback}`);
                }
            });
        }
        console.log('------------------------\n');
    }

    await prisma.$disconnect();
}

checkJobs().catch(e => console.error(e));
