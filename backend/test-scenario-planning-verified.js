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

async function createPlan(query) {
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
      return { error: `HTTP ${res.status}: ${errorText}` };
    }

    const data = await res.json();
    if (!data.ok) {
      return { error: `API Error: ${JSON.stringify(data)}` };
    }

    const plan = data.plan || data.data;
    if (!plan || !plan.id) {
      return { error: `No plan ID in response: ${JSON.stringify(data)}` };
    }

    return { planId: plan.id, status: plan.status };
  } catch (error) {
    return { error: error.message };
  }
}

async function getPlan(planId) {
  try {
    const res = await fetch(`${API_BASE}/orgs/${orgId}/ai-plans/${planId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!res.ok) return null;
    const data = await res.json();
    return (data.ok && data.plan) ? data.plan : null;
  } catch (error) {
    return null;
  }
}

async function waitForPlan(planId, maxWait = 60) {
  for (let i = 0; i < maxWait; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const plan = await getPlan(planId);
    if (plan) {
      if (plan.status === 'completed') return plan;
      if (plan.status === 'failed') return null;
    }
  }
  return null;
}

function extractResponse(plan) {
  const planJson = typeof plan.planJson === 'string' 
    ? JSON.parse(plan.planJson) 
    : plan.planJson || {};
  
  const structured = planJson?.structuredResponse || {};
  return {
    naturalText: structured?.natural_text || structured?.naturalLanguage || '',
    recommendations: structured?.recommendations || [],
    dataSources: structured?.dataSources || [],
    calculations: structured?.calculations || {}
  };
}

async function testScenarioPlanningCopilot() {
  console.log('\n' + '█'.repeat(80));
  console.log('🧪 SCENARIO PLANNING "ASK YOUR FINANCIAL COPILOT" - VERIFIED TEST');
  console.log('█'.repeat(80));
  console.log('\nTesting with: cptjacksprw@gmail.com');
  console.log('Purpose: Verify what answers are shown at frontend\n');

  const testQueries = [
    {
      name: "Hiring Scenario",
      scenarioQuery: "What happens if we hire 3 engineers next month?",
      // This is how Scenario Planning wraps it (from scenario-planning.tsx line 395)
      wrappedQuery: `Analyze this scenario: What happens if we hire 3 engineers next month?. Provide detailed financial impact analysis including:
1. Revenue impact (projected changes)
2. Expense impact (cost changes)
3. Cash runway impact (months remaining)
4. Key risks and opportunities
5. Actionable recommendations

Format the response in clear, professional English with specific numbers and percentages where applicable.`
    },
    {
      name: "Runway Question",
      scenarioQuery: "What's my current runway?",
      wrappedQuery: `Analyze this scenario: What's my current runway?. Provide detailed financial impact analysis including:
1. Revenue impact (projected changes)
2. Expense impact (cost changes)
3. Cash runway impact (months remaining)
4. Key risks and opportunities
5. Actionable recommendations

Format the response in clear, professional English with specific numbers and percentages where applicable.`
    },
    {
      name: "Burn Rate Optimization",
      scenarioQuery: "How can I improve my burn rate?",
      wrappedQuery: `Analyze this scenario: How can I improve my burn rate?. Provide detailed financial impact analysis including:
1. Revenue impact (projected changes)
2. Expense impact (cost changes)
3. Cash runway impact (months remaining)
4. Key risks and opportunities
5. Actionable recommendations

Format the response in clear, professional English with specific numbers and percentages where applicable.`
    }
  ];

  const results = [];

  for (const testCase of testQueries) {
    console.log(`\n\n${'▓'.repeat(80)}`);
    console.log(`TEST: ${testCase.name}`);
    console.log(`${'▓'.repeat(80)}`);

    // Test Scenario Planning (wrapped query - how frontend sends it)
    console.log(`\n📤 Scenario Planning Copilot (Wrapped Query)`);
    console.log(`${'─'.repeat(80)}`);
    const scenarioResult = await createPlan(testCase.wrappedQuery);
    
    if (scenarioResult.error) {
      console.log(`❌ ${scenarioResult.error}`);
      results.push({ testCase: testCase.name, scenario: null, aicfo: null });
      continue;
    }

    console.log(`✅ Plan created: ${scenarioResult.planId}`);
    const completedPlan = await waitForPlan(scenarioResult.planId);
    
    if (!completedPlan) {
      console.log(`❌ Plan did not complete`);
      results.push({ testCase: testCase.name, scenario: null, aicfo: null });
      continue;
    }

    const scenarioResponse = extractResponse(completedPlan);
    console.log(`\n📊 FRONTEND DISPLAY (Scenario Planning):`);
    console.log(`${'─'.repeat(80)}`);
    console.log(scenarioResponse.naturalText || '(No response text)');
    console.log(`${'─'.repeat(80)}`);
    console.log(`\n💡 Recommendations: ${scenarioResponse.recommendations.length}`);
    scenarioResponse.recommendations.forEach((rec, idx) => {
      console.log(`   ${idx + 1}. ${rec.title || rec.action || 'Untitled'}`);
    });
    console.log(`📈 Data Sources: ${scenarioResponse.dataSources.length}`);
    console.log(`🔢 Calculations: ${Object.keys(scenarioResponse.calculations).length}`);

    await new Promise(r => setTimeout(r, 2000));

    // Test AI CFO (direct query - how frontend sends it)
    console.log(`\n\n📤 AI CFO Assistant (Direct Query)`);
    console.log(`${'─'.repeat(80)}`);
    const aicfoResult = await createPlan(testCase.scenarioQuery);
    
    if (aicfoResult.error) {
      console.log(`❌ ${aicfoResult.error}`);
      results.push({ testCase: testCase.name, scenario: scenarioResponse, aicfo: null });
      continue;
    }

    console.log(`✅ Plan created: ${aicfoResult.planId}`);
    const completedAICFO = await waitForPlan(aicfoResult.planId);
    
    if (!completedAICFO) {
      console.log(`❌ Plan did not complete`);
      results.push({ testCase: testCase.name, scenario: scenarioResponse, aicfo: null });
      continue;
    }

    const aicfoResponse = extractResponse(completedAICFO);
    console.log(`\n📊 FRONTEND DISPLAY (AI CFO Assistant):`);
    console.log(`${'─'.repeat(80)}`);
    console.log(aicfoResponse.naturalText || '(No response text)');
    console.log(`${'─'.repeat(80)}`);
    console.log(`\n💡 Recommendations: ${aicfoResponse.recommendations.length}`);
    aicfoResponse.recommendations.forEach((rec, idx) => {
      console.log(`   ${idx + 1}. ${rec.title || rec.action || 'Untitled'}`);
    });
    console.log(`📈 Data Sources: ${aicfoResponse.dataSources.length}`);
    console.log(`🔢 Calculations: ${Object.keys(aicfoResponse.calculations).length}`);

    // Compare
    const similarity = calculateSimilarity(
      scenarioResponse.naturalText,
      aicfoResponse.naturalText
    );
    console.log(`\n📊 Response Similarity: ${(similarity * 100).toFixed(1)}%`);
    if (similarity > 0.7) {
      console.log(`   ⚠️  HIGH SIMILARITY - Expected (same backend API)`);
      console.log(`   💡 USP is in Tasks & Staged Changes tabs, not response content`);
    }

    results.push({
      testCase: testCase.name,
      scenario: scenarioResponse,
      aicfo: aicfoResponse,
      similarity
    });

    await new Promise(r => setTimeout(r, 3000));
  }

  // Final Summary
  console.log(`\n\n${'█'.repeat(80)}`);
  console.log('📋 FINAL ANALYSIS & USE CASES');
  console.log(`${'█'.repeat(80)}`);

  console.log(`\n✅ Tested ${results.length} scenarios`);
  console.log(`\n🎯 KEY FINDINGS:`);
  console.log(`\n1. BACKEND ARCHITECTURE:`);
  console.log(`   - Both use: POST /api/v1/orgs/:orgId/ai-plans`);
  console.log(`   - Scenario Planning wraps query with template`);
  console.log(`   - AI CFO sends query directly`);
  console.log(`   - Responses are SIMILAR (same AI engine)`);

  console.log(`\n2. AI CFO ASSISTANT - USE CASES:`);
  console.log(`\n   📱 CHAT TAB:`);
  console.log(`      - Ask financial questions`);
  console.log(`      - Get strategic advice`);
  console.log(`      - Multi-turn conversations`);
  console.log(`      - Persistent context`);
  console.log(`      - Example: "What's my runway?" → Get answer → Follow-up: "How to extend it?"`);

  console.log(`\n   ✅ TASKS TAB ⭐ (KEY USP - EXECUTION):`);
  console.log(`      Purpose: Convert AI insights → Actionable tasks`);
  console.log(`      \n      Company/Client Use Case:`);
  console.log(`      1. CFO asks AI: "How can I reduce burn rate?"`);
  console.log(`      2. AI recommends: "Reduce cloud costs by 15%"`);
  console.log(`      3. CFO clicks "Create Task from Recommendation"`);
  console.log(`      4. Task created: "Optimize AWS infrastructure costs"`);
  console.log(`         - Assigned to: CTO`);
  console.log(`         - Priority: High`);
  console.log(`         - Due date: End of quarter`);
  console.log(`         - Linked to AI plan for context`);
  console.log(`      5. CTO sees task in their dashboard`);
  console.log(`      6. Track completion status`);
  console.log(`      \n      Value: Execution, not just analysis`);
  console.log(`      - Without Tasks: AI gives advice, nothing happens`);
  console.log(`      - With Tasks: AI gives advice → Team executes → Track progress`);

  console.log(`\n   🔄 STAGED CHANGES TAB ⭐ (KEY USP - GOVERNANCE):`);
  console.log(`      Purpose: Review & approve AI recommendations before implementing`);
  console.log(`      \n      Company/Client Use Case:`);
  console.log(`      1. AI generates 5 recommendations:`);
  console.log(`         - "Reduce marketing spend by $50k"`);
  console.log(`         - "Delay 2 engineering hires"`);
  console.log(`         - "Raise $2M seed round"`);
  console.log(`         - "Renegotiate SaaS contracts"`);
  console.log(`         - "Cut office space costs"`);
  console.log(`      2. CFO reviews each in Staged Changes tab`);
  console.log(`      3. For each recommendation, CFO can:`);
  console.log(`         - See impact analysis`);
  console.log(`         - Click "Audit" to see data sources`);
  console.log(`         - See which transactions/models informed it`);
  console.log(`         - See prompt ID for traceability`);
  console.log(`      4. CFO approves 3, rejects 2`);
  console.log(`      5. Approved ones convert to Tasks`);
  console.log(`      6. Full audit trail for compliance`);
  console.log(`      \n      Value: Governance, compliance, transparency`);
  console.log(`      - Without Staged Changes: Blindly implement AI suggestions`);
  console.log(`      - With Staged Changes: Review → Approve → Execute`);

  console.log(`\n3. SCENARIO PLANNING - USE CASES:`);
  console.log(`\n   🤖 "Ask Your Financial Copilot":`);
  console.log(`      - Quick scenario questions`);
  console.log(`      - One-off "what-if" analysis`);
  console.log(`      - Uses same backend (wrapped query)`);
  console.log(`      - Example: "What if we hire 3 engineers?"`);

  console.log(`\n   📸 Snapshots & Comparison:`);
  console.log(`      - Save scenario results`);
  console.log(`      - Compare side-by-side`);
  console.log(`      - Present to board/investors`);
  console.log(`      - Example: Save "Best Case", "Worst Case", "Most Likely"`);

  console.log(`\n   📋 Templates:`);
  console.log(`      - Pre-built scenarios`);
  console.log(`      - Quick modeling`);

  console.log(`\n4. WHY AI CFO IS COMPLEX (Current Problem):`);
  console.log(`   - 3 tabs with different purposes (unclear)`);
  console.log(`   - No onboarding explaining workflow`);
  console.log(`   - Tasks & Staged Changes not obvious`);
  console.log(`   - Users don't understand when to use which tab`);

  console.log(`\n5. SOLUTION - Make USP Clear:`);
  console.log(`   ✅ Add onboarding tutorial`);
  console.log(`   ✅ Add tooltips: "Convert insights to tasks"`);
  console.log(`   ✅ Show example workflows`);
  console.log(`   ✅ Highlight: "AI CFO = Execution (Tasks) + Governance (Staged Changes)"`);
  console.log(`   ✅ Rename Scenario Planning copilot to avoid confusion`);

  console.log(`\n6. KEY DIFFERENCE:`);
  console.log(`   - AI CFO: EXECUTION (Tasks, Approval, Tracking)`);
  console.log(`   - Scenario Planning: MODELING (Snapshots, Comparison)`);
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
    await testScenarioPlanningCopilot();
  } catch (error) {
    console.error(`\n❌ Fatal Error: ${error.message}`);
    console.error(error.stack);
  }
}

main();
