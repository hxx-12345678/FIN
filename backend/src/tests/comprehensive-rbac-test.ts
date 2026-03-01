import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'http://localhost:8000/api/v1';

async function login(email: string, password: string = 'Player@123') {
    try {
        const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
        return {
            token: res.data.token,
            orgId: res.data.user.roles[0]?.orgId,
            user: res.data.user
        };
    } catch (error: any) {
        return null;
    }
}

async function request(method: string, endpoint: string, token: string, data?: any) {
    try {
        const res = await axios({
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: { Cookie: `auth-token=${token}` },
            data
        });
        return { status: res.status, data: res.data, success: true };
    } catch (error: any) {
        return {
            status: error.response?.status,
            error: error.response?.data || error.message,
            success: false
        };
    }
}

async function runTests() {
    const results: any[] = [];

    const admin = await login('cptjacksprw@gmail.com');
    const finance = await login('finance@gmail.com');
    const viewer = await login('viewer@gmail.com');

    if (!admin || !finance || !viewer) {
        fs.writeFileSync('rbac_results.json', JSON.stringify({ error: 'Failed to login one of the accounts' }));
        return;
    }

    const log = (name: string, success: boolean, info: string) => {
        results.push({ test: name, success, info });
    };

    // ADMIN
    let res = await request('GET', `/orgs/${admin.orgId}/users`, admin.token);
    log('Admin GET users', res.success, `Found ${res.data?.data?.length || 0} users`);

    res = await request('GET', `/orgs/${admin.orgId}/access-requests`, admin.token);
    log('Admin GET access requests', res.success, `Found ${res.data?.requests?.length || 0} requests`);

    // FINANCE
    res = await request('GET', `/orgs/${admin.orgId}/users`, finance.token);
    log('Finance GET users', res.success, `Found ${res.data?.data?.length || 0} users`);

    res = await request('GET', `/orgs/${admin.orgId}/access-requests`, finance.token);
    if (!res.success && res.status === 403) {
        log('Finance GET access requests', true, 'Correctly denied (403)');
    } else {
        log('Finance GET access requests', false, `Unexpected status: ${res.status}`);
    }

    res = await request('POST', `/orgs/${admin.orgId}/budgets`, finance.token, {
        modelId: 'dummy-model-id', accountId: 'dummy', amount: 1000, month: 1, year: 2026, type: 'actual'
    });
    if (res.status !== 403) {
        log('Finance POST budget (write operation)', true, `Not forbidden (Status: ${res.status})`);
    } else {
        log('Finance POST budget (write operation)', false, `Forbidden (Status: ${res.status})`);
    }

    // VIEWER
    res = await request('GET', `/orgs/${admin.orgId}/users`, viewer.token);
    log('Viewer GET users', res.success, `Found ${res.data?.data?.length || 0} users`);

    res = await request('POST', `/orgs/${admin.orgId}/budgets`, viewer.token, {
        modelId: 'dummy-model-id', accountId: 'dummy', amount: 1000, month: 1, year: 2026, type: 'actual'
    });
    if (!res.success && res.status === 403) {
        log('Viewer POST budget (write operation)', true, 'Correctly denied (403)');
    } else {
        log('Viewer POST budget (write operation)', false, `Unexpected status: ${res.status}`);
    }

    fs.writeFileSync('rbac_results.json', JSON.stringify(results, null, 2));
}

runTests();
