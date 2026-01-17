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

async function waitForPlanCompletion(planId, maxWait = 60) {
  console.log(`   ⏳ Polling for plan completion (max ${maxWait}s)...`);
  
  for (let i = 0; i < maxWait; i++) {
    await new Promise(r => setTimeout(r, 1000));
    
    try {
      const pollRes = await fetch(`${API_BASE}/orgs/${orgId}/ai-plans/${planId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const pollData = await pollRes.json();
      if (pollData.ok && pollData.plan) {
        const plan = pollData.plan;
        if (plan.status === 'completed') {
          console.log(`   ✅ Plan completed after ${i + 1} seconds\n`);
          return plan;
        } else if (plan.status === 'failed') {
          console.log(`   ❌ Plan failed: ${plan.errorMessage || 'Unknown error'}\n`);
          return null;
        }
      }
    } catch (error) {
      // Continue polling
    }
  }
  
  console.log(`   ⏱️  Timeout after ${maxWait} seconds\n`);
  return null;
}

async function testScenarioPlanningQuery(query, testName) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🧪 TEST: ${testName}`);
  console.log(`${'═'.repeat(80)}`);
  console.log(`Query: "${query}"\n`);

  // This is how Scenario Planning wraps the query (from scenario-planning.tsx)
  const wrappedQuery = `Analyze this scenario: ${query}. Provide detailed financial impact analysis including:
1. Revenue impact (projected changes)
2. Expense impact (cost changes)
3. Cash runway impact (months remaining)
4. Key risks and opportunities
5. Actionable recommendations

Format the response in clear, professional English with specific numbers and percentages where applicable.`;

  try {
    console.log('📤 Sending request to backend...');
    const res = await fetch(`${API_BASE}/orgs/${orgId}/ai-plans`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ goal: wrappedQuery })
    });

    const data = await res.json();
    
    if (!data.ok) {
      console.log(`❌ API Error: ${JSON.stringify(data, null, 2)}`);
      return null;
    }

    // Handle both response formats
    const plan = data.plan || data.data;
    if (!plan) {
      console.log(`❌ No plan in response`);
      console.log(`   Full response: ${JSON.stringify(data, null, 2)}`);
      return null;
    }
    
    if (!plan.id) {
      console.log(`❌ No plan ID in plan object`);
      console.log(`   Plan object: ${JSON.stringify(plan, null, 2)}`);
      return null;
    }

    console.log(`✅ Plan created: ${plan.id}`);
    console.log(`   Status: ${plan.status}`);

    const completedPlan = await waitForPlanCompletion(plan.id);
    if (!completedPlan) {
      return null;
    }

    const planJson = typeof completedPlan.planJson === 'string' 
      ? JSON.parse(completedPlan.planJson) 
      : completedPlan.planJson;
    
    const structured = planJson?.structuredResponse || {};
    const naturalText = structured?.natural_text || structured?.naturalLanguage || '';
    const recommendations = structured?.recommendations || [];
    const dataSources = structured?.dataSources || [];
    const calculations = structured?.calculations || {};

    console.log(`\n📊 RESPONSE ANALYSIS:`);
    console.log(`${'─'.repeat(80)}`);
    console.log(`Natural Language Response (${naturalText.length} chars):`);
    console.log(`${'─'.repeat(80)}`);
    console.log(naturalText || '(No response text)');
    console.log(`${'─'.repeat(80)}`);
    
    console.log(`\n💡 Recommendations: ${recommendations.length}`);
    if (recommendations.length > 0) {
      recommendations.forEach((rec, idx) => {
        console.log(`\n   ${idx + 1}. ${rec.title || rec.action || 'Untitled Recommendation'}`);
        if (rec.summary) console.log(`      Summary: ${rec.summary.substring(0, 150)}...`);
        if (rec.impact) console.log(`      Impact: ${rec.impact}`);
      });
    } else {
      console.log(`   (No recommendations generated)`);
    }

    console.log(`\n📈 Data Sources: ${dataSources.length}`);
    if (dataSources.length > 0) {
      dataSources.forEach((ds, idx) => {
        console.log(`   ${idx + 1}. ${ds.type || 'Unknown'}: ${ds.description || ds.name || 'N/A'}`);
      });
    }

    console.log(`\n🔢 Calculations: ${Object.keys(calculations).length}`);
    if (Object.keys(calculations).length > 0) {
      Object.entries(calculations).slice(0, 5).forEach(([key, value]) => {
        console.log(`   - ${key}: ${typeof value === 'number' ? value.toLocaleString() : value}`);
      });
    }

    return {
      naturalText,
      recommendations,
      dataSources,
      calculations,
      planId: completedPlan.id
    };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log(error.stack);
    return null;
  }
}

