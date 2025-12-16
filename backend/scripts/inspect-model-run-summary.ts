import prisma from '../src/config/database';

/**
 * Usage:
 *   npx tsx scripts/inspect-model-run-summary.ts <modelRunId>
 */
async function main() {
  const modelRunId = process.argv[2];
  if (!modelRunId) {
    console.error('Missing modelRunId.\nUsage: npx tsx scripts/inspect-model-run-summary.ts <modelRunId>');
    process.exit(2);
  }

  const run = await prisma.modelRun.findUnique({ where: { id: modelRunId } });
  if (!run) {
    console.error(`ModelRun not found: ${modelRunId}`);
    process.exit(1);
  }

  const sj: any = run.summaryJson;
  console.log('modelRunId:', modelRunId);
  console.log('summaryJson typeof:', typeof sj);

  if (sj && typeof sj === 'object') {
    console.log('top-level keys:', Object.keys(sj));
    console.log('has monthly:', Object.prototype.hasOwnProperty.call(sj, 'monthly'));
    if (sj.monthly && typeof sj.monthly === 'object') {
      console.log('monthly key count:', Object.keys(sj.monthly).length);
      const firstKeys = Object.keys(sj.monthly).sort().slice(0, 5);
      console.log('monthly sample keys:', firstKeys);
    } else {
      console.log('monthly value type:', typeof sj.monthly);
    }
    const fr = sj.fullResult;
    console.log('has fullResult:', !!fr);
    if (fr && typeof fr === 'object') {
      console.log('fullResult keys:', Object.keys(fr));
      console.log('fullResult has monthly:', Object.prototype.hasOwnProperty.call(fr, 'monthly'));
      if (fr.monthly && typeof fr.monthly === 'object') {
        console.log('fullResult monthly key count:', Object.keys(fr.monthly).length);
        console.log('fullResult monthly sample keys:', Object.keys(fr.monthly).sort().slice(0, 5));
      } else {
        console.log('fullResult monthly value type:', typeof fr.monthly);
      }
    }
  } else {
    const preview = String(sj ?? '').slice(0, 800);
    console.log('summaryJson preview:', preview);
    if (typeof sj === 'string') {
      try {
        const parsed = JSON.parse(sj);
        console.log('parsed keys:', parsed && typeof parsed === 'object' ? Object.keys(parsed) : typeof parsed);
      } catch (e: any) {
        console.log('failed to JSON.parse(summaryJson):', e?.message || String(e));
      }
    }
  }
}

main()
  .catch((e) => {
    console.error('inspect failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


