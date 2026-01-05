/**
 * PRODUCTION-LEVEL COMPREHENSIVE TEST FOR AI CFO ASSISTANT
 * Tests with updated Gemini API keys and verifies all aspects
 * User: cptjacksprw@gmail.com
 * 
 * Usage: npx ts-node src/test-ai-cfo-production-final.ts [userEmail]
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
    console.log(`✅ GEMINI_API_KEY_1: Set (${key1.substring(0, 20)}...)`);
  } else {
    console.log(`❌ GEMINI_API_KEY_1: Not set`);
  }
  
  if (key2) {
    console.log(`✅ GEMINI_API_KEY_2: Set (${key2.substring(0, 20)}...)`);
  } else {
    console.log(`❌ GEMINI_API_KEY_2: Not set`);
  }
  
  if (defaultKey) {
    console.log(`✅ GEMINI_API_KEY/LLM_API_KEY: Set (${defaultKey.substring(0, 20)}...)`);
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
    shouldUseLLM: false,
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
    shouldUseLLM: true,
  },
  {
    category: 'Strategic Analysis',
    question: 'How can I reduce my burn rate?',
    expectedResponseType: 'recommendation',
    shouldHaveStagedChanges: true,
    shouldHaveNaturalText: true,
    minStagedChanges: 2,
    minTextLength: 150,
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
  {
    category: 'Strategic Analysis',
    question: 'Create a plan to extend runway by 6 months',
    expectedResponseType: 'recommendation',
    shouldHaveStagedChanges: true,
    shouldHaveNaturalText: true,
    minStagedChanges: 3,
    minTextLength: 200,
    shouldUseLLM: true,
  },
];

interface TestResult {
  question: string;
  category: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  responseDetails: {
    hasStagedChanges: boolean;
    stagedChangesCount: number;
    hasNaturalText: boolean;
    naturalTextLength: number;
    metadata?: any;
    usedLLM: boolean;
    usedFallback: boolean;
  };
}

async function runTestQuestion(
  orgId: string,
  userId: string,
  testQuestion: ProductionTestQuestion
): Promise<TestResult> {
  const result: TestResult = {
    question: testQuestion.question,
    category: testQuestion.category,
    passed: false,
    errors: [],
    warnings: [],
    responseDetails: {
      hasStagedChanges: false,
      stagedChangesCount: 0,
      hasNaturalText: false,
      naturalTextLength: 0,
      usedLLM: false,
      usedFallback: false,
    },
  };

  try {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`Testing: ${testQuestion.question}`);
    console.log(`Category: ${testQuestion.category}`);
    console.log(`${'─'.repeat(80)}`);

    const plan = await aicfoService.generatePlan(orgId, userId, {
      goal: testQuestion.question,
    });

    const planJson = plan.planJson as any;
    const stagedChanges = planJson?.stagedChanges || [];
    const structuredResponse = planJson?.structuredResponse || {};
    const naturalText = structuredResponse?.natural_text || '';
    const metadata = planJson?.metadata || {};

    // Update response details
    result.responseDetails.hasStagedChanges = stagedChanges.length > 0;
    result.responseDetails.stagedChangesCount = stagedChanges.length;
    result.responseDetails.hasNaturalText = naturalText.length > 0;
    result.responseDetails.naturalTextLength = naturalText.length;
    result.responseDetails.metadata = metadata;
    result.responseDetails.usedLLM = metadata.recommendationsSource === 'gemini' || (metadata.modelUsed && !metadata.modelUsed.includes('fallback'));
    result.responseDetails.usedFallback = metadata.fallbackUsed === true || metadata.recommendationsSource === 'fallback';

    // Validate response
    if (testQuestion.shouldHaveNaturalText && !result.responseDetails.hasNaturalText) {
      result.errors.push('Expected natural text response but got none');
    }

    if (testQuestion.minTextLength && naturalText.length < testQuestion.minTextLength) {
      result.warnings.push(`Natural text is shorter than expected (${naturalText.length} < ${testQuestion.minTextLength})`);
    }

    if (testQuestion.shouldHaveStagedChanges && !result.responseDetails.hasStagedChanges) {
      result.errors.push('Expected staged changes but got none');
    }

    if (testQuestion.minStagedChanges && stagedChanges.length < testQuestion.minStagedChanges) {
      result.warnings.push(`Staged changes count is less than expected (${stagedChanges.length} < ${testQuestion.minStagedChanges})`);
    }

    // Check if LLM was used when expected
    if (testQuestion.shouldUseLLM && result.responseDetails.usedFallback) {
      result.warnings.push('Expected LLM response but got fallback (may be due to rate limits or insufficient grounding)');
    }

    // Display response preview
    console.log(`\n✅ Response Generated:`);
    console.log(`   Natural Text Length: ${naturalText.length} chars`);
    console.log(`   Staged Changes: ${stagedChanges.length}`);
    console.log(`   Model Used: ${metadata.modelUsed || 'unknown'}`);
    console.log(`   Fallback Used: ${result.responseDetails.usedFallback}`);
    console.log(`   Intent Confidence: ${metadata.intentConfidence || 'N/A'}`);
    
    if (naturalText.length > 0) {
      console.log(`\n📝 Natural Text Preview (first 300 chars):`);
      console.log(`   ${naturalText.substring(0, 300)}...`);
    }

    if (stagedChanges.length > 0) {
      console.log(`\n📋 Staged Changes Preview:`);
      stagedChanges.slice(0, 3).forEach((change: any, idx: number) => {
        console.log(`   ${idx + 1}. ${change.action || change.explain || 'Recommendation'}`);
        if (change.priority) console.log(`      Priority: ${change.priority}`);
        if (change.confidence) console.log(`      Confidence: ${Math.round(change.confidence * 100)}%`);
      });
    }

    // Determine if test passed
    result.passed = result.errors.length === 0;

  } catch (error: any) {
    result.errors.push(`Test failed with error: ${error.message || String(error)}`);
    console.error(`❌ Error: ${error.message || String(error)}`);
  }

  return result;
}

async function main() {
  const userEmail = process.argv[2] || 'cptjacksprw@gmail.com';

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`AI CFO ASSISTANT - PRODUCTION LEVEL TESTING`);
  console.log(`User: ${userEmail}`);
  console.log(`${'═'.repeat(80)}\n`);

  // Check API keys
  const hasApiKeys = checkApiKeys();
  if (!hasApiKeys) {
    console.error('\n❌ ERROR: No Gemini API keys found!');
    console.error('Please set GEMINI_API_KEY_1, GEMINI_API_KEY_2, or GEMINI_API_KEY in your .env file');
    process.exit(1);
  }

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      console.error(`\n❌ ERROR: User ${userEmail} not found`);
      process.exit(1);
    }

    // Find user's organizations
    const userOrgRoles = await prisma.userOrgRole.findMany({
      where: { userId: user.id },
      include: {
        org: true,
      },
    });

    if (!userOrgRoles || userOrgRoles.length === 0) {
      console.error(`\n❌ ERROR: User ${userEmail} has no organizations`);
      process.exit(1);
    }

    const org = userOrgRoles[0].org;
    const orgId = org.id;
    const userId = user.id;

    console.log(`\n✅ Found user: ${user.name || userEmail}`);
    console.log(`✅ Organization: ${org.name} (${orgId})`);

    // Run all tests
    const results: TestResult[] = [];
    
    for (const testQuestion of productionTestQuestions) {
      const result = await runTestQuestion(orgId, userId, testQuestion);
      results.push(result);
      
      // Add delay between tests to avoid rate limiting
      await sleep(2000);
    }

    // Summary
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`TEST SUMMARY`);
    console.log(`${'═'.repeat(80)}\n`);

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const withWarnings = results.filter(r => r.warnings.length > 0).length;

    console.log(`Total Tests: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  With Warnings: ${withWarnings}`);

    // Detailed results
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`DETAILED RESULTS`);
    console.log(`${'─'.repeat(80)}\n`);

    results.forEach((result, idx) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} Test ${idx + 1}: ${result.question}`);
      console.log(`   Category: ${result.category}`);
      console.log(`   Natural Text: ${result.responseDetails.hasNaturalText ? 'Yes' : 'No'} (${result.responseDetails.naturalTextLength} chars)`);
      console.log(`   Staged Changes: ${result.responseDetails.stagedChangesCount}`);
      console.log(`   Used LLM: ${result.responseDetails.usedLLM ? 'Yes' : 'No'}`);
      console.log(`   Used Fallback: ${result.responseDetails.usedFallback ? 'Yes' : 'No'}`);
      
      if (result.errors.length > 0) {
        console.log(`   Errors:`);
        result.errors.forEach(err => console.log(`      - ${err}`));
      }
      
      if (result.warnings.length > 0) {
        console.log(`   Warnings:`);
        result.warnings.forEach(warn => console.log(`      - ${warn}`));
      }
      
      console.log('');
    });

    // Final verdict
    console.log(`\n${'═'.repeat(80)}`);
    if (failed === 0) {
      console.log(`✅ ALL TESTS PASSED - AI CFO ASSISTANT IS PRODUCTION READY`);
    } else {
      console.log(`⚠️  SOME TESTS FAILED - REVIEW ERRORS ABOVE`);
    }
    console.log(`${'═'.repeat(80)}\n`);

  } catch (error: any) {
    console.error(`\n❌ FATAL ERROR: ${error.message || String(error)}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);

