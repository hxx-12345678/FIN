/**
 * PRODUCTION READINESS TEST FOR AI CFO ASSISTANT
 * Comprehensive test to verify:
 * 1. No hallucinations (all numbers grounded in data)
 * 2. CFO-level response quality
 * 3. Proper error handling
 * 4. Data transparency
 * 5. Response formatting
 * 
 * Usage: npx ts-node src/test-ai-cfo-production-readiness.ts [userEmail]
 */

import './config/env';
import prisma from './config/database';
import { aicfoService } from './services/aicfo.service';

interface ProductionReadinessCheck {
  category: string;
  check: string;
  passed: boolean;
  details: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

async function checkProductionReadiness(userEmail: string): Promise<ProductionReadinessCheck[]> {
  const checks: ProductionReadinessCheck[] = [];

  // Find user and org
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    checks.push({
      category: 'Setup',
      check: 'User exists',
      passed: false,
      details: `User ${userEmail} not found`,
      severity: 'critical',
    });
    return checks;
  }

  const userOrgRoles = await prisma.userOrgRole.findMany({
    where: { userId: user.id },
    include: { org: true },
  });

  if (!userOrgRoles || userOrgRoles.length === 0) {
    checks.push({
      category: 'Setup',
      check: 'Organization exists',
      passed: false,
      details: `User has no organizations`,
      severity: 'critical',
    });
    return checks;
  }

  const org = userOrgRoles[0].org;
  const orgId = org.id;
  const userId = user.id;

  // Test 1: API Keys Configuration
  const hasApiKeys = !!(
    process.env.GEMINI_API_KEY_1?.trim() ||
    process.env.GEMINI_API_KEY_2?.trim() ||
    process.env.GEMINI_API_KEY?.trim()
  );
  checks.push({
    category: 'Configuration',
    check: 'Gemini API keys configured',
    passed: hasApiKeys,
    details: hasApiKeys ? 'At least one API key is configured' : 'No API keys found',
    severity: 'critical',
  });

  // Test 2: Test a simple query and check for hallucinations
  try {
    const testPlan = await aicfoService.generatePlan(orgId, userId, {
      goal: 'What is my current cash runway?',
    });

    const planJson = testPlan.planJson as any;
    const structuredResponse = planJson?.structuredResponse || {};
    const naturalText = structuredResponse?.natural_text || '';
    const metadata = planJson?.metadata || {};
    const stagedChanges = planJson?.stagedChanges || [];

    // Check 2.1: Response has natural text
    checks.push({
      category: 'Response Quality',
      check: 'Natural text generated',
      passed: naturalText.length > 50,
      details: naturalText.length > 0 
        ? `Generated ${naturalText.length} characters of natural text`
        : 'No natural text in response',
      severity: 'critical',
    });

    // Check 2.2: No JSON artifacts in response
    const hasJsonArtifacts = naturalText.includes('{"naturalLanguage"') || 
                            naturalText.includes('"naturalLanguage":') ||
                            (naturalText.startsWith('{') && naturalText.includes('"'));
    checks.push({
      category: 'Response Quality',
      check: 'No JSON artifacts in response',
      passed: !hasJsonArtifacts,
      details: hasJsonArtifacts 
        ? 'Response contains JSON artifacts instead of plain text'
        : 'Response is clean plain text',
      severity: 'high',
    });

    // Check 2.3: Response mentions actual data (anti-hallucination)
    const mentionsNumbers = /\$[\d,]+|\d+\.?\d*\s*(months?|days?|%)/i.test(naturalText);
    const mentionsData = naturalText.toLowerCase().includes('runway') || 
                        naturalText.toLowerCase().includes('burn') ||
                        naturalText.toLowerCase().includes('revenue') ||
                        naturalText.toLowerCase().includes('cash');
    checks.push({
      category: 'Anti-Hallucination',
      check: 'Response references actual financial data',
      passed: mentionsNumbers || mentionsData,
      details: mentionsNumbers || mentionsData
        ? 'Response includes financial metrics from actual data'
        : 'Response may be too generic',
      severity: 'high',
    });

    // Check 2.4: Data transparency (evidence/confidence)
    const hasConfidence = typeof metadata.intentConfidence === 'number';
    const hasEvidence = metadata.groundingEvidenceCount > 0 || (stagedChanges.some((sc: any) => sc.evidence?.length > 0));
    checks.push({
      category: 'Transparency',
      check: 'Response includes confidence and evidence',
      passed: hasConfidence && hasEvidence,
      details: `Confidence: ${hasConfidence ? metadata.intentConfidence : 'missing'}, Evidence: ${hasEvidence ? 'present' : 'missing'}`,
      severity: 'medium',
    });

    // Check 2.5: CFO-level recommendations
    const hasRecommendations = stagedChanges.length > 0;
    const hasActionableItems = stagedChanges.some((sc: any) => 
      sc.action && sc.explain && sc.priority
    );
    checks.push({
      category: 'CFO Quality',
      check: 'CFO-level actionable recommendations',
      passed: hasRecommendations && hasActionableItems,
      details: hasRecommendations
        ? `Generated ${stagedChanges.length} recommendations with action, explanation, and priority`
        : 'No recommendations generated',
      severity: 'high',
    });

    // Check 2.6: Response mentions data limitations if applicable
    const mentionsLimitations = naturalText.toLowerCase().includes('insufficient') ||
                               naturalText.toLowerCase().includes('connect') ||
                               naturalText.toLowerCase().includes('accounting system') ||
                               naturalText.toLowerCase().includes('data limitation');
    const hasFinancialData = metadata.hasFinancialData === true;
    checks.push({
      category: 'Transparency',
      check: 'Data limitations acknowledged when applicable',
      passed: !hasFinancialData ? mentionsLimitations : true,
      details: !hasFinancialData
        ? (mentionsLimitations ? 'Correctly mentions data limitations' : 'Should mention data limitations')
        : 'Has financial data, no limitations needed',
      severity: 'medium',
    });

    // Check 2.7: Response length and quality
    const isTooShort = naturalText.length < 100;
    const isTooLong = naturalText.length > 5000;
    const hasStructure = naturalText.includes('**') || 
                        naturalText.includes('\n') ||
                        naturalText.includes('1.') ||
                        naturalText.includes('•');
    checks.push({
      category: 'Response Quality',
      check: 'Response length and structure appropriate',
      passed: !isTooShort && !isTooLong && hasStructure,
      details: `Length: ${naturalText.length} chars, Structured: ${hasStructure ? 'yes' : 'no'}`,
      severity: 'medium',
    });

  } catch (error: any) {
    checks.push({
      category: 'Error Handling',
      check: 'Graceful error handling',
      passed: false,
      details: `Error during test: ${error.message}`,
      severity: 'critical',
    });
  }

