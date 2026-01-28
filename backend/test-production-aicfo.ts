import 'dotenv/config';
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:8000/api/v1';

async function testScenario(name: string, query: string, token: string, orgId: string) {
    console.log(`\n🚀 [TEST] ${name}`);
    console.log(`💬 Query: "${query}"`);

    const startTime = Date.now();
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/ai-cfo/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query,
            context: { bypassApproval: true }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error ${response.status}: ${errorText}`);
        return;
    }

    const data = await response.json() as any;
    const duration = Date.now() - startTime;

    console.log(`⏱️ Duration: ${duration}ms`);
    console.log(`🤖 Agent: ${data.response.agentType} (Status: ${data.response.status})`);
    console.log(`🎯 Confidence: ${(data.response.confidence * 100).toFixed(0)}%`);

    if (data.response.thoughts && data.response.thoughts.length > 0) {
        console.log(`\n🧠 Reasoning Steps:`);
        data.response.thoughts.forEach((t: any) => {
            console.log(`   ${t.step}. ${t.thought}${t.observation ? ' -> ' + t.observation : ''}`);
        });
    }

    if (data.response.results) {
        console.log(`\n🤖 Raw Agent Outputs:`);
        data.response.results.forEach((r: any) => {
            console.log(`   [${r.agentType}] ${r.answer.substring(0, 100)}...`);
        });
    }

    console.log(`\n📝 FINAL ANSWER:`);
    console.log(data.response.answer);

    if (data.response.recommendations && data.response.recommendations.length > 0) {
        console.log(`\n💡 Recommendations:`);
        data.response.recommendations.forEach((r: any) => {
            console.log(`   • [${r.priority.toUpperCase()}] ${r.title}: ${r.description}`);
            if (r.impact) console.log(`     Impact: ${r.impact.metric} (${r.impact.value})`);
        });
    }

    if (data.response.calculations) {
        console.log(`\n📊 Calculations:`);
        Object.entries(data.response.calculations).forEach(([k, v]: [string, any]) => {
            console.log(`   • ${k}: ${typeof v === 'number' ? v.toLocaleString() : v}`);
        });
    }

    return data;
}

async function runAllTests() {
    console.log("--- PRODUCTION LEVEL AI CFO INTEGRATION TEST ---");

    // 1. Login
    const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'cptjacksprw@gmail.com', password: 'Player@123' })
    });

    const { token, user } = await loginRes.json() as any;
    const orgId = user.orgRoles[0]?.orgId || user.defaultOrgId;
    console.log(`✅ Logged in to Org: ${orgId}`);

    // Test Case A: Crisis Management (Treasury + Analytics)
    const result = await testScenario(
        "CRISIS MANAGEMENT",
        "Our burn rate increased by 20% last month unexpectedly. Analyze why this happened and provide an emergency plan to preserve 12 months of runway.",
        token,
        orgId
    );

    console.log("\n--- START OF FINAL ANSWER ---");
    console.log(result.response.answer);
    console.log("--- END OF FINAL ANSWER ---");

    const fs = require('fs');
    fs.writeFileSync('test-output.md', result.response.answer);
    console.log("\n✅ Full answer written to test-output.md");
}

runAllTests().catch(console.error);
