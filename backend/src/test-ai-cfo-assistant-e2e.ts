/**
 * COMPREHENSIVE END-TO-END TEST FOR AI CFO ASSISTANT
 * Tests actual API calls, verifies responses, checks database
 * User: cptjacksprw@gmail.com
 * 
 * Usage: npx ts-node src/test-ai-cfo-assistant-e2e.ts [userEmail]
 */

import prisma from './config/database';
import { aicfoService } from './services/aicfo.service';

interface TestQuestion {
  category: string;
  question: string;
  expectedResponseType: 'analysis' | 'recommendation' | 'calculation' | 'guidance';
  shouldHaveStagedChanges: boolean;
  shouldHaveNaturalText: boolean;
  minStagedChanges?: number;
}

const comprehensiveTestQuestions: TestQuestion[] = [
  // Simple Financial Queries - Should give calculations
  {
    category: 'Simple Financial Query',
    question: 'What is my current cash runway?',
    expectedResponseType: 'calculation',
    shouldHaveStagedChanges: false,
    shouldHaveNaturalText: true,
  },
  {
    category: 'Simple Financial Query',
    question: 'What is my burn rate?',
    expectedResponseType: 'calculation',
    shouldHaveStagedChanges: false,
    shouldHaveNaturalText: true,
  },
  {
    category: 'Simple Financial Query',
    question: 'How many active customers do I have?',
    expectedResponseType: 'calculation',
    shouldHaveStagedChanges: false,
    shouldHaveNaturalText: true,
  },
  {
    category: 'Simple Financial Query',
    question: 'What is my ARR?',
    expectedResponseType: 'calculation',
    shouldHaveStagedChanges: false,
    shouldHaveNaturalText: true,
  },
  
  // Strategic Questions - Should give recommendations with staged changes
  {
    category: 'Strategic Analysis',
    question: 'Should I raise funding now? What are the optimal timing and amount?',
    expectedResponseType: 'recommendation',
    shouldHaveStagedChanges: true,
    shouldHaveNaturalText: true,
    minStagedChanges: 2,
  },
  {
    category: 'Strategic Analysis',
    question: 'Analyze my expenses and suggest cost optimization opportunities',
    expectedResponseType: 'recommendation',
    shouldHaveStagedChanges: true,
    shouldHaveNaturalText: true,
    minStagedChanges: 2,
  },
  {
    category: 'Strategic Analysis',
    question: 'What strategies can help me accelerate revenue growth?',
    expectedResponseType: 'recommendation',
    shouldHaveStagedChanges: true,
    shouldHaveNaturalText: true,
    minStagedChanges: 2,
  },
  
  // Complex Financial Analysis - Should give actionable plans
  {
    category: 'Complex Analysis',
    question: 'Create a plan to extend runway by 6 months',
    expectedResponseType: 'recommendation',
    shouldHaveStagedChanges: true,
    shouldHaveNaturalText: true,
    minStagedChanges: 3,
  },
  {
    category: 'Complex Analysis',
    question: 'How can I improve my burn rate while maintaining growth?',
    expectedResponseType: 'recommendation',
    shouldHaveStagedChanges: true,
    shouldHaveNaturalText: true,
    minStagedChanges: 2,
  },
  {
    category: 'Complex Analysis',
    question: 'What is my unit economics? Calculate LTV, CAC, and payback period.',
    expectedResponseType: 'calculation',
    shouldHaveStagedChanges: false,
    shouldHaveNaturalText: true,
  },
  
  // Advanced CFO Questions - Should give comprehensive analysis
  {
    category: 'Advanced CFO',
    question: 'Based on my current financial trajectory, when should I plan my next fundraising round? What metrics should I optimize before approaching investors?',
    expectedResponseType: 'recommendation',
    shouldHaveStagedChanges: true,
    shouldHaveNaturalText: true,
    minStagedChanges: 3,
  },
  {
    category: 'Advanced CFO',
    question: 'Compare my current burn rate to industry benchmarks for SaaS companies at my stage. What are the key areas for improvement?',
    expectedResponseType: 'analysis',
    shouldHaveStagedChanges: true,
    shouldHaveNaturalText: true,
    minStagedChanges: 2,
  },
  {
    category: 'Advanced CFO',
    question: 'If I reduce marketing spend by 20% and increase sales team by 2 people, what would be the impact on my runway and revenue growth?',
    expectedResponseType: 'analysis',
    shouldHaveStagedChanges: true,
    shouldHaveNaturalText: true,
    minStagedChanges: 2,
  },
];

