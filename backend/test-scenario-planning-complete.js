const fetch = require('node-fetch');

const API_BASE = 'http://localhost:8000/api/v1';
let token = '';
let orgId = '';

async function login() {
  console.log('🔐 Logging in as cptjacksprw@gmail.com...\n');
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
  console.log(`✅ Logged in successfully`);
  console.log(`   User: cptjacksprw@gmail.com`);
  console.log(`   Org ID: ${orgId}\n`);
}

async function createPlan(query, label) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`📤 ${label}`);
  console.log(`${'═'.repeat(80)}`);
  console.log(`Query: "${query.substring(0, 80)}${query.length > 80 ? '...' : ''}"\n`);

  try {
    const res = await fetch(`${API_BASE}/orgs/${orgId}/ai-plans`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ goal: query })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.log(`❌ HTTP Error ${res.status}: ${errorText}`);
      return null;
    }

    const data = await res.json();
    
    if (!data.ok) {
      console.log(`❌ API Error: ${JSON.stringify(data, null, 2)}`);
      return null;
    }

    // Handle response format
    const plan = data.plan || data.data;
    if (!plan) {
      console.log(`❌ No plan in response`);
      console.log(`   Response keys: ${Object.keys(data).join(', ')}`);
      console.log(`   Full response: ${JSON.stringify(data, null, 2).substring(0, 500)}`);
      return null;
    }
    
    if (!plan.id) {
      console.log(`❌ No plan ID`);
      console.log(`   Plan keys: ${Object.keys(plan).join(', ')}`);
      return null;
    }

    console.log(`✅ Plan created: ${plan.id}`);
    console.log(`   Status: ${plan.status}`);
    return plan.id;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
}

