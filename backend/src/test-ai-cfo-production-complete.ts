/**
 * PRODUCTION-LEVEL COMPREHENSIVE TEST FOR AI CFO ASSISTANT
 * Tests with updated Gemini API keys and verifies all aspects
 * User: cptjacksprw@gmail.com
 * 
 * Usage: npx ts-node src/test-ai-cfo-production-complete.ts [userEmail]
 */

// Ensure backend/.env is loaded when running via ts-node (safe if already loaded)
import './config/env';

import prisma from './config/database';
import { aicfoService } from './services/aicfo.service';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Verify API keys are set
const checkApiKeys = () => {
  const key1 = process.env.GEMINI_API_KEY_1;
  const key2 = process.env.GEMINI_API_KEY_2;
  const defaultKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
  
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`API KEY VERIFICATION`);
  console.log(`${'─'.repeat(80)}\n`);
  
  if (key1) {
    console.log(`✅ GEMINI_API_KEY_1: Set`);
  } else {
    console.log(`❌ GEMINI_API_KEY_1: Not set`);
  }
  
  if (key2) {
    console.log(`✅ GEMINI_API_KEY_2: Set`);
  } else {
    console.log(`❌ GEMINI_API_KEY_2: Not set`);
  }
  
  if (defaultKey) {
    console.log(`✅ GEMINI_API_KEY/LLM_API_KEY: Set`);
  } else {
    console.log(`❌ GEMINI_API_KEY/LLM_API_KEY: Not set`);
  }
  
  // Set primary key if not set
  if (!defaultKey && key1) {
    process.env.GEMINI_API_KEY = key1;
    process.env.LLM_API_KEY = key1;
    console.log(`\n✅ Set GEMINI_API_KEY to GEMINI_API_KEY_1`);
  }
  
  return !!(key1 || key2 || defaultKey);
};

interface ProductionTestQuestion {
  category: string;
  question: string;
  expectedResponseType: 'analysis' | 'recommendation' | 'calculation' | 'guidance';
  shouldHaveStagedChanges: boolean;
  shouldHaveNaturalText: boolean;
  minStagedChanges?: number;
  minTextLength?: number;
  shouldUseLLM: boolean;
}

const productionTestQuestions: ProductionTestQuestion[] = [
  // Simple Financial Queries - Should give calculations
  {
    category: 'Simple Financial Query',
    question: 'What is my current cash runway?',
    expectedResponseType: 'calculation',
    shouldHaveStagedChanges: false,
    shouldHaveNaturalText: true,
    minTextLength: 50,
    shouldUseLLM: false, // Can use fallback
  },
  {
    category: 'Simple Financial Query',
    question: 'What is my burn rate?',
    expectedResponseType: 'calculation',
    shouldHaveStagedChanges: false,
    shouldHaveNaturalText: true,
    minTextLength: 50,
    shouldUseLLM: false,
  },
  
  // Strategic Questions - Should give recommendations with staged changes
  {
    category: 'Strategic Analysis',
    question: 'Should I raise funding now? What are the optimal timing and amount?',
    expectedResponseType: 'recommendation',
    shouldHaveStagedChanges: true,
    shouldHaveNaturalText: true,
    minStagedChanges: 2,
    minTextLength: 200,
    shouldUseLLM: true, // Requires LLM
  },
  {
    category: 'Strategic Analysis',
    question: 'Analyze my expenses and suggest cost optimization opportunities',
    expectedResponseType: 'recommendation',
    shouldHaveStagedChanges: true,
    shouldHaveNaturalText: true,
    minStagedChanges: 2,
    minTextLength: 200,
    shouldUseLLM: true,
  },
  {
    category: 'Strategic Analysis',
    question: 'What strategies can help me accelerate revenue growth?',
    expectedResponseType: 'recommendation',
    shouldHaveStagedChanges: true,
    shouldHaveNaturalText: true,
    minStagedChanges: 2,
    minTextLength: 200,
    shouldUseLLM: true,
  },
  
  // Complex Financial Analysis - Should give actionable plans
  {
    category: 'Complex Analysis',
    question: 'Create a plan to extend runway by 6 months',
    expectedResponseType: 'recommendation',
    shouldHaveStagedChanges: true,
    shouldHaveNaturalText: true,
    minStagedChanges: 3,
    minTextLength: 300,
    shouldUseLLM: true,
  },
  {
    category: 'Complex Analysis',
    question: 'How can I improve my burn rate while maintaining growth?',
    expectedResponseType: 'recommendation',
    shouldHaveStagedChanges: true,
    shouldHaveNaturalText: true,
    minStagedChanges: 2,
    minTextLength: 250,
    shouldUseLLM: true,
  },
  
  // Advanced CFO Questions - Should give comprehensive analysis
  {
    category: 'Advanced CFO',
    question: 'Based on my current financial trajectory, when should I plan my next fundraising round? What metrics should I optimize before approaching investors?',
    expectedResponseType: 'recommendation',
    shouldHaveStagedChanges: true,
    shouldHaveNaturalText: true,
    minStagedChanges: 3,
    minTextLength: 400,
    shouldUseLLM: true,
  },
];