async function testAICFOAssistantE2E(userEmail: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 COMPREHENSIVE E2E TEST - AI CFO ASSISTANT`);
  console.log(`   User: ${userEmail}`);
  console.log(`${'='.repeat(80)}\n`);

  // Find user
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

  if (!user) {
    console.error(`❌ User with email ${userEmail} not found.`);
    return;
  }

  if (!user.roles || user.roles.length === 0) {
    console.error(`❌ User ${userEmail} is not associated with any organization.`);
    return;
  }

  const orgId = user.roles[0].org.id;
  const orgName = user.roles[0].org.name;
  const userId = user.id;
  
  console.log(`✅ Organization: ${orgName} (${orgId})`);
  console.log(`✅ User ID: ${userId}\n`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`TEST 1: Database State - Before Testing`);
  console.log(`${'─'.repeat(80)}\n`);

  const plansBefore = await prisma.aICFOPlan.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`📊 Existing Plans: ${plansBefore.length}\n`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`TEST 2: Testing AI CFO with Real Questions`);
  console.log(`${'─'.repeat(80)}\n`);

  const testResults: Array<{
    question: string;
    category: string;
    success: boolean;
    planId?: string;
    hasStagedChanges: boolean;
    stagedChangesCount: number;
    hasNaturalText: boolean;
    naturalTextLength: number;
    fallbackUsed: boolean;
    responseQuality: 'excellent' | 'good' | 'fair' | 'poor';
    error?: string;
    issues: string[];
  }> = [];

  // Test a subset of questions (to avoid rate limiting)
  const questionsToTest = comprehensiveTestQuestions.slice(0, 8); // Test 8 questions

  for (let i = 0; i < questionsToTest.length; i++) {
    const testQ = questionsToTest[i];
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📌 Test ${i + 1}/${questionsToTest.length}: "${testQ.question}"`);
    console.log(`   Category: ${testQ.category}`);
    console.log(`   Expected: ${testQ.expectedResponseType}`);
    console.log(`   Should have staged changes: ${testQ.shouldHaveStagedChanges}`);
    
    const issues: string[] = [];
    let planId: string | undefined;
    let hasStagedChanges = false;
    let stagedChangesCount = 0;
    let hasNaturalText = false;
    let naturalTextLength = 0;
    let fallbackUsed = false;
    let responseQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';

    try {
      // Call the actual service
      const plan = await aicfoService.generatePlan(orgId, userId, {
        goal: testQ.question,
      });

      if (!plan) {
        throw new Error('No plan returned from service');
      }

      planId = plan.id;
      const planJson = typeof plan.planJson === 'string' 
        ? JSON.parse(plan.planJson) 
        : plan.planJson;

      const stagedChanges = planJson?.stagedChanges || [];
      const structuredResponse = planJson?.structuredResponse || {};
      const metadata = planJson?.metadata || {};
      
      stagedChangesCount = stagedChanges.length;
      hasStagedChanges = stagedChanges.length > 0;
      hasNaturalText = !!structuredResponse.natural_text;
      naturalTextLength = structuredResponse.natural_text?.length || 0;
      
      fallbackUsed = metadata.fallbackUsed || 
                     metadata.recommendationsSource === 'fallback' ||
                     (metadata.modelUsed && String(metadata.modelUsed).toLowerCase().includes('fallback'));

      // Check for issues
      if (testQ.shouldHaveStagedChanges && !hasStagedChanges) {
        issues.push(`❌ Expected staged changes but got none`);
      }
      
      if (testQ.shouldHaveStagedChanges && testQ.minStagedChanges && stagedChangesCount < testQ.minStagedChanges) {
        issues.push(`⚠️  Expected at least ${testQ.minStagedChanges} staged changes but got ${stagedChangesCount}`);
      }
      
      if (!testQ.shouldHaveStagedChanges && hasStagedChanges) {
        issues.push(`⚠️  Got staged changes but didn't expect them`);
      }
      
      if (!hasNaturalText) {
        issues.push(`❌ No natural text in response`);
      }
      
      if (hasNaturalText && naturalTextLength < 100) {
        issues.push(`⚠️  Natural text is too short (${naturalTextLength} chars)`);
      }
      
      if (fallbackUsed) {
        issues.push(`❌ Fallback response used (low quality)`);
      }
      
      if (hasNaturalText && naturalTextLength > 200 && hasStagedChanges && !fallbackUsed) {
        responseQuality = 'excellent';
      } else if (hasNaturalText && (hasStagedChanges || !fallbackUsed)) {
        responseQuality = 'good';
      } else if (hasNaturalText || hasStagedChanges) {
        responseQuality = 'fair';
      }

      console.log(`   ✅ Plan created: ${planId}`);
      console.log(`   - Staged Changes: ${stagedChangesCount} ${hasStagedChanges ? '✅' : '❌'}`);
      console.log(`   - Natural Text: ${hasNaturalText ? '✅' : '❌'} (${naturalTextLength} chars)`);
      console.log(`   - Fallback Used: ${fallbackUsed ? '❌ Yes' : '✅ No'}`);
      console.log(`   - Response Quality: ${responseQuality.toUpperCase()}`);
      
      if (issues.length > 0) {
        console.log(`   ⚠️  Issues:`);
        issues.forEach(issue => console.log(`      ${issue}`));
      }

      // Show sample of natural text
      if (hasNaturalText) {
        const preview = structuredResponse.natural_text.substring(0, 150);
        console.log(`   📝 Response Preview: "${preview}..."`);
      }

      // Show sample staged changes
      if (hasStagedChanges && stagedChanges.length > 0) {
        console.log(`   📋 Staged Changes:`);
        stagedChanges.slice(0, 3).forEach((change: any, idx: number) => {
          console.log(`      ${idx + 1}. ${change.action || 'N/A'}`);
          console.log(`         Confidence: ${change.confidence ? Math.round(change.confidence * 100) : 'N/A'}%`);
        });
      }

      testResults.push({
        question: testQ.question,
        category: testQ.category,
        success: true,
        planId,
        hasStagedChanges,
        stagedChangesCount,
        hasNaturalText,
        naturalTextLength,
        fallbackUsed,
        responseQuality,
        issues,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.log(`   ❌ Error: ${errorMessage}`);
      testResults.push({
        question: testQ.question,
        category: testQ.category,
        success: false,
        hasStagedChanges: false,
        stagedChangesCount: 0,
        hasNaturalText: false,
        naturalTextLength: 0,
        fallbackUsed: false,
        responseQuality: 'poor',
        error: errorMessage,
        issues: [`❌ Error: ${errorMessage}`],
      });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`TEST 3: Database Verification - After Testing`);
  console.log(`${'─'.repeat(80)}\n`);

  const plansAfter = await prisma.aICFOPlan.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  console.log(`📊 Total Plans After Testing: ${plansAfter.length}`);
  console.log(`📊 New Plans Created: ${plansAfter.length - plansBefore.length}\n`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`${'─'.repeat(80)}`);
  console.log(`TEST 4: Response Quality Analysis`);
  console.log(`${'─'.repeat(80)}\n`);

  const successfulTests = testResults.filter(r => r.success);
  const failedTests = testResults.filter(r => !r.success);
  
  console.log(`✅ Successful Tests: ${successfulTests.length}/${testResults.length}`);
  console.log(`❌ Failed Tests: ${failedTests.length}/${testResults.length}\n`);

  const qualityBreakdown = testResults.reduce((acc, result) => {
    acc[result.responseQuality] = (acc[result.responseQuality] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`📊 Response Quality Breakdown:`);
  Object.entries(qualityBreakdown).forEach(([quality, count]) => {
    const emoji = quality === 'excellent' ? '✅' : quality === 'good' ? '👍' : quality === 'fair' ? '⚠️' : '❌';
    console.log(`   ${emoji} ${quality.toUpperCase()}: ${count}`);
  });

  const stagedChangesRate = (testResults.filter(r => r.hasStagedChanges).length / testResults.length) * 100;
  const naturalTextRate = (testResults.filter(r => r.hasNaturalText).length / testResults.length) * 100;
  const fallbackRate = (testResults.filter(r => r.fallbackUsed).length / testResults.length) * 100;

  console.log(`\n📊 Key Metrics:`);
  console.log(`   - Staged Changes Rate: ${stagedChangesRate.toFixed(1)}%`);
  console.log(`   - Natural Text Rate: ${naturalTextRate.toFixed(1)}%`);
  console.log(`   - Fallback Response Rate: ${fallbackRate.toFixed(1)}%`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`TEST 5: Detailed Issue Analysis`);
  console.log(`${'─'.repeat(80)}\n`);

  const allIssues = testResults.flatMap(r => r.issues);
  const uniqueIssues = Array.from(new Set(allIssues));

  if (uniqueIssues.length > 0) {
    console.log(`📋 Issues Found:`);
    uniqueIssues.forEach((issue, idx) => {
      const count = allIssues.filter(i => i === issue).length;
      console.log(`   ${idx + 1}. ${issue} (${count} occurrences)`);
    });
  } else {
    console.log(`✅ No issues found!`);
  }

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`TEST SUMMARY`);
  console.log(`${'─'.repeat(80)}\n`);

  const bugs: string[] = [];
  const warnings: string[] = [];

  // Check for bugs
  if (failedTests.length > 0) {
    bugs.push(`${failedTests.length} tests failed to generate plans`);
  }

  const questionsWithoutStagedChanges = testResults.filter(r => 
    r.success && 
    comprehensiveTestQuestions.find(q => q.question === r.question)?.shouldHaveStagedChanges &&
    !r.hasStagedChanges
  );

  if (questionsWithoutStagedChanges.length > 0) {
    bugs.push(`${questionsWithoutStagedChanges.length} strategic questions didn't generate staged changes`);
  }

  const questionsWithFallback = testResults.filter(r => r.success && r.fallbackUsed);
  if (questionsWithFallback.length > 0) {
    warnings.push(`${questionsWithFallback.length} responses used fallback (low quality)`);
  }

  const questionsWithoutNaturalText = testResults.filter(r => r.success && !r.hasNaturalText);
  if (questionsWithoutNaturalText.length > 0) {
    bugs.push(`${questionsWithoutNaturalText.length} responses have no natural text`);
  }

  const shortResponses = testResults.filter(r => r.success && r.hasNaturalText && r.naturalTextLength < 100);
  if (shortResponses.length > 0) {
    warnings.push(`${shortResponses.length} responses have very short natural text (< 100 chars)`);
  }

  console.log(`📋 Bugs Found: ${bugs.length}`);
  bugs.forEach((bug, idx) => {
    console.log(`   ${idx + 1}. ❌ ${bug}`);
  });

  console.log(`\n⚠️  Warnings: ${warnings.length}`);
  warnings.forEach((warning, idx) => {
    console.log(`   ${idx + 1}. ⚠️  ${warning}`);
  });

  if (bugs.length === 0 && warnings.length === 0) {
    console.log(`\n✅ All tests passed! No bugs or warnings found.`);
  } else {
    console.log(`\n⚠️  Issues found. Review the detailed analysis above.`);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ E2E TEST COMPLETE`);
  console.log(`${'='.repeat(80)}\n`);
}

// Run the test
const userEmail = process.argv[2] || 'cptjacksprw@gmail.com';
testAICFOAssistantE2E(userEmail)
  .catch((e) => {
    console.error('❌ Test failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

