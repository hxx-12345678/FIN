/**
 * Test query-specific responses to ensure different questions get different answers
 */

import './config/env';
import prisma from './config/database';
import { aicfoService } from './services/aicfo.service';

async function testQuerySpecificResponses() {
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

  const testQueries = [
    'What is my cash runway?',
    'View detailed staged changes',
    'How can I reduce my burn rate?',
    'What are my key financial metrics?',
  ];

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('TESTING QUERY-SPECIFIC RESPONSES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const query of testQueries) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`Query: "${query}"`);
    console.log(`${'─'.repeat(70)}`);
    
    try {
      const startTime = Date.now();
      const plan = await aicfoService.generatePlan(orgId, userId, { goal: query });
      const duration = Date.now() - startTime;
      
      const planJson = plan.planJson as any;
      const naturalText = planJson?.structuredResponse?.natural_text || '';
      const stagedChanges = planJson?.stagedChanges || [];
      
      console.log(`Response Time: ${duration}ms`);
      console.log(`Response Length: ${naturalText.length} chars`);
      console.log(`Staged Changes: ${stagedChanges.length}`);
      console.log(`\nResponse Preview (first 200 chars):`);
      console.log(naturalText.substring(0, 200) + '...');
      
      // Check if response is query-specific
      const queryLower = query.toLowerCase();
      let isQuerySpecific = false;
      
      if (queryLower.includes('runway') || queryLower.includes('cash')) {
        isQuerySpecific = naturalText.toLowerCase().includes('runway') || 
                         naturalText.toLowerCase().includes('cash') ||
                         naturalText.toLowerCase().includes('month');
      } else if (queryLower.includes('view') && queryLower.includes('staged')) {
        isQuerySpecific = naturalText.toLowerCase().includes('staged') || 
                         naturalText.toLowerCase().includes('recommendation') ||
                         naturalText.toLowerCase().includes('current');
      } else if (queryLower.includes('burn')) {
        isQuerySpecific = naturalText.toLowerCase().includes('burn') || 
                         naturalText.toLowerCase().includes('expense');
      } else if (queryLower.includes('metric') || queryLower.includes('kpi')) {
        isQuerySpecific = naturalText.toLowerCase().includes('metric') || 
                         naturalText.toLowerCase().includes('kpi') ||
                         naturalText.toLowerCase().includes('revenue') ||
                         naturalText.toLowerCase().includes('burn');
      }
      
      console.log(`\n✅ Query-Specific: ${isQuerySpecific ? 'YES' : 'NO'}`);
      
      if (!isQuerySpecific) {
        console.log(`⚠️  WARNING: Response may not be query-specific!`);
      }
      
    } catch (error: any) {
      console.error(`❌ Error: ${error.message}`);
    }
    
    // Small delay between queries
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log('TEST COMPLETE');
  console.log(`${'═'.repeat(70)}\n`);
}

testQuerySpecificResponses().catch(console.error).finally(() => prisma.$disconnect());

