const fetch = require('node-fetch');

const API_BASE = 'http://localhost:8000/api/v1';
let token = '';
let orgId = '';

async function login() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'cptjacksprw@gmail.com',
      password: 'Player@123'
    })
  });
  const data = await res.json();
  token = data.token;
  orgId = data.user.orgRoles[0]?.orgId || data.user.defaultOrgId;
  console.log(`✅ Logged in as cptjacksprw@gmail.com`);
  console.log(`   Org ID: ${orgId}\n`);
}

async function testQuery(query, label, isScenarioWrapped = false) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`📊 ${label}`);
  console.log(`${'─'.repeat(80)}`);
  console.log(`Query: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"\n`);

  try {
    const res = await fetch(`${API_BASE}/orgs/${orgId}/ai-plans`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ goal: query })
    });

    const data = await res.json();
    
    if (!data.ok) {
      console.log(`❌ API Error: ${data.error || 'Unknown error'}`);
      return null;
    }

    const plan = data.plan || data.data;
    if (!plan) {
      console.log(`❌ No plan in response`);
      return null;
    }

    console.log(`✅ Plan created: ${plan.id}`);
    console.log(`   Status: ${plan.status}`);
    
    // Poll for completion
    let completedPlan = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      
      const pollRes = await fetch(`${API_BASE}/orgs/${orgId}/ai-plans/${plan.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const pollData = await pollRes.json();
      if (pollData.ok && pollData.plan) {
        const p = pollData.plan;
        if (p.status === 'completed' || p.status === 'failed') {
          completedPlan = p;
          break;
        }
      }
    }

    if (!completedPlan) {
      console.log(`⏱️  Timeout waiting for plan completion`);
      return null;
    }

    if (completedPlan.status === 'failed') {
      console.log(`❌ Plan failed: ${completedPlan.errorMessage || 'Unknown error'}`);
      return null;
    }

    const planJson = typeof completedPlan.planJson === 'string' 
      ? JSON.parse(completedPlan.planJson) 
      : completedPlan.planJson;
    
    const structured = planJson?.structuredResponse || {};
    const naturalText = structured?.natural_text || structured?.naturalLanguage || '';
    const recommendations = structured?.recommendations || [];
    
    console.log(`\n✅ Plan completed`);
    console.log(`\n📝 RESPONSE:`);
    console.log(`${'─'.repeat(80)}`);
    console.log(naturalText || 'No natural language response');
    console.log(`${'─'.repeat(80)}`);
    console.log(`\n💡 Recommendations: ${recommendations.length}`);
    if (recommendations.length > 0) {
      recommendations.forEach((rec, idx) => {
        console.log(`   ${idx + 1}. ${rec.title || rec.action || 'Untitled'}`);
      });
    }
    console.log(`\n📊 Metadata:`);
    console.log(`   - Data Sources: ${(structured?.dataSources || []).length}`);
    console.log(`   - Calculations: ${Object.keys(structured?.calculations || {}).length}`);
    
    return {
      naturalText,
      recommendations,
      dataSources: structured?.dataSources || [],
      calculations: structured?.calculations || {}
    };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

async function compareFeatures() {
  console.log('\n' + '█'.repeat(80));
  console.log('🔬 AI CFO ASSISTANT vs SCENARIO PLANNING - FEATURE COMPARISON');
  console.log('█'.repeat(80));

  const testCases = [
    {
      name: "Basic Runway Question",
      direct: "What's my current runway?",
      scenario: "Analyze this scenario: What's my current runway?. Provide detailed financial impact analysis including:\n1. Revenue impact (projected changes)\n2. Expense impact (cost changes)\n3. Cash runway impact (months remaining)\n4. Key risks and opportunities\n5. Actionable recommendations\n\nFormat the response in clear, professional English with specific numbers and percentages where applicable."
    },
    {
      name: "Strategic Question",
      direct: "What strategies can help me accelerate revenue growth?",
      scenario: "Analyze this scenario: What strategies can help me accelerate revenue growth?. Provide detailed financial impact analysis including:\n1. Revenue impact (projected changes)\n2. Expense impact (cost changes)\n3. Cash runway impact (months remaining)\n4. Key risks and opportunities\n5. Actionable recommendations\n\nFormat the response in clear, professional English with specific numbers and percentages where applicable."
    }
  ];

  const results = [];

  for (const testCase of testCases) {
    console.log(`\n\n${'▓'.repeat(80)}`);
    console.log(`TEST: ${testCase.name}`);
    console.log(`${'▓'.repeat(80)}`);

    const aicfoResult = await testQuery(
      testCase.direct, 
      `AI CFO ASSISTANT - Direct Query`
    );

    await new Promise(r => setTimeout(r, 2000));

    const scenarioResult = await testQuery(
      testCase.scenario,
      `SCENARIO PLANNING - Wrapped Query`
    );

    results.push({
      testCase: testCase.name,
      aicfo: aicfoResult,
      scenario: scenarioResult
    });

    await new Promise(r => setTimeout(r, 3000));
  }

  // Summary
  console.log('\n\n' + '█'.repeat(80));
  console.log('📊 COMPARISON SUMMARY');
  console.log('█'.repeat(80));

  results.forEach((result, idx) => {
    console.log(`\n${idx + 1}. ${result.testCase}`);
    console.log(`${'─'.repeat(80)}`);
    
    if (result.aicfo && result.scenario) {
      console.log(`   AI CFO:`);
      console.log(`   - Response length: ${result.aicfo.naturalText.length} chars`);
      console.log(`   - Recommendations: ${result.aicfo.recommendations.length}`);
      console.log(`   - Data sources: ${result.aicfo.dataSources.length}`);
      
      console.log(`\n   Scenario Planning:`);
      console.log(`   - Response length: ${result.scenario.naturalText.length} chars`);
      console.log(`   - Recommendations: ${result.scenario.recommendations.length}`);
      console.log(`   - Data sources: ${result.scenario.dataSources.length}`);

      const similarity = calculateSimilarity(result.aicfo.naturalText, result.scenario.naturalText);
      console.log(`\n   📈 Response similarity: ${(similarity * 100).toFixed(1)}%`);
      
      if (similarity > 0.7) {
        console.log(`   ⚠️  HIGH SIMILARITY - responses are very similar`);
        console.log(`   💡 USP comes from Tasks & Staged Changes tabs, not response content`);
      }
    } else {
      console.log(`   ⚠️  One or both queries failed`);
    }
  });

  console.log('\n\n' + '█'.repeat(80));
  console.log('💡 KEY FINDINGS');
  console.log('█'.repeat(80));
  console.log(`
1. SAME BACKEND API
   - Both use POST /orgs/:orgId/ai-plans
   - Scenario Planning wraps query with structured template
   - Responses will be SIMILAR in content

2. AI CFO USP IS NOT IN THE RESPONSE
   - It's in the TASK MANAGEMENT (convert insights → actions)
   - It's in the APPROVAL WORKFLOW (Staged Changes review)
   - It's in the PERSISTENT CONTEXT (multi-turn conversations)
   - It's in the AUDITABILITY (full data source tracking)

3. SCENARIO PLANNING USP
   - SNAPSHOT COMPARISON (save & compare scenarios)
   - TEMPLATE LIBRARY (quick scenario creation)
   - VISUAL COMPARISONS (side-by-side)
   - VERSION HISTORY (track evolution)

4. THEY COMPLEMENT EACH OTHER
   - Scenario Planning: Model options ("what if?")
   - AI CFO: Decide & execute (tasks, approval, tracking)

5. RECOMMENDATIONS FOR UX
   - Add clear onboarding explaining differences
   - Highlight Task & Staged Changes features in AI CFO
   - Rename Scenario's "Ask Your AI Financial Copilot" to avoid confusion
   - Add tooltips explaining use cases
`);
}

function calculateSimilarity(str1, str2) {
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

async function main() {
  try {
    await login();
    await compareFeatures();
    
    console.log('\n\n' + '█'.repeat(80));
    console.log('✅ TESTING COMPLETE');
    console.log('█'.repeat(80));
    console.log('\nNext steps:');
    console.log('1. Read AI_CFO_VS_SCENARIO_PLANNING.md for full documentation');
    console.log('2. Implement onboarding flow for new users');
    console.log('3. Add tooltips and help sections');
    console.log('4. Consider renaming Scenario Planning copilot feature');
    console.log('5. Highlight Tasks & Staged Changes as key differentiators\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