async function testAICFOProductionComplete(userEmail: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 PRODUCTION-LEVEL COMPREHENSIVE TEST - AI CFO ASSISTANT`);
  console.log(`   User: ${userEmail}`);
  console.log(`${'='.repeat(80)}\n`);

  // Check API keys
  const hasApiKeys = checkApiKeys();
  if (!hasApiKeys) {
    console.error(`\n❌ ERROR: No Gemini API keys found!`);
    console.error(`   Please set GEMINI_API_KEY_1, GEMINI_API_KEY_2, or GEMINI_API_KEY in environment`);
    return;
  }

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
  
  console.log(`\n✅ Organization: ${orgName} (${orgId})`);
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
  console.log(`TEST 2: Testing AI CFO with Production Questions`);
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
    llmUsed: boolean;
    responseQuality: 'excellent' | 'good' | 'fair' | 'poor';
    error?: string;
    issues: string[];
    responsePreview?: string;
  }> = [];

  for (let i = 0; i < productionTestQuestions.length; i++) {
    const testQ = productionTestQuestions[i];
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📌 Test ${i + 1}/${productionTestQuestions.length}: "${testQ.question}"`);
    console.log(`   Category: ${testQ.category}`);
    console.log(`   Expected: ${testQ.expectedResponseType}`);
    console.log(`   Should use LLM: ${testQ.shouldUseLLM ? '✅ Yes' : '⚠️  No (fallback OK)'}`);
    
    const issues: string[] = [];
    let planId: string | undefined;
    let hasStagedChanges = false;
    let stagedChangesCount = 0;
    let hasNaturalText = false;
    let naturalTextLength = 0;
    let fallbackUsed = false;
    let llmUsed = false;
    let responseQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
    let responsePreview = '';

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
      responsePreview = structuredResponse.natural_text?.substring(0, 200) || '';
      
      fallbackUsed = metadata.fallbackUsed || 
                     metadata.recommendationsSource === 'fallback' ||
                     (metadata.modelUsed && String(metadata.modelUsed).toLowerCase().includes('fallback'));
      
      llmUsed = !fallbackUsed && (metadata.modelUsed && !String(metadata.modelUsed).toLowerCase().includes('fallback'));

      // Check for issues
      if (testQ.shouldHaveStagedChanges && !hasStagedChanges) {
        issues.push(`❌ Expected staged changes but got none`);
      }
      
      if (testQ.shouldHaveStagedChanges && testQ.minStagedChanges && stagedChangesCount < testQ.minStagedChanges) {
        issues.push(`⚠️  Expected at least ${testQ.minStagedChanges} staged changes but got ${stagedChangesCount}`);
      }
      
      if (!hasNaturalText) {
        issues.push(`❌ No natural text in response`);
      }
      
      if (hasNaturalText && testQ.minTextLength && naturalTextLength < testQ.minTextLength) {
        issues.push(`⚠️  Natural text too short (${naturalTextLength} < ${testQ.minTextLength} chars)`);
      }
      
      if (testQ.shouldUseLLM && fallbackUsed) {
        issues.push(`❌ Should use LLM but fallback was used`);
      }
      
      if (!testQ.shouldUseLLM && llmUsed && !fallbackUsed) {
        // This is actually good, not an issue
      }
      
      // Quality assessment
      if (hasNaturalText && naturalTextLength >= (testQ.minTextLength || 200) && hasStagedChanges && !fallbackUsed && llmUsed) {
        responseQuality = 'excellent';
      } else if (hasNaturalText && (hasStagedChanges || !fallbackUsed)) {
        responseQuality = 'good';
      } else if (hasNaturalText || hasStagedChanges) {
        responseQuality = 'fair';
      }

      console.log(`   ✅ Plan created: ${planId}`);
      console.log(`   - Staged Changes: ${stagedChangesCount} ${hasStagedChanges ? '✅' : '❌'}`);
      console.log(`   - Natural Text: ${hasNaturalText ? '✅' : '❌'} (${naturalTextLength} chars)`);
      console.log(`   - LLM Used: ${llmUsed ? '✅ Yes' : '❌ No'}`);
      console.log(`   - Fallback Used: ${fallbackUsed ? '❌ Yes' : '✅ No'}`);
      console.log(`   - Response Quality: ${responseQuality.toUpperCase()}`);
      
      if (issues.length > 0) {
        console.log(`   ⚠️  Issues:`);
        issues.forEach(issue => console.log(`      ${issue}`));
      }

      // Show sample of natural text
      if (hasNaturalText && responsePreview) {
        console.log(`   📝 Response Preview: "${responsePreview}..."`);
      }

      // Show sample staged changes
      if (hasStagedChanges && stagedChanges.length > 0) {
        console.log(`   📋 Staged Changes:`);
        stagedChanges.slice(0, 3).forEach((change: any, idx: number) => {
          console.log(`      ${idx + 1}. ${change.action || change.type || 'N/A'}`);
          if (change.confidence) {
            console.log(`         Confidence: ${Math.round(change.confidence * 100)}%`);
          }
        });
      }

      // Pace requests to reduce Gemini rate limiting in production-like runs
      if (testQ.shouldUseLLM) {
        await sleep(2500);
      } else {
        await sleep(750);
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
        llmUsed,
        responseQuality,
        issues,
        responsePreview,
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
        llmUsed: false,
        responseQuality: 'poor',
        error: errorMessage,
        issues: [`❌ Error: ${errorMessage}`],
      });
    }

    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`TEST 3: Response Quality Analysis`);
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
  const llmUsageRate = (testResults.filter(r => r.llmUsed).length / testResults.length) * 100;
  const fallbackRate = (testResults.filter(r => r.fallbackUsed).length / testResults.length) * 100;

  console.log(`\n📊 Key Metrics:`);
  console.log(`   - Staged Changes Rate: ${stagedChangesRate.toFixed(1)}%`);
  console.log(`   - Natural Text Rate: ${naturalTextRate.toFixed(1)}%`);
  console.log(`   - LLM Usage Rate: ${llmUsageRate.toFixed(1)}%`);
  console.log(`   - Fallback Response Rate: ${fallbackRate.toFixed(1)}%`);

  // ────────────────────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`TEST 4: Production Readiness Check`);
  console.log(`${'─'.repeat(80)}\n`);

  const bugs: string[] = [];
  const warnings: string[] = [];

  // Check for critical bugs
  if (failedTests.length > 0) {
    bugs.push(`${failedTests.length} tests failed to generate plans`);
  }

  const strategicQuestionsWithoutStagedChanges = testResults.filter(r => {
    const testQ = productionTestQuestions.find(q => q.question === r.question);
    return r.success && testQ?.shouldHaveStagedChanges && !r.hasStagedChanges;
  });

  if (strategicQuestionsWithoutStagedChanges.length > 0) {
    bugs.push(`${strategicQuestionsWithoutStagedChanges.length} strategic questions didn't generate staged changes`);
  }

  const questionsWithoutNaturalText = testResults.filter(r => r.success && !r.hasNaturalText);
  if (questionsWithoutNaturalText.length > 0) {
    bugs.push(`${questionsWithoutNaturalText.length} responses have no natural text`);
  }

  const llmRequiredButFallbackUsed = testResults.filter(r => {
    const testQ = productionTestQuestions.find(q => q.question === r.question);
    return r.success && testQ?.shouldUseLLM && r.fallbackUsed;
  });

  if (llmRequiredButFallbackUsed.length > 0) {
    bugs.push(`${llmRequiredButFallbackUsed.length} questions requiring LLM used fallback instead`);
  }

  // Check for warnings
  const questionsWithFallback = testResults.filter(r => r.success && r.fallbackUsed);
  if (questionsWithFallback.length > 0 && llmRequiredButFallbackUsed.length === 0) {
    warnings.push(`${questionsWithFallback.length} responses used fallback (acceptable for simple queries)`);
  }

  const shortResponses = testResults.filter(r => {
    const testQ = productionTestQuestions.find(q => q.question === r.question);
    return r.success && r.hasNaturalText && testQ?.minTextLength && r.naturalTextLength < testQ.minTextLength;
  });

  if (shortResponses.length > 0) {
    warnings.push(`${shortResponses.length} responses have shorter text than expected`);
  }

  console.log(`📋 Critical Bugs Found: ${bugs.length}`);
  bugs.forEach((bug, idx) => {
    console.log(`   ${idx + 1}. ❌ ${bug}`);
  });

  console.log(`\n⚠️  Warnings: ${warnings.length}`);
  warnings.forEach((warning, idx) => {
    console.log(`   ${idx + 1}. ⚠️  ${warning}`);
  });

  // Production readiness assessment
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`PRODUCTION READINESS ASSESSMENT`);
  console.log(`${'─'.repeat(80)}\n`);

  const isProductionReady = bugs.length === 0 && 
                            llmUsageRate >= 50 && 
                            naturalTextRate >= 90 && 
                            stagedChangesRate >= 60;

  if (isProductionReady) {
    console.log(`✅ PRODUCTION READY`);
    console.log(`   - All critical tests passed`);
    console.log(`   - LLM integration working (${llmUsageRate.toFixed(1)}% usage)`);
    console.log(`   - High quality responses (${qualityBreakdown['excellent'] || 0} excellent, ${qualityBreakdown['good'] || 0} good)`);
  } else {
    console.log(`⚠️  NOT FULLY PRODUCTION READY`);
    if (bugs.length > 0) {
      console.log(`   - ${bugs.length} critical bugs need to be fixed`);
    }
    if (llmUsageRate < 50) {
      console.log(`   - LLM usage rate too low (${llmUsageRate.toFixed(1)}% < 50%)`);
    }
    if (naturalTextRate < 90) {
      console.log(`   - Natural text rate too low (${naturalTextRate.toFixed(1)}% < 90%)`);
    }
    if (stagedChangesRate < 60) {
      console.log(`   - Staged changes rate too low (${stagedChangesRate.toFixed(1)}% < 60%)`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ PRODUCTION TEST COMPLETE`);
  console.log(`${'='.repeat(80)}\n`);

  await prisma.$disconnect();
}

// Run the test
const userEmail = process.argv[2] || 'cptjacksprw@gmail.com';
testAICFOProductionComplete(userEmail)
  .catch((e) => {
    console.error('❌ Test failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