async function testAICFOQuery(query, testName) {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`🤖 TEST: ${testName} (AI CFO Assistant)`);
  console.log(`${'═'.repeat(80)}`);
  console.log(`Query: "${query}"\n`);

  // AI CFO sends query directly without wrapping
  try {
    console.log('📤 Sending request to backend...');
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
      console.log(`❌ API Error: ${JSON.stringify(data, null, 2)}`);
      return null;
    }

    // Handle both response formats
    const plan = data.plan || data.data;
    if (!plan) {
      console.log(`❌ No plan in response`);
      console.log(`   Full response: ${JSON.stringify(data, null, 2)}`);
      return null;
    }
    
    if (!plan.id) {
      console.log(`❌ No plan ID in plan object`);
      console.log(`   Plan object: ${JSON.stringify(plan, null, 2)}`);
      return null;
    }

    console.log(`✅ Plan created: ${plan.id}`);
    console.log(`   Status: ${plan.status}`);

    const completedPlan = await waitForPlanCompletion(plan.id);
    if (!completedPlan) {
      return null;
    }

    const planJson = typeof completedPlan.planJson === 'string' 
      ? JSON.parse(completedPlan.planJson) 
      : completedPlan.planJson;
    
    const structured = planJson?.structuredResponse || {};
    const naturalText = structured?.natural_text || structured?.naturalLanguage || '';
    const recommendations = structured?.recommendations || [];
    const dataSources = structured?.dataSources || [];
    const calculations = structured?.calculations || {};

    console.log(`\n📊 RESPONSE ANALYSIS:`);
    console.log(`${'─'.repeat(80)}`);
    console.log(`Natural Language Response (${naturalText.length} chars):`);
    console.log(`${'─'.repeat(80)}`);
    console.log(naturalText || '(No response text)');
    console.log(`${'─'.repeat(80)}`);
    
    console.log(`\n💡 Recommendations: ${recommendations.length}`);
    if (recommendations.length > 0) {
      recommendations.forEach((rec, idx) => {
        console.log(`\n   ${idx + 1}. ${rec.title || rec.action || 'Untitled Recommendation'}`);
        if (rec.summary) console.log(`      Summary: ${rec.summary.substring(0, 150)}...`);
      });
    }

    return {
      naturalText,
      recommendations,
      dataSources,
      calculations,
      planId: completedPlan.id
    };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return null;
  }
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

async function compareResponses(scenarioResult, aicfoResult, testName) {
  console.log(`\n${'█'.repeat(80)}`);
  console.log(`📊 COMPARISON: ${testName}`);
  console.log(`${'█'.repeat(80)}`);

  if (!scenarioResult || !aicfoResult) {
    console.log(`⚠️  Cannot compare - one or both queries failed`);
    return;
  }

  const similarity = calculateSimilarity(scenarioResult.naturalText, aicfoResult.naturalText);
  
  console.log(`\n📝 Response Similarity: ${(similarity * 100).toFixed(1)}%`);
  if (similarity > 0.7) {
    console.log(`   ⚠️  HIGH SIMILARITY - Responses are very similar`);
    console.log(`   💡 This is EXPECTED - both use the same backend API`);
  } else {
    console.log(`   ✅ Responses are different`);
  }

  console.log(`\n📏 Response Lengths:`);
  console.log(`   Scenario Planning: ${scenarioResult.naturalText.length} characters`);
  console.log(`   AI CFO Assistant: ${aicfoResult.naturalText.length} characters`);

  console.log(`\n💡 Recommendations:`);
  console.log(`   Scenario Planning: ${scenarioResult.recommendations.length}`);
  console.log(`   AI CFO Assistant: ${aicfoResult.recommendations.length}`);

  console.log(`\n📈 Data Sources:`);
  console.log(`   Scenario Planning: ${scenarioResult.dataSources.length}`);
  console.log(`   AI CFO Assistant: ${aicfoResult.dataSources.length}`);

  console.log(`\n🔑 KEY INSIGHT:`);
  console.log(`   Both features use the SAME backend API endpoint.`);
  console.log(`   The difference is in the WORKFLOW FEATURES:`);
  console.log(`   - AI CFO: Tasks tab, Staged Changes tab, Chat history`);
  console.log(`   - Scenario Planning: Snapshots, Templates, Comparisons`);
}

