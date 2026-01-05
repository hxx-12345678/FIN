/**
 * Quick test for a single AI CFO question
 */

// Ensure backend/.env is loaded when running via ts-node (safe if already loaded)
import './config/env';

import prisma from './config/database';
import { aicfoService } from './services/aicfo.service';

async function testSingleQuestion() {
  const userEmail = 'cptjacksprw@gmail.com';
  
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      roles: {
        include: {
          org: true,
        },
      },
    },
  });

  if (!user || !user.roles || user.roles.length === 0) {
    console.error('User not found');
    return;
  }

  const orgId = user.roles[0].org.id;
  const userId = user.id;

  console.log(`\nTesting: "What is my current cash runway?"`);
  console.log(`Org: ${user.roles[0].org.name} (${orgId})\n`);

  const plan = await aicfoService.generatePlan(orgId, userId, {
    goal: 'What is my current cash runway?',
  });

  const planJson = typeof plan.planJson === 'string' 
    ? JSON.parse(plan.planJson) 
    : plan.planJson;

  console.log(`\n✅ Plan created: ${plan.id}`);
  console.log(`\nNatural Text:`);
  console.log(planJson?.structuredResponse?.natural_text || 'N/A');
  console.log(`\nNatural Text Length: ${planJson?.structuredResponse?.natural_text?.length || 0} chars`);
  console.log(`\nStaged Changes: ${planJson?.stagedChanges?.length || 0}`);
  if (planJson?.stagedChanges && planJson.stagedChanges.length > 0) {
    console.log(`\nStaged Changes Details:`);
    planJson.stagedChanges.forEach((sc: any, idx: number) => {
      console.log(`  ${idx + 1}. ${sc.action || 'N/A'}`);
      console.log(`     Evidence: ${JSON.stringify(sc.evidence || [])}`);
      console.log(`     Explain: ${sc.explain || 'N/A'}`);
    });
  }
  console.log(`\nMetadata:`);
  console.log(JSON.stringify(planJson?.metadata || {}, null, 2));

  await prisma.$disconnect();
}

testSingleQuestion().catch(console.error);

