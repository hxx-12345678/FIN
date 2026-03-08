const { execSync } = require('child_process');
const fs = require('fs');

try {
    const loginRes = execSync('node get_token.js').toString().trim();
    const [token, orgId] = loginRes.split(' ');
    console.log(`Running E2E with TOKEN=${token.slice(0, 10)}... and ORG_ID=${orgId}`);
    const e2eRes = execSync(`node v6_enterprise_e2e.js ${token} ${orgId}`, { stdio: 'inherit' });
} catch (e) {
    console.error('E2E Failed', e.message);
}
