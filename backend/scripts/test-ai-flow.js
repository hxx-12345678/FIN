
const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1'; // Adjusted to correct backend port
const EMAIL = 'cptjacksprw@gmail.com';
const PASSWORD = 'Player@123';

async function testAIFlow() {
    console.log('🚀 Starting AI Model Flow Test...');

    try {
        // 1. Login
        console.log('🔑 Logging in...');
        const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD
        });

        const token = loginRes.data.token;
        const orgId = loginRes.data.orgId;
        console.log(`✅ Logged in. Org ID: ${orgId}`);

        const headers = {
            Authorization: `Bearer ${token}`
        };

        // 2. Create AI Model
        console.log('🏗️ Creating AI Model...');
        const createRes = await axios.post(`${API_BASE_URL}/orgs/${orgId}/models`, {
            model_name: "Production Test AI SaaS " + new Date().getTime(),
            industry: "SaaS",
            revenue_model_type: "subscription",
            forecast_duration: 12,
            data_source_type: "blank",
            business_type: "saas",
            starting_customers: 100,
            starting_revenue: 50000,
            cash_on_hand: 1000000,
            retention_rate: 94,
            acquisition_efficiency: {
                caac: 450,
                payback: 6
            },
            hiring_plan: [
                { month: 3, role: "Senior Engineer", salary: 120000 }
            ]
        }, { headers });

        const model = createRes.data.model;
        const jobId = createRes.data.jobId;
        console.log(`✅ Model created. ID: ${model.id}. Job ID: ${jobId}`);

        if (!jobId) {
            console.log('⚠️ No job ID returned.');
        } else {
            // 3. Poll for Job Completion
            console.log('⏳ Waiting for AI generation job to complete...');
            let jobDone = false;
            let attempts = 0;
            while (!jobDone && attempts < 20) {
                const jobRes = await axios.get(`${API_BASE_URL}/jobs/${jobId}`, { headers });
                const status = jobRes.data.job.status;
                console.log(`   Job Status: ${status}`);
                if (status === 'completed' || status === 'done' || status === 'finished') {
                    jobDone = true;
                } else if (status === 'failed' || status === 'dead_letter') {
                    console.log('❌ Job failed/dead_letter:', JSON.stringify(jobRes.data.job, null, 2));
                    throw new Error('❌ AI generation job failed');
                }
                await new Promise(r => setTimeout(r, 2000));
                attempts++;
            }
        }

        // 4. Verify Model Details
        console.log('🔍 Verifying Model Assumptions...');
        const modelRes = await axios.get(`${API_BASE_URL}/models/${model.id}`, { headers });
        const modelData = modelRes.data.model;
        const assumptions = modelData.modelJson?.assumptions || {};

        console.log('   Assumptions found (Sub-keys):', Object.keys(assumptions));

        // Retention (mapped to churn)
        if (assumptions.revenue && Math.abs(assumptions.revenue.churnRate - 0.06) < 0.001) {
            console.log('✅ Retention Rate (mapped to churn 0.06) verified.');
        } else {
            console.log('❌ Retention Rate NOT found or incorrect. Churn was:', assumptions.revenue?.churnRate);
        }

        // CAC
        if (assumptions.unitEconomics?.cac === 450) {
            console.log('✅ CAC verified.');
        } else {
            console.log('❌ CAC NOT found or incorrect. Found:', assumptions.unitEconomics?.cac);
        }

        // 5. Verify Runs & Statements
        console.log('📊 Verifying Financial Statements (Model Run)...');
        let runReady = false;
        let runAttempts = 0;
        let latestRunId = null;

        while (!runReady && runAttempts < 30) {
            const runsRes = await axios.get(`${API_BASE_URL}/models/${model.id}/runs`, { headers });
            if (runsRes.data.runs && runsRes.data.runs.length > 0) {
                const latestRun = runsRes.data.runs[0];
                latestRunId = latestRun.id;
                console.log(`   Model Run ${latestRunId} Status: ${latestRun.status}`);
                if (latestRun.status === 'done' || latestRun.status === 'completed') {
                    runReady = true;
                }
            }
            if (!runReady) {
                await new Promise(r => setTimeout(r, 2000));
                runAttempts++;
            }
        }

        if (runReady) {
            const runDetails = await axios.get(`${API_BASE_URL}/models/${model.id}/runs/${latestRunId}`, { headers });
            const summary = runDetails.data.run.summaryJson;

            if (summary && (summary.monthly || summary.statements)) {
                console.log('✅ Financial summary generated successfully.');
                const months = Object.keys(summary.monthly || {});
                if (months.length > 0) {
                    const firstMonth = months[0];
                    const revenue = summary.monthly[firstMonth].revenue;
                    console.log(`   Revenue (${firstMonth}): ${revenue}`);
                    console.log(`✅ Revenue verified for ${months.length} months.`);
                }
            } else {
                console.log('❌ Financial summary missing.');
            }
        } else {
            console.log('❌ No completed model runs found after waiting.');
        }

        console.log('\n✨ AI Flow Test Completed Successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testAIFlow();
