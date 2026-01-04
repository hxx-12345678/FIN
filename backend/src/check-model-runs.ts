import prisma from './config/database';

async function checkModelRuns() {
  const orgId = '9f4eaa3d-c2a4-4fa4-978d-f463b613d93a';
  
  const models = await prisma.model.findMany({
    where: { orgId },
    include: {
      modelRuns: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });
  
  console.log(`Found ${models.length} model(s)`);
  models.forEach(model => {
    console.log(`\nModel: ${model.name} (${model.id})`);
    console.log(`  Runs: ${model.modelRuns.length}`);
    model.modelRuns.forEach(run => {
      console.log(`    - ${run.status} (${run.runType}) - Created: ${run.createdAt.toISOString()}`);
      if (run.summaryJson) {
        const summary = typeof run.summaryJson === 'string' ? JSON.parse(run.summaryJson) : run.summaryJson;
        console.log(`      Summary keys: ${Object.keys(summary).join(', ')}`);
        if (summary.monthly) {
          const months = Object.keys(summary.monthly);
          console.log(`      Monthly data: ${months.length} months`);
        }
      }
    });
  });
  
  await prisma.$disconnect();
}

checkModelRuns().catch(console.error);



