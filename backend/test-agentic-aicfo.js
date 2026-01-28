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
  if (!data.token) {
    throw new Error('Login failed: ' + JSON.stringify(data));
  }
  token = data.token;
  orgId = data.user.orgRoles[0]?.orgId || data.user.defaultOrgId;
  console.log(`✅ Logged in as cptjacksprw@gmail.com`);
  console.log(`   Org ID: ${orgId}\n`);
}

async function testAgenticQuery(query) {
  console.log(`\n${'─'.repeat(80)}`);
  console.log(`🤖 TESTING AGENTIC QUERY: "${query}"`);
  console.log(`${'─'.repeat(80)}`);

  try {
    const res = await fetch(`${API_BASE}/orgs/${orgId}/ai-cfo/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    const data = await res.json();

    if (!data.ok) {
      console.log(`❌ API Error: ${JSON.stringify(data.error) || 'Unknown error'}`);
      return;
    }

    const response = data.response;
    console.log(`✅ Received Agent Response (${response.agentType})`);
    console.log(`   Confidence: ${(response.confidence * 100).toFixed(1)}%`);
    console.log(`   Status: ${response.status}`);

    console.log(`\n🧠 THOUGHTS:`);
    response.thoughts.forEach(t => {
      console.log(`   [Step ${t.step}] ${t.thought}`);
      if (t.observation) console.log(`     └ Observation: ${t.observation}`);
    });

    console.log(`\n📝 ANSWER:`);
    console.log(`${'─'.repeat(80)}`);
    console.log(response.answer);
    console.log(`${'─'.repeat(80)}`);

    if (response.recommendations && response.recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS:`);
      response.recommendations.forEach((rec, idx) => {
        console.log(`   ${idx + 1}. ${rec.title} [${rec.priority}]`);
        console.log(`      Impact: ${rec.impact.value} on ${rec.impact.metric}`);
      });
    }

    if (response.calculations && Object.keys(response.calculations).length > 0) {
      console.log(`\n📊 CALCULATIONS:`);
      for (const [key, value] of Object.entries(response.calculations)) {
        console.log(`   - ${key}: ${value}`);
      }
    }

    if (response.followUpQuestions && response.followUpQuestions.length > 0) {
      console.log(`\n❓ FOLLOW-UP QUESTIONS:`);
      response.followUpQuestions.forEach(q => console.log(`   - ${q}`));
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function main() {
  try {
    await login();

    // Test Case 1: Treasury Query (Simple)
    await testAgenticQuery("What is my current runway and how can I extend it?");

    // Test Case 2: Strategic Query (Complex - Should trigger LLM synthesis)
    await testAgenticQuery("What strategies can help me accelerate revenue growth while protecting my burn multiple?");

    // Test Case 3: Forecasting Query (Scenario)
    await testAgenticQuery("Predict our cash position for the next 6 months assuming 10% growth");

    // Test Case 4: High Risk Query (Should trigger HITL)
    await testAgenticQuery("I want to approve a $250,000 investment in a new data center. What is the impact?");

    // Test Case 5: Ambiguous Query
    await testAgenticQuery("Who is the best CFO?");

    console.log(`\n✅ AGENTIC TESTING COMPLETE`);
  } catch (error) {
    console.error(`❌ Fatal Error: ${error.message}`);
  }
}

main();
