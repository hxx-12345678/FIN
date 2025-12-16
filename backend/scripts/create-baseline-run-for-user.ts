import prisma from '../src/config/database';
import { logger } from '../src/utils/logger';

/**
 * Creates a new baseline model run + queued job for the latest model in the user's primary org.
 *
 * Usage:
 *   npx tsx scripts/create-baseline-run-for-user.ts <email>
 */
async function main() {
  const email = process.argv[2] || 'cptjacksprw@gmail.com';

  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { org: true } } },
  });

  if (!user || user.roles.length === 0) {
    throw new Error(`User not found or no org roles: ${email}`);
  }

  const orgId = user.roles[0].orgId;

  const model = await prisma.model.findFirst({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });

  if (!model) {
    throw new Error(`No models found for org ${orgId}`);
  }

  const paramsJson = {
    runType: 'baseline',
    modelType: 'prophet',
    model_type: 'prophet',
    horizon: '12months',
  };

  const modelRun = await prisma.modelRun.create({
    data: {
      modelId: model.id,
      orgId,
      runType: 'baseline',
      paramsJson,
      status: 'queued',
    },
  });

  const job = await prisma.job.create({
    data: {
      jobType: 'model_run',
      orgId,
      objectId: modelRun.id,
      status: 'queued',
      progress: 0,
      logs: {
        params: {
          modelRunId: modelRun.id,
          modelId: model.id,
          runType: 'baseline',
          paramsJson,
        },
      },
      createdByUserId: user.id,
      queue: 'default',
      priority: 50,
    },
  });

  logger.info('✅ Created baseline run + job', {
    email,
    orgId,
    modelId: model.id,
    modelName: model.name,
    modelRunId: modelRun.id,
    jobId: job.id,
  });

  console.log(
    JSON.stringify(
      {
        email,
        orgId,
        model: { id: model.id, name: model.name },
        modelRunId: modelRun.id,
        jobId: job.id,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


