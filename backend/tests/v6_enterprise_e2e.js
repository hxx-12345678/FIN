/**
 * V6 ENTERPRISE E2E TEST — The Institutional Final Boss Run
 * Tests for user: cptjacksprw@gmail.com (JACK SPARROW)
 * 10,000 Row Golden Dataset | 3-Year Baseline | 3-Statement Integrity
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
    const opts = { method, headers: isJson ? jsonHeaders : authHeaders, cache: 'no-store' };
    if (body) {
        opts.body = isJson ? JSON.stringify(body) : body;
    }
    const res = await fetch(`${API}${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (res.status >= 400) {
        console.error(`ERROR ${method} ${path}:`, JSON.stringify(data, null, 2));
    }
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
    console.log('\n--- PHASE 1: Institutional Data Onboarding ---');

    const goldenCsvPath = path.join(__dirname, 'golden_enterprise_10k.csv');
    if (!fs.existsSync(goldenCsvPath)) {
        console.error('❌ Golden Dataset missing! Run golden_gen.py first.');
        process.exit(1);
    }

    const uploadRes = await uploadFile(goldenCsvPath);
    log('10,000 Row CSV Upload Successful', uploadRes.status === 201, `uploadKey=${uploadRes.data?.data?.uploadKey}`);

    if (uploadRes.status === 201) {
        const uploadKey = uploadRes.data.data.uploadKey;
        const mapRes = await apiCall('POST', `/orgs/${ORG_ID}/import/csv/map`, {
            uploadKey,
            mappings: { date: 'Date', description: 'Description', amount: 'Amount', category: 'Category' }
        });
        log('Mapping Job Created (Audit Lineage)', mapRes.status === 201, `jobId=${mapRes.data?.data?.jobId}`);

        console.log('Ingesting 10,000 transactions... (Waiting 12s)');
        await new Promise(r => setTimeout(r, 12000));
    }

    console.log('\n--- PHASE 2: Enterprise Model Construction ---');
    const ds = await apiCall('GET', `/orgs/${ORG_ID}/data-status`);
    log('Data Status: hasTransactions=true', ds.data.hasTransactions === true, `count=${ds.data.stats?.transactionCount}`);
    log('Gating Check: AI Precision Enabled', ds.data.intelligenceGating?.dataDrivenAI === true, '');

    const modelName = `INSTITUTIONAL_SaaS_V6_${Date.now()}`;
    const modelCreation = await apiCall('POST', `/orgs/${ORG_ID}/models`, {
        model_name: modelName,
        industry: 'SaaS',
        revenue_model_type: 'subscription',
        forecast_duration: 12,
        data_source_type: 'connectors',
        start_month: '2025-01', // Starts after most historical data
        is_synthetic: false,
        baseline_confirmed: true,
        source_auth_map: {
            revenue: 'ERP Connectors',
            expenses: 'Verified CSV Upload',
            payroll: 'HRIS Export'
        },
        init_metadata: {
            ai_version: 'fina-institutional-v6-gold',
            audit_ref: 'E2E-MARCH-2026'
        }
    });
    log('Enterprise Model Created', modelCreation.status === 201, `modelId=${modelCreation.data?.model?.id}`);

    const modelId = modelCreation.data?.model?.id;
    if (modelId) {
        console.log('\n--- PHASE 3: 3-Statement & Cross-Tab Validation ---');

        // Trigger Run
        const runRes = await apiCall('POST', `/models/${modelId}/run`, {
            runType: 'baseline',
            paramsJson: { modelType: 'prophet' }
        });
        log('Institutional Model Run Triggered', runRes.status === 201, '');

        if (runRes.data?.run?.id) {
            console.log('Computing 3-Statement Projection (8s)...');
            await new Promise(r => setTimeout(r, 8000));
            const runsList = await apiCall('GET', `/models/${modelId}/runs`);
            const latestRun = runsList.data?.runs?.find(r => r.id === runRes.data.run.id);
            log('Run Status: Done', latestRun?.status === 'done', '');

            if (latestRun?.summary_json) {
                const summary = typeof latestRun.summary_json === 'string' ? JSON.parse(latestRun.summary_json) : latestRun.summary_json;

                // Assert Accounting Integrity
                const validation = summary.statements?.validation || {};
                log('Accounting Integrity: Assets = L + E', validation.passed === true, `diff=${validation.max_diff}`);

                // Assert SaaS Growth Baseline
                log('SaaS Growth Baseline: Revenue > 0', summary.revenue > 0, `rev=${summary.revenue}`);

                // DATA INGESTION TAB
                const txs = await apiCall('GET', `/orgs/${ORG_ID}/transactions?limit=10`);
                log('Ingestion Tab: Transaction Table Populated', (txs.data?.transactions?.length || 0) >= 10, `count=${txs.data?.transactions?.length}`);

                // DRIVERS TAB
                const drivers = await apiCall('GET', `/orgs/${ORG_ID}/models/${modelId}/drivers`);
                log('Drivers Tab: Domain Objects Visible', drivers.data?.drivers?.length > 0, `count=${drivers.data?.drivers?.length}`);

                // AI ASSIST TAB
                const aiChat = await apiCall('POST', `/orgs/${ORG_ID}/ai-cfo/query`, {
                    query: "Analyze my SaaS gross margin and provide an institutional summary",
                    context: { modelId: modelId }
                });
                log('AI Assist: Narrative Synthesis Generated', aiChat.data?.ok === true, '');

                // FORECASTING TAB
                const forecast = await apiCall('POST', `/orgs/${ORG_ID}/models/${modelId}/forecast`, {
                    metricName: 'revenue',
                    steps: 12
                });
                log('Forecasting: History & Projections Valid', forecast.data?.history?.length > 0 && forecast.data?.forecast?.length === 12, '');

                // EXPLAINABILITY TAB
                const traces = await apiCall('GET', `/orgs/${ORG_ID}/models/${modelId}/traces`);
                log('Explainability: Hyper-Trace™ Lineage Visible', traces.data?.traces?.length > 0, `traces=${traces.data?.traces?.length}`);
            }
        }

        console.log('\n--- PHASE 4: Resilience & Audit Verification ---');
        // Test refresh after data change
        const modelOneMoreInfo = await apiCall('GET', `/orgs/${ORG_ID}/models/${modelId}`);
        log('Model Metadata: Source Authority Persisted', modelOneMoreInfo.data?.model?.model_json?.metadata?.sourceAuthMap?.revenue === 'ERP Connectors', '');
    }

    console.log('\n═══════════════════════════════════════════');
    console.log(' FINAL INSTITUTIONAL E2E SUMMARY (V6)');
    console.log(` Passed: ${testResults.filter(r => r.status === '✅ PASS').length} / ${testResults.length}`);
    console.log('═══════════════════════════════════════════\n');
}

runTests().catch(err => console.error('FATAL:', err));
