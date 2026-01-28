const fetch = require('node-fetch');

async function main() {
    const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'cptjacksprw@gmail.com', password: 'Player@123' })
    });
    const { token, user } = await res.json();
    const orgId = user.orgRoles[0]?.orgId || user.defaultOrgId;

    console.log("--- STRATEGIC QUERY TEST ---");
    const queryRes = await fetch(`http://localhost:8000/api/v1/orgs/${orgId}/ai-cfo/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: "What strategies can help me accelerate revenue growth while protecting my burn multiple?" })
    });

    const data = await queryRes.json();
    console.log(data.response.answer);

    console.log("\n--- HITL TEST ---");
    const hitlRes = await fetch(`http://localhost:8000/api/v1/orgs/${orgId}/ai-cfo/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: "I want to approve a $250,000 investment in a new data center. What is the impact?" })
    });

    const hitlData = await hitlRes.json();
    console.log(hitlData.response.answer);
    console.log("Status:", hitlData.response.status);
}

main();
