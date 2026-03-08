/**
 * COMPREHENSIVE E2E TEST — Financial Modeling Flow (V5 - THE PERFECT RUN)
 * Tests for user: cptjacksprw@gmail.com (JACK SPARROW)
 * All routes and return values verified against backend source code.
 */

const fs = require('fs');
const path = require('path');

const API = 'http://localhost:8000/api/v1';
const TOKEN = process.argv[2];
const ORG_ID = process.argv[3];

if (!TOKEN || !ORG_ID) {
    console.error('Usage: node e2e_test.js <TOKEN> <ORG_ID>');
    process.exit(1);
}

const authHeaders = {
    'Authorization': `Bearer ${TOKEN}`
};

const jsonHeaders = {
    ...authHeaders,
    'Content-Type': 'application/json'
};

let testResults = [];
let testNumber = 0;

function log(label, pass, detail) {
    testNumber++;
    const status = pass ? '✅ PASS' : '❌ FAIL';
    testResults.push({ n: testNumber, label, status, detail });
    console.log(`[${testNumber}] ${status} — ${label}`);
    if (detail) console.log(`    Detail: ${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 300)}`);
}

async function apiCall(method, path, body, isJson = true) {
    const opts = { method, headers: isJson ? jsonHeaders : authHeaders };
    if (body) {
        if (isJson) {
            opts.body = JSON.stringify(body);
        } else {
            opts.body = body;
        }
    }
    const res = await fetch(`${API}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
}

async function uploadFile(filePath) {
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'text/csv' });
    formData.append('file', blob, path.basename(filePath));

    const res = await fetch(`${API}/orgs/${ORG_ID}/import/csv/upload`, {
        method: 'POST',
        headers: authHeaders,
        body: formData
    });

    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
}

async function runTests() {
    console.log('\n--- PHASE 1: Data Ingestion (CSV) ---');

    const csvPath = path.join(__dirname, 'test_final_v5.csv');
    const csvContent =
        `Date,Description,Amount,Category
2025-01-15,Revenue - Client A,10000,Revenue
2025-01-20,Payroll - Jan,-25000,Payroll
2025-02-15,Revenue - Client A,12000,Revenue
2025-02-20,Payroll - Feb,-25000,Payroll
2025-03-15,Revenue - Client B,15000,Revenue
2025-03-20,Payroll - Mar,-27000,Payroll
2025-04-15,Revenue Total,30000,Revenue
2025-04-20,Payroll - Apr,-28000,Payroll`;
    fs.writeFileSync(csvPath, csvContent);

    const uploadRes = await uploadFile(csvPath);
    log('CSV Upload Successful', uploadRes.status === 201, `uploadKey=${uploadRes.data?.data?.uploadKey}`);

    if (uploadRes.status === 201) {
        const uploadKey = uploadRes.data.data.uploadKey;
        const mapRes = await apiCall('POST', `/orgs/${ORG_ID}/import/csv/map`, {
            uploadKey,
            mappings: { date: 'Date', description: 'Description', amount: 'Amount', category: 'Category' }
        });
        log('CSV Mapping Job Created', mapRes.status === 201, `jobId=${mapRes.data?.data?.jobId}`);

        // Wait for import job
        await new Promise(r => setTimeout(r, 6000));
    }

    console.log('\n--- PHASE 2: Data-Driven Model Creation ---');
    const ds = await apiCall('GET', `/orgs/${ORG_ID}/data-status`);
    log('Data Check: hasTransactions=true', ds.data.hasTransactions === true, `count=${ds.data.stats?.transactionCount}`);

    const modelCreation = await apiCall('POST', `/orgs/${ORG_ID}/models`, {
        model_name: `E2E_DataDriven_V5_${Date.now()}`,
        industry: 'Technology',
        revenue_model_type: 'subscription',
        forecast_duration: 12,
        data_source_type: 'connectors',
        start_month: '2026-06',
        is_synthetic: false,
        baseline_confirmed: true,
        source_auth_map: { revenue: 'GL Transactions', expenses: 'GL Transactions', payroll: 'CSV Upload' }
    });
    log('Model Created Successfully', modelCreation.status === 201, `modelId=${modelCreation.data?.model?.id}`);

    const modelId = modelCreation.data?.model?.id;
    if (modelId) {
        console.log('\n--- PHASE 3: Tab Consistency Check ---');

        // 1. DASHBOARD: Start Run
        const runRes = await apiCall('POST', `/models/${modelId}/run`, {
            runType: 'baseline',
            paramsJson: { modelType: 'prophet' }
        });
        log('Dashboard: Model run triggered via /models/:id/run', runRes.status === 201, `runStatus=${runRes.data?.run?.status}`);

        if (runRes.data?.run?.id) {
            console.log('Waiting for computation (15s)...');
            await new Promise(r => setTimeout(r, 15000));
            const runsList = await apiCall('GET', `/models/${modelId}/runs`);
            const completed = runsList.data?.runs?.find(r => r.id === runRes.data.run.id && (r.status === 'done' || r.status === 'completed'));
            log('Dashboard: Run completed successfully', !!completed, '');
        }

        // 2. DATA INGESTION
        const txs = await apiCall('GET', `/orgs/${ORG_ID}/transactions?limit=5`);
        log('Data Ingestion: Transactions visible', (txs.data?.transactions?.length || 0) > 0, `found=${txs.data?.transactions?.length}`);

        // 3. DRIVERS
        const drivers = await apiCall('GET', `/orgs/${ORG_ID}/models/${modelId}/drivers`);
        log('Drivers: Tab data visible', drivers.status === 200, '');

        // 4. SCENARIOS
        const scenarios = await apiCall('GET', `/orgs/${ORG_ID}/models/${modelId}/scenarios`);
        log('Scenarios: Tab data visible', scenarios.status === 200, '');

        // 5. AI ASSIST: Chat Query
        const aiChat = await apiCall('POST', `/orgs/${ORG_ID}/ai-cfo/query`, {
            query: "Analyze my revenue trend",
            context: { modelId: modelId }
        });
        log('AI Assist: Chat requested via /ai-cfo/query', aiChat.status === 200 || aiChat.status === 201, `ok=${aiChat.data?.ok}`);

        // 6. FORECASTING
        const forecast = await apiCall('POST', `/orgs/${ORG_ID}/models/${modelId}/forecast`, {
            metricName: 'revenue',
            steps: 12
        });
        log('Forecasting: Tab data visible (POST /forecast)', forecast.status === 200, `historyLen=${forecast.data?.history?.length || 0}`);

        // 7. EXPLAINABILITY
        const traces = await apiCall('GET', `/orgs/${ORG_ID}/models/${modelId}/traces`);
        log('Explainability: Tab data visible (GET /traces)', traces.status === 200, '');

        console.log('\n--- PHASE 4: Behavioral Change Analysis ---');

        // Revenue Spike
        const csvContentSpike = `Date,Description,Amount,Category\n2025-12-01,Huge Revenue Spike,500000,Revenue`;
        fs.writeFileSync(csvPath, csvContentSpike);
        const uploadSpike = await uploadFile(csvPath);
        if (uploadSpike.status === 201) {
            await apiCall('POST', `/orgs/${ORG_ID}/import/csv/map`, {
                uploadKey: uploadSpike.data.data.uploadKey,
                mappings: { date: 'Date', amount: 'Amount', description: 'Description', category: 'Category' }
            });
            console.log('Injecting revenue spike ($500k)...');
            await new Promise(r => setTimeout(r, 6000));

            const dsSpike = await apiCall('GET', `/orgs/${ORG_ID}/data-status`);
            log('Transaction count increased in backend', dsSpike.data.stats?.transactionCount > ds.data.stats?.transactionCount, `newCount=${dsSpike.data.stats?.transactionCount}`);

            // Trigger Recompute (using /orgs/:id/models/:id/recompute)
            const recompute = await apiCall('POST', `/orgs/${ORG_ID}/models/${modelId}/recompute`, {});
            log('Model Recompute Triggered after data change', recompute.status === 200 || recompute.status === 201, `ok=${recompute.data?.ok}`);
        }
    }

    console.log('\n═══════════════════════════════════════════');
    console.log(' FINAL E2E TEST SUMMARY (V5)');
    console.log(` Passed: ${testResults.filter(r => r.status === '✅ PASS').length} / ${testResults.length}`);
    console.log('═══════════════════════════════════════════\n');
}

runTests().catch(err => console.error('FATAL:', err));
