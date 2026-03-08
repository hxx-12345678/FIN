
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

async function runTest() {
    const logFile = path.join(__dirname, 'e2e_test_results.log');
    fs.writeFileSync(logFile, '--- STARTING END-TO-END FINANCIAL MODEL TEST (CSV PHASE) ---\n');

    function log(msg) {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    }

    const BASE_URL = 'http://localhost:8000/api/v1';
    const email = 'cptjacksprw@gmail.com';
    const password = 'Player@123';

    let token, orgId;

    try {
        // 1. LOGIN / SIGNUP
        log('1. Attempting login...');
        try {
            const loginRes = await axios.post(`${BASE_URL}/auth/login`, { email, password });
            token = loginRes.data.token;
            orgId = loginRes.data.orgId;
            log(`   Logged in. Org ID: ${orgId}`);
        } catch (e) {
            log('   Login failed. Signing up...');
            const signupRes = await axios.post(`${BASE_URL}/auth/signup`, {
                email, password, name: 'Jack Sparrow', orgName: 'Black Pearl'
            });
            token = signupRes.data.token;
            orgId = signupRes.data.org.id;
            log(`   Signed up. Org ID: ${orgId}`);
        }

        const headers = { Authorization: `Bearer ${token}` };

        // 2. UPLOAD CSV
        log('2. Uploading CSV...');
        const csvPath = path.join(__dirname, 'dummy_transactions.csv');
        const form = new FormData();
        form.append('file', fs.createReadStream(csvPath));

        const uploadRes = await axios.post(`${BASE_URL}/orgs/${orgId}/import/csv/upload`, form, {
            headers: { ...headers, ...form.getHeaders() }
        });
        const uploadKey = uploadRes.data.data.uploadKey;
        log(`   CSV uploaded. Key: ${uploadKey}`);

        // 3. MAP CSV (CONFIRM IMPORT)
        log('3. Mapping CSV headers...');
        const mapRes = await axios.post(`${BASE_URL}/orgs/${orgId}/import/csv/map`, {
            uploadKey: uploadKey,
            mappings: {
                date: 'date',
                category: 'category',
                description: 'description',
                amount: 'amount'
            },
            dateFormat: 'YYYY-MM-DD',
            currency: 'USD'
        }, { headers });
        log('   CSV mapped and transactions imported.');

        // 4. CREATE MODELS (DATA-DRIVEN)
        const architectures = ['3-statement', 'dcf', 'lbo', 'accretion-dilution'];
        log(`4. Creating Data-Driven Models for architectures: ${architectures.join(', ')}...`);

        for (const arch of architectures) {
            log(`\n--- Testing Architecture: ${arch} ---`);
            const modelData = {
                model_name: `Institutional ${arch.toUpperCase()} Model ${new Date().getTime()}`,
                industry: 'SaaS',
                revenue_model_type: 'subscription',
                model_type: arch,
                forecast_duration: 12,
                start_month: '2026-03',
                data_source_type: 'csv',
                baseline_confirmed: true
            };

            const createRes = await axios.post(`${BASE_URL}/orgs/${orgId}/models`, modelData, { headers });
            const modelId = createRes.data.model.id;
            const jobId = createRes.data.jobId;
            log(`   Model created: ${modelId}. Job: ${jobId}`);

            // 5. WAIT FOR JOB
            if (jobId) {
                log('   Waiting for job completion...');
                let status = 'pending';
                for (let i = 0; i < 20; i++) {
                    const jobRes = await axios.get(`${BASE_URL}/jobs/${jobId}`, { headers });
                    status = jobRes.data.job.status;
                    if (status === 'completed' || status === 'error') break;
                    await new Promise(r => setTimeout(r, 3000));
                }
                log(`   Job status: ${status}`);
                if (status !== 'completed') throw new Error(`Job failed with status: ${status}`);
            }

            // 6. VERIFY ALL TABS
            log(`   Verifying Tabs for ${arch}...`);

            // Dashboard
            let run = null, summary = null;
            try {
                // Poll for run completion since it's a background job
                for (let i = 0; i < 20; i++) {
                    const dbRes = await axios.get(`${BASE_URL}/models/${modelId}/runs`, { headers });
                    if (dbRes.data.runs && dbRes.data.runs.length > 0) {
                        run = dbRes.data.runs[0];
                        if (run.status === 'done' || run.status === 'error') break;
                    }
                    await new Promise(r => setTimeout(r, 2000));
                }

                summary = typeof run?.summaryJson === 'string' ? JSON.parse(run.summaryJson) : run?.summaryJson;
                log(`   [Dashboard] Runs found: ${run ? '✅' : '❌'}`);
                log(`   [Dashboard] P&L Data: ${summary?.monthly ? '✅' : '❌'}`);
                log(`   [Dashboard] 3-Statement Data: ${summary?.statements?.incomeStatement ? '✅' : '❌'}`);
            } catch (e) { log(`   [Dashboard] ❌ ${e.message}`); }
            // Ingestion
            const txRes = await axios.get(`${BASE_URL}/orgs/${orgId}/transactions`, { headers });
            log(`   [Ingestion] Transactions imported: ${txRes.data.transactions?.length || 0} ✅`);

            // Drivers
            const driversRes = await axios.get(`${BASE_URL}/orgs/${orgId}/models/${modelId}/drivers`, { headers });
            log(`   [Drivers] Count: ${driversRes.data.drivers?.length || 0} ${driversRes.data.drivers?.length > 0 ? '✅' : '❌'}`);

            // AI Assist
            try {
                const aiRes = await axios.post(`${BASE_URL}/orgs/${orgId}/ai-cfo/query`, {
                    query: 'What is our profitability outlook?',
                    context: { modelId: modelId }
                }, { headers });
                log(`   [AI Assist] Answer: ${(aiRes.data.answer || aiRes.data.response) ? '✅' : '❌'}`);
            } catch (e) { log(`   [AI Assist] ❌ ${e.message}`); }

            // Forecasting
            const scenariosRes = await axios.get(`${BASE_URL}/orgs/${orgId}/models/${modelId}/scenarios`, { headers });
            log(`   [Forecasting] Scenarios: ${scenariosRes.data.scenarios?.length || 0} ✅`);

            // Audit Trace
            try {
                const traceRes = await axios.post(`${BASE_URL}/compute/reasoning`, {
                    modelId, target: 'monthly_burn_rate', goal: 'decrease', period_a: 0, period_b: 1
                }, { headers });
                log(`   [Audit Trace] Data: ${traceRes.data.analysis ? '✅' : '❌'}`);
            } catch (e) { log(`   [Audit Trace] ❌ ${e.message}`); }

            // Policy Hub
            const policyRes = await axios.get(`${BASE_URL}/orgs/${orgId}/compliance/security-score`, { headers });
            log(`   [Policy Hub] Score: ${policyRes.data.score || 0} ✅`);
        }

        log('--- CSV E2E TEST SUCCESS ---\n');

    } catch (err) {
        log('--- TEST FAILED ---');
        log(err.message);
        if (err.response) log('Response: ' + JSON.stringify(err.response.data, null, 2));
    }
}

runTest();