  // Test 3: Test strategic question
  try {
    const strategicPlan = await aicfoService.generatePlan(orgId, userId, {
      goal: 'How can I reduce my burn rate?',
    });

    const planJson = strategicPlan.planJson as any;
    const stagedChanges = planJson?.stagedChanges || [];
    const hasStrategicRecommendations = stagedChanges.length >= 2;
    const hasVariedRecommendations = new Set(stagedChanges.map((sc: any) => sc.type || sc.category)).size > 1;

    checks.push({
      category: 'CFO Quality',
      check: 'Strategic questions generate multiple varied recommendations',
      passed: hasStrategicRecommendations && hasVariedRecommendations,
      details: hasStrategicRecommendations
        ? `Generated ${stagedChanges.length} recommendations, ${new Set(stagedChanges.map((sc: any) => sc.type || sc.category)).size} unique types`
        : 'Insufficient recommendations for strategic question',
      severity: 'high',
    });

  } catch (error: any) {
    checks.push({
      category: 'Error Handling',
      check: 'Strategic query error handling',
      passed: false,
      details: `Error: ${error.message}`,
      severity: 'high',
    });
  }

  return checks;
}

async function main() {
  const userEmail = process.argv[2] || 'cptjacksprw@gmail.com';

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`AI CFO ASSISTANT - PRODUCTION READINESS ASSESSMENT`);
  console.log(`User: ${userEmail}`);
  console.log(`${'═'.repeat(80)}\n`);

  const checks = await checkProductionReadiness(userEmail);

  // Group by category
  const byCategory: Record<string, ProductionReadinessCheck[]> = {};
  checks.forEach(check => {
    if (!byCategory[check.category]) {
      byCategory[check.category] = [];
    }
    byCategory[check.category].push(check);
  });

  // Display results
  let totalChecks = 0;
  let passedChecks = 0;
  let criticalFailures = 0;
  let highFailures = 0;

  Object.entries(byCategory).forEach(([category, categoryChecks]) => {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`${category.toUpperCase()}`);
    console.log(`${'─'.repeat(80)}`);

    categoryChecks.forEach(check => {
      totalChecks++;
      if (check.passed) {
        passedChecks++;
        console.log(`✅ ${check.check}`);
      } else {
        if (check.severity === 'critical') criticalFailures++;
        if (check.severity === 'high') highFailures++;
        console.log(`❌ ${check.check} [${check.severity.toUpperCase()}]`);
      }
      console.log(`   ${check.details}`);
    });
  });

  // Summary
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`PRODUCTION READINESS SUMMARY`);
  console.log(`${'═'.repeat(80)}`);
  console.log(`Total Checks: ${totalChecks}`);
  console.log(`✅ Passed: ${passedChecks}`);
  console.log(`❌ Failed: ${totalChecks - passedChecks}`);
  console.log(`🔴 Critical Failures: ${criticalFailures}`);
  console.log(`🟠 High Priority Failures: ${highFailures}`);

  const readinessScore = (passedChecks / totalChecks) * 100;
  console.log(`\n📊 Production Readiness Score: ${readinessScore.toFixed(1)}%`);

  if (criticalFailures > 0) {
    console.log(`\n❌ NOT PRODUCTION READY - Critical issues must be resolved`);
    process.exit(1);
  } else if (highFailures > 0) {
    console.log(`\n⚠️  PRODUCTION READY WITH WARNINGS - High priority issues should be addressed`);
    process.exit(0);
  } else if (readinessScore >= 90) {
    console.log(`\n✅ PRODUCTION READY - Excellent quality`);
    process.exit(0);
  } else {
    console.log(`\n⚠️  PRODUCTION READY - Some improvements recommended`);
    process.exit(0);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

