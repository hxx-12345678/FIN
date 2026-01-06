/**
 * Comprehensive test for auditability features:
 * - Every number has lineage
 * - Every forecast is auditable
 * - Every scenario is defensible
 */

import './config/env';
import prisma from './config/database';
import { aicfoService } from './services/aicfo.service';
import { provenanceService } from './services/provenance.service';

async function testAuditability() {
  const userEmail = 'cptjacksprw@gmail.com';
  
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) {
    console.error('User not found');
    return;
  }

  const userOrgRoles = await prisma.userOrgRole.findMany({
    where: { userId: user.id },
    include: { org: true },
  });

  if (!userOrgRoles || userOrgRoles.length === 0) {
    console.error('User has no organizations');
    return;
  }

  const org = userOrgRoles[0].org;
  const orgId = org.id;
  const userId = user.id;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('COMPREHENSIVE AUDITABILITY TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Test 1: Generate a plan and verify lineage
  console.log('TEST 1: Number Lineage Verification');
  console.log('─'.repeat(70));
  
  const testQuery = 'What is my cash runway?';
  console.log(`Query: "${testQuery}"`);
  
  const startTime = Date.now();
  const plan = await aicfoService.generatePlan(orgId, userId, { goal: testQuery });
  const duration = Date.now() - startTime;
  
  const planJson = plan.planJson as any;
  const stagedChanges = planJson?.stagedChanges || [];
  const metadata = planJson?.metadata || {};
  const structuredResponse = planJson?.structuredResponse || {};
  
  console.log(`\n✅ Plan Generated (${duration}ms)`);
  console.log(`   Plan ID: ${plan.id}`);
  console.log(`   Staged Changes: ${stagedChanges.length}`);
  
  // Verify every number has evidence/lineage
  let allNumbersHaveLineage = true;
  let numbersWithoutLineage: string[] = [];
  
  stagedChanges.forEach((sc: any, idx: number) => {
    const hasEvidence = sc.evidence && Array.isArray(sc.evidence) && sc.evidence.length > 0;
    const hasDataSources = sc.dataSources && Array.isArray(sc.dataSources) && sc.dataSources.length > 0;
    const hasImpact = sc.impact && Object.keys(sc.impact).length > 0;
    
    if (!hasEvidence && !hasDataSources) {
      allNumbersHaveLineage = false;
      numbersWithoutLineage.push(`Recommendation ${idx + 1}: "${sc.action}"`);
    }
    
    // Check if impact values have sources
    if (hasImpact) {
      Object.entries(sc.impact).forEach(([key, value]) => {
        if (typeof value === 'number' && !hasEvidence && !hasDataSources) {
          numbersWithoutLineage.push(`  - ${key}: ${value} (no evidence)`);
        }
      });
    }
  });
  
  // Check calculations
  const calculations = structuredResponse.calculations || {};
  Object.entries(calculations).forEach(([key, value]) => {
    if (typeof value === 'number') {
      const hasEvidence = structuredResponse.evidence && structuredResponse.evidence.length > 0;
      if (!hasEvidence) {
        allNumbersHaveLineage = false;
        numbersWithoutLineage.push(`Calculation ${key}: ${value} (no evidence)`);
      }
    }
  });
  
  console.log(`\n${allNumbersHaveLineage ? '✅' : '❌'} Number Lineage: ${allNumbersHaveLineage ? 'PASS' : 'FAIL'}`);
  if (!allNumbersHaveLineage) {
    console.log('   Numbers without lineage:');
    numbersWithoutLineage.forEach(n => console.log(`   ${n}`));
  } else {
    console.log('   All numbers have evidence/data sources');
  }
  
  // Test 2: Forecast Auditability
  console.log(`\n\nTEST 2: Forecast Auditability`);
  console.log('─'.repeat(70));
  
  const hasPromptIds = metadata.promptIds && Array.isArray(metadata.promptIds) && metadata.promptIds.length > 0;
  const hasDataSources = metadata.totalDataSources && metadata.totalDataSources > 0;
  const hasMetadata = Object.keys(metadata).length > 0;
  
  console.log(`✅ Metadata Present: ${hasMetadata ? 'YES' : 'NO'}`);
  console.log(`   - Prompt IDs: ${hasPromptIds ? `YES (${metadata.promptIds.length})` : 'NO'}`);
  console.log(`   - Data Sources: ${hasDataSources ? `YES (${metadata.totalDataSources})` : 'NO'}`);
  console.log(`   - Intent Confidence: ${metadata.intentConfidence || 'N/A'}`);
  console.log(`   - Grounding Evidence: ${metadata.groundingEvidenceCount || 0}`);
  console.log(`   - Processing Time: ${metadata.processingTimeMs || 'N/A'}ms`);
  
  // Verify prompt traceability
  if (hasPromptIds) {
    console.log(`\n   Verifying prompt traceability...`);
    for (const promptId of metadata.promptIds.slice(0, 3)) {
      try {
        const prompt = await prisma.prompt.findUnique({
          where: { id: promptId },
          select: {
            id: true,
            promptTemplate: true,
            renderedPrompt: true,
            responseText: true,
            provider: true,
            modelUsed: true,
            tokensUsed: true,
            createdAt: true,
          },
        });
        
        if (prompt) {
          console.log(`   ✅ Prompt ${promptId.substring(0, 8)}... traceable`);
          console.log(`      - Provider: ${prompt.provider}`);
          console.log(`      - Model: ${prompt.modelUsed}`);
          console.log(`      - Tokens: ${prompt.tokensUsed || 'N/A'}`);
          console.log(`      - Created: ${prompt.createdAt.toISOString()}`);
        } else {
          console.log(`   ❌ Prompt ${promptId.substring(0, 8)}... NOT FOUND`);
        }
      } catch (error: any) {
        console.log(`   ⚠️  Error checking prompt ${promptId.substring(0, 8)}...: ${error.message}`);
      }
    }
  }
  
  const forecastAuditable = hasPromptIds && hasDataSources && hasMetadata;
  console.log(`\n${forecastAuditable ? '✅' : '❌'} Forecast Auditability: ${forecastAuditable ? 'PASS' : 'FAIL'}`);
  
  // Test 3: Scenario Defensibility
  console.log(`\n\nTEST 3: Scenario Defensibility`);
  console.log('─'.repeat(70));
  
  let defensibleCount = 0;
  let totalRecommendations = stagedChanges.length;
  
  stagedChanges.forEach((sc: any, idx: number) => {
    const hasEvidence = sc.evidence && Array.isArray(sc.evidence) && sc.evidence.length > 0;
    const hasReasoning = sc.reasoning && sc.reasoning.length > 0;
    const hasExplain = sc.explain && sc.explain.length > 0;
    const hasConfidence = typeof sc.confidence === 'number';
    const hasImpact = sc.impact && Object.keys(sc.impact).length > 0;
    
    const isDefensible = hasEvidence && (hasReasoning || hasExplain) && hasConfidence;
    
    if (isDefensible) {
      defensibleCount++;
    } else {
      console.log(`   ⚠️  Recommendation ${idx + 1} "${sc.action}" may not be fully defensible:`);
      if (!hasEvidence) console.log(`      - Missing evidence`);
      if (!hasReasoning && !hasExplain) console.log(`      - Missing reasoning/explanation`);
      if (!hasConfidence) console.log(`      - Missing confidence score`);
    }
  });
  
  const defensibilityScore = totalRecommendations > 0 ? (defensibleCount / totalRecommendations) * 100 : 0;
  console.log(`\n✅ Defensibility Score: ${defensibilityScore.toFixed(1)}% (${defensibleCount}/${totalRecommendations})`);
  console.log(`${defensibilityScore >= 80 ? '✅' : '❌'} Scenario Defensibility: ${defensibilityScore >= 80 ? 'PASS' : 'FAIL'}`);
  
  // Test 4: Evidence Quality
  console.log(`\n\nTEST 4: Evidence Quality`);
  console.log('─'.repeat(70));
  
  let totalEvidence = 0;
  let evidenceWithSources = 0;
  
  stagedChanges.forEach((sc: any) => {
    if (sc.evidence && Array.isArray(sc.evidence)) {
      totalEvidence += sc.evidence.length;
      sc.evidence.forEach((ev: any) => {
        if (typeof ev === 'string' && ev.length > 10) {
          evidenceWithSources++;
        } else if (typeof ev === 'object' && (ev.snippet || ev.content || ev.doc_id)) {
          evidenceWithSources++;
        }
      });
    }
    
    if (sc.dataSources && Array.isArray(sc.dataSources)) {
      totalEvidence += sc.dataSources.length;
      sc.dataSources.forEach((ds: any) => {
        if (ds.type && ds.id && ds.snippet) {
          evidenceWithSources++;
        }
      });
    }
  });
  
  const evidenceQuality = totalEvidence > 0 ? (evidenceWithSources / totalEvidence) * 100 : 0;
  console.log(`   Total Evidence Items: ${totalEvidence}`);
  console.log(`   Evidence with Sources: ${evidenceWithSources}`);
  console.log(`   Evidence Quality: ${evidenceQuality.toFixed(1)}%`);
  console.log(`${evidenceQuality >= 90 ? '✅' : '❌'} Evidence Quality: ${evidenceQuality >= 90 ? 'PASS' : 'FAIL'}`);
  
  // Test 5: Response Time
  console.log(`\n\nTEST 5: Response Time Performance`);
  console.log('─'.repeat(70));
  console.log(`   Total Response Time: ${duration}ms`);
  console.log(`   Target: < 30,000ms (30s)`);
  console.log(`${duration < 30000 ? '✅' : '❌'} Response Time: ${duration < 30000 ? 'PASS' : 'FAIL'}`);
  
  if (duration >= 30000) {
    console.log(`   ⚠️  Response time is slow. Consider optimization.`);
  }
  
  // Summary
  console.log(`\n\n${'═'.repeat(70)}`);
  console.log('AUDITABILITY TEST SUMMARY');
  console.log(`${'═'.repeat(70)}\n`);
  
  const allTestsPass = allNumbersHaveLineage && forecastAuditable && defensibilityScore >= 80 && evidenceQuality >= 90 && duration < 30000;
  
  console.log(`Number Lineage:        ${allNumbersHaveLineage ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Forecast Auditability: ${forecastAuditable ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Scenario Defensibility: ${defensibilityScore >= 80 ? '✅ PASS' : '❌ FAIL'} (${defensibilityScore.toFixed(1)}%)`);
  console.log(`Evidence Quality:     ${evidenceQuality >= 90 ? '✅ PASS' : '❌ FAIL'} (${evidenceQuality.toFixed(1)}%)`);
  console.log(`Response Time:        ${duration < 30000 ? '✅ PASS' : '❌ FAIL'} (${duration}ms)`);
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`OVERALL: ${allTestsPass ? '✅ ALL TESTS PASS' : '❌ SOME TESTS FAILED'}`);
  console.log(`${'═'.repeat(70)}\n`);
}

testAuditability().catch(console.error).finally(() => prisma.$disconnect());