async function getPlan(planId) {
  try {
    const res = await fetch(`${API_BASE}/orgs/${orgId}/ai-plans/${planId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) {
      return null;
    }
    
    const data = await res.json();
    if (data.ok && data.plan) {
      return data.plan;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function waitForCompletion(planId, maxWait = 60) {
  console.log(`   ⏳ Waiting for completion (max ${maxWait}s)...`);
  
  for (let i = 0; i < maxWait; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const plan = await getPlan(planId);
    
    if (plan) {
      if (plan.status === 'completed') {
        console.log(`   ✅ Completed after ${i + 1}s\n`);
        return plan;
      } else if (plan.status === 'failed') {
        console.log(`   ❌ Failed: ${plan.errorMessage || 'Unknown'}\n`);
        return null;
      }
    }
  }
  
  console.log(`   ⏱️  Timeout\n`);
  return null;
}

function extractResponse(plan) {
  const planJson = typeof plan.planJson === 'string' 
    ? JSON.parse(plan.planJson) 
    : plan.planJson || {};
  
  const structured = planJson?.structuredResponse || {};
  const naturalText = structured?.natural_text || structured?.naturalLanguage || '';
  const recommendations = structured?.recommendations || [];
  const dataSources = structured?.dataSources || [];
  const calculations = structured?.calculations || {};

  return {
    naturalText,
    recommendations,
    dataSources,
    calculations
  };
}

async function testScenarioPlanning() {
  console.log('\n' + '█'.repeat(80));
  console.log('🧪 SCENARIO PLANNING "ASK YOUR FINANCIAL COPILOT" - TEST');
  console.log('█'.repeat(80));
  console.log('\nTesting with: cptjacksprw@gmail.com\n');

  const queries = [
    {
      name: "Hiring Scenario",
      query: "What happens if we hire 3 engineers next month?",
      wrapped: `Analyze this scenario: What happens if we hire 3 engineers next month?. Provide detailed financial impact analysis including:
1. Revenue impact (projected changes)
2. Expense impact (cost changes)
3. Cash runway impact (months remaining)
4. Key risks and opportunities
5. Actionable recommendations

Format the response in clear, professional English with specific numbers and percentages where applicable.`
    },
    {
      name: "Runway Question",
      query: "What's my current runway?",
      wrapped: `Analyze this scenario: What's my current runway?. Provide detailed financial impact analysis including:
1. Revenue impact (projected changes)
2. Expense impact (cost changes)
3. Cash runway impact (months remaining)
4. Key risks and opportunities
5. Actionable recommendations

Format the response in clear, professional English with specific numbers and percentages where applicable.`
    }
  ];

  const results = [];

  for (const testCase of queries) {
    console.log(`\n\n${'▓'.repeat(80)}`);
    console.log(`TEST: ${testCase.name}`);
    console.log(`${'▓'.repeat(80)}`);

    // Test Scenario Planning (wrapped query)
    const scenarioPlanId = await createPlan(
      testCase.wrapped,
      `Scenario Planning - "${testCase.name}"`
    );

    let scenarioResult = null;
    if (scenarioPlanId) {
      const completedPlan = await waitForCompletion(scenarioPlanId);
      if (completedPlan) {
        scenarioResult = extractResponse(completedPlan);
        console.log(`\n📊 SCENARIO PLANNING RESPONSE:`);
        console.log(`${'─'.repeat(80)}`);
        console.log(scenarioResult.naturalText || '(No response)');
        console.log(`${'─'.repeat(80)}`);
        console.log(`\n💡 Recommendations: ${scenarioResult.recommendations.length}`);
        console.log(`📈 Data Sources: ${scenarioResult.dataSources.length}`);
      }
    }

    await new Promise(r => setTimeout(r, 2000));

    // Test AI CFO (direct query)
    const aicfoPlanId = await createPlan(
      testCase.query,
      `AI CFO Assistant - "${testCase.name}"`
    );

    let aicfoResult = null;
    if (aicfoPlanId) {
      const completedPlan = await waitForCompletion(aicfoPlanId);
      if (completedPlan) {
        aicfoResult = extractResponse(completedPlan);
        console.log(`\n📊 AI CFO ASSISTANT RESPONSE:`);
        console.log(`${'─'.repeat(80)}`);
        console.log(aicfoResult.naturalText || '(No response)');
        console.log(`${'─'.repeat(80)}`);
        console.log(`\n💡 Recommendations: ${aicfoResult.recommendations.length}`);
        console.log(`📈 Data Sources: ${aicfoResult.dataSources.length}`);
      }
    }

    if (scenarioResult && aicfoResult) {
      const similarity = calculateSimilarity(
        scenarioResult.naturalText,
        aicfoResult.naturalText
      );
      console.log(`\n📊 Response Similarity: ${(similarity * 100).toFixed(1)}%`);
      if (similarity > 0.7) {
        console.log(`   ⚠️  HIGH SIMILARITY - Expected (same backend API)`);
      }
    }

    results.push({ testCase: testCase.name, scenario: scenarioResult, aicfo: aicfoResult });
    await new Promise(r => setTimeout(r, 3000));
  }

  // Summary
  console.log(`\n\n${'█'.repeat(80)}`);
  console.log('📋 SUMMARY & USE CASES');
  console.log(`${'█'.repeat(80)}`);

  console.log(`\n✅ Tested ${results.length} scenarios`);

  console.log(`\n🎯 AI CFO ASSISTANT - USE CASES:`);
  console.log(`\n1. CHAT TAB:`);
  console.log(`   - Ask financial questions`);
  console.log(`   - Get strategic advice`);
  console.log(`   - Multi-turn conversations`);
  console.log(`   - Persistent context`);

  console.log(`\n2. TASKS TAB ⭐ (KEY USP):`);
  console.log(`   Purpose: Convert AI insights → Actionable tasks`);
  console.log(`   Company Use:`);
  console.log(`   - CFO asks: "How can I reduce burn rate?"`);
  console.log(`   - AI recommends: "Reduce cloud costs by 15%"`);
  console.log(`   - CFO clicks "Create Task"`);
  console.log(`   - Task created: "Optimize AWS infrastructure"`);
  console.log(`   - Assigned to: CTO`);
  console.log(`   - Due date: End of quarter`);
  console.log(`   - Track completion status`);
  console.log(`   Value: Execution, not just analysis`);

  console.log(`\n3. STAGED CHANGES TAB ⭐ (KEY USP):`);
  console.log(`   Purpose: Review & approve AI recommendations`);
  console.log(`   Company Use:`);
  console.log(`   - AI generates 5 recommendations`);
  console.log(`   - CFO reviews each in Staged Changes`);
  console.log(`   - Clicks "Audit" to see data sources`);
  console.log(`   - Approves 3, rejects 2`);
  console.log(`   - Approved ones become tasks`);
  console.log(`   Value: Governance, compliance, transparency`);

  console.log(`\n🔬 SCENARIO PLANNING - USE CASES:`);
  console.log(`\n1. "Ask Your Financial Copilot":`);
  console.log(`   - Quick scenario questions`);
  console.log(`   - One-off "what-if" analysis`);
  console.log(`   - Uses same backend as AI CFO (wrapped query)`);

  console.log(`\n2. Snapshots & Comparison:`);
  console.log(`   - Save scenario results`);
  console.log(`   - Compare side-by-side`);
  console.log(`   - Present to board/investors`);

  console.log(`\n3. Templates:`);
  console.log(`   - Pre-built scenarios`);
  console.log(`   - Quick modeling`);

  console.log(`\n💡 KEY DIFFERENCE:`);
  console.log(`   - AI CFO: Execution (Tasks, Approval, Tracking)`);
  console.log(`   - Scenario Planning: Modeling (Snapshots, Comparison)`);
  console.log(`   - They complement each other!`);

  console.log(`\n${'█'.repeat(80)}`);
  console.log('✅ TESTING COMPLETE');
  console.log(`${'█'.repeat(80)}\n`);
}

function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

async function main() {
  try {
    await login();
    await testScenarioPlanning();
  } catch (error) {
    console.error(`\n❌ Fatal Error: ${error.message}`);
    console.error(error.stack);
  }
}

main();