async function main() {
  console.log('\n' + '█'.repeat(80));
  console.log('🧪 SCENARIO PLANNING "ASK YOUR FINANCIAL COPILOT" - COMPREHENSIVE TEST');
  console.log('█'.repeat(80));
  console.log('\nTesting with: cptjacksprw@gmail.com');
  console.log('Purpose: Verify responses and compare with AI CFO Assistant\n');

  try {
    await login();

    const testCases = [
      {
        name: "What happens if we hire 3 engineers next month?",
        scenario: "What happens if we hire 3 engineers next month?",
        aicfo: "What happens if we hire 3 engineers next month?"
      },
      {
        name: "What's my current runway?",
        scenario: "What's my current runway?",
        aicfo: "What's my current runway?"
      },
      {
        name: "How can I improve my burn rate?",
        scenario: "How can I improve my burn rate?",
        aicfo: "How can I improve my burn rate?"
      }
    ];

    const results = [];

    for (const testCase of testCases) {
      console.log(`\n\n${'▓'.repeat(80)}`);
      console.log(`TEST CASE: ${testCase.name}`);
      console.log(`${'▓'.repeat(80)}`);

      const scenarioResult = await testScenarioPlanningQuery(
        testCase.scenario,
        `Scenario Planning - "${testCase.name}"`
      );

      await new Promise(r => setTimeout(r, 3000));

      const aicfoResult = await testAICFOQuery(
        testCase.aicfo,
        `AI CFO Assistant - "${testCase.name}"`
      );

      if (scenarioResult && aicfoResult) {
        await compareResponses(scenarioResult, aicfoResult, testCase.name);
      }

      results.push({
        testCase: testCase.name,
        scenario: scenarioResult,
        aicfo: aicfoResult
      });

      await new Promise(r => setTimeout(r, 2000));
    }

    // Final Summary
    console.log(`\n\n${'█'.repeat(80)}`);
    console.log('📋 FINAL SUMMARY');
    console.log(`${'█'.repeat(80)}`);

    console.log(`\n✅ Tested ${results.length} scenarios`);
    console.log(`\n🎯 KEY FINDINGS:`);
    console.log(`\n1. BACKEND ARCHITECTURE:`);
    console.log(`   - Both features use: POST /api/v1/orgs/:orgId/ai-plans`);
    console.log(`   - Scenario Planning wraps queries with structured template`);
    console.log(`   - AI CFO sends queries directly`);
    console.log(`   - Responses will be SIMILAR (same AI engine)`);

    console.log(`\n2. AI CFO ASSISTANT USP (Unique Selling Points):`);
    console.log(`   ⭐ Tasks Tab:`);
    console.log(`      - Convert AI recommendations → actionable tasks`);
    console.log(`      - Assign to team members with deadlines`);
    console.log(`      - Track completion status`);
    console.log(`      - Company use: CFO assigns "Reduce costs" to CTO`);
    console.log(`   ⭐ Staged Changes Tab:`);
    console.log(`      - Review AI recommendations before implementing`);
    console.log(`      - See data sources for each recommendation`);
    console.log(`      - Approve/reject with full audit trail`);
    console.log(`      - Company use: Governance, compliance, transparency`);
    console.log(`   ⭐ Chat Tab:`);
    console.log(`      - Persistent conversation history`);
    console.log(`      - Multi-turn discussions`);
    console.log(`      - Strategic financial advisor`);

    console.log(`\n3. SCENARIO PLANNING USP:`);
    console.log(`   - Snapshot comparison (save & compare scenarios)`);
    console.log(`   - Template library (quick scenario creation)`);
    console.log(`   - Version history (track assumption evolution)`);
    console.log(`   - Visual comparisons (present to board/investors)`);

    console.log(`\n4. USE CASES (Company/Client Perspective):`);
    console.log(`\n   AI CFO Assistant:`);
    console.log(`   - Daily financial advisor`);
    console.log(`   - Task manager for finance team`);
    console.log(`   - Approval workflow for decisions`);
    console.log(`   - Compliance audit trail`);
    console.log(`\n   Scenario Planning:`);
    console.log(`   - Board presentation tool`);
    console.log(`   - "What-if" modeling`);
    console.log(`   - Investor pitch preparation`);
    console.log(`   - Strategic option comparison`);

    console.log(`\n5. RECOMMENDATIONS:`);
    console.log(`   ✅ Add onboarding tutorial explaining 3 tabs`);
    console.log(`   ✅ Add tooltips clarifying purpose of each feature`);
    console.log(`   ✅ Consider renaming Scenario Planning's copilot feature`);
    console.log(`   ✅ Highlight Tasks & Staged Changes as key differentiators`);

    console.log(`\n${'█'.repeat(80)}`);
    console.log('✅ TESTING COMPLETE');
    console.log(`${'█'.repeat(80)}\n`);

  } catch (error) {
    console.error(`\n❌ Fatal Error: ${error.message}`);
    console.error(error.stack);
  }
}

main();
