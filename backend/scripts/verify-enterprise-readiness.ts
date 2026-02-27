
import { agentOrchestrator } from '../src/services/agents/agent-orchestrator.service';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '../src/config/database';
import { montecarloService } from '../src/services/montecarlo.service';

const ORG_ID = process.env.ORG_ID || '00000000-0000-0000-0000-000000000000';
const USER_ID = process.env.USER_ID || '00000000-0000-0000-0000-000000000000';

const ENTERPRISE_QUERIES = [
    "Why did we miss our revenue target? Show me the driver decomposition.",
    "If I manually increase the forecast by 20%, what specific SOX controls trigger?",
    "Run a Black Swan stress test and map it to our debt covenants policy.",
    "Show me the Monte Carlo distribution and scenario tree for our cash runway.",
    "Report the baseline Monte Carlo survival probability and include the paramsHash used."
];

async function runMonteCarloScenarioProof(orgId: string, userId: string, resultsPath: string) {
    const model = await prisma.model.findFirst({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, version: true, modelJson: true },
    });

    if (!model) {
        fs.appendFileSync(resultsPath, `\nMONTE CARLO PROOF:\nNo model found for org; cannot create Monte Carlo scenario.\n`);
        return;
    }

    // IMPORTANT: For proof, anchor Monte Carlo to a real completed model run that has summaryJson.
    // Creating an empty baseline modelRun (status=done but no summary) will make python-worker
    // fall back to optimistic defaults (e.g. $1,000,000 cash) and can yield survivalProbability=1.
    const modelRun = await prisma.modelRun.findFirst({
        where: {
            modelId: model.id,
            orgId,
            status: { in: ['done', 'completed'] },
            summaryJson: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
    });

    if (!modelRun) {
        fs.appendFileSync(resultsPath, `\nMONTE CARLO PROOF:\nNo completed model run with summaryJson found; cannot run a baseline-anchored Monte Carlo proof.\n`);
        return;
    }

    const summary: any = (await prisma.modelRun.findUnique({
        where: { id: modelRun.id },
        select: { summaryJson: true },
    }))?.summaryJson || {};

    const baselineCash = Number(summary.cashBalance ?? summary.initialCash ?? 0);
    const baselineRevenue = Number(summary.mrr ?? summary.monthlyRevenue ?? summary.revenue ?? 0);
    const baselineBurn = Number(summary.monthlyBurn ?? summary.burnRate ?? summary.expenses ?? summary.opex ?? 0);

    const opexPct = baselineRevenue > 0 ? Math.min(10, Math.max(0, baselineBurn / baselineRevenue)) : 0.3;

    // Use driver keys expected by python-worker's driver_mapping
    const drivers = {
        revenue_growth: { dist: 'normal', mean: 0.00, std: 0.01, min: -0.2, max: 0.2 },
        opex_percentage: { dist: 'normal', mean: opexPct, std: Math.max(0.05, opexPct * 0.05), min: 0.0, max: 10.0 },
    };

    // Approximate initial cash used by python-worker from model_json (it may otherwise default to 1,000,000)
    const modelJson: any = model.modelJson || {};
    const initialCashGuess = Number(modelJson.cash ?? modelJson.cashBalance ?? modelJson.initialCash ?? 1000000);
    const monthKey = new Date().toISOString().slice(0, 7);
    const capexToTargetCash = Math.max(0, initialCashGuess - Math.max(0, baselineCash));
    const overrides = capexToTargetCash > 0
        ? { [monthKey]: { capex: capexToTargetCash } }
        : {};

    const numSimulations = 2000;
    const randomSeed = 12349;
    const mode = 'full';

    const paramsHash = montecarloService.computeParamsHash({
        modelId: model.id,
        modelVersion: model.version || 1,
        drivers,
        overrides,
        numSimulations,
        randomSeed,
        mode,
    });

    let mcJob = await prisma.monteCarloJob.findFirst({
        where: { orgId, paramsHash },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true },
    });

    if (!mcJob) {
        const created = await montecarloService.createMonteCarloJob(
            model.id,
            modelRun.id,
            orgId,
            paramsHash,
            numSimulations,
            { drivers, overrides, randomSeed, mode }
        );
        mcJob = { id: created.monteCarloJobId, status: 'queued' };
    }

    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
        const row = await prisma.monteCarloJob.findUnique({
            where: { id: mcJob.id },
            select: { status: true },
        });
        if (row?.status === 'done') break;
        await new Promise(r => setTimeout(r, 2000));
    }

    let survivalProbability: any = null;
    let finalStatus: any = null;
    let heuristicSurvivalProbability: any = null;
    let usable: any = null;
    try {
        const result = await montecarloService.getMonteCarloResult(mcJob.id);
        survivalProbability = result.survivalProbability;
        finalStatus = result.status;

        const latestRun = await prisma.modelRun.findFirst({
            where: { orgId, status: { in: ['done', 'completed'] } },
            orderBy: { createdAt: 'desc' },
            select: { summaryJson: true },
        });
        const summary: any = latestRun?.summaryJson || {};
        const cashBalance = Number(summary.cashBalance ?? summary.initialCash ?? 0);
        const monthlyRevenue = Number(summary.mrr ?? summary.monthlyRevenue ?? summary.revenue ?? 0);
        const monthlyBurn = Number(summary.monthlyBurn ?? summary.burnRate ?? summary.expenses ?? summary.opex ?? 0);
        const netBurn = Math.max(monthlyBurn - monthlyRevenue, 0);
        const runwayMonths = netBurn > 0 ? cashBalance / netBurn : 24;
        heuristicSurvivalProbability = runwayMonths > 12 ? 0.95 : 0.78;
        usable = typeof survivalProbability === 'number' && Math.abs(survivalProbability - heuristicSurvivalProbability) <= 0.2;
    } catch (e: any) {
        finalStatus = 'error';
    }

    const proof = `\n================================================================================\nMONTE CARLO PROOF (python-worker)\norgId: ${orgId}\nuserId: ${userId}\nmodelId: ${model.id}\nmonteCarloJobId: ${mcJob.id}\nparamsHash: ${paramsHash}\nstatus: ${finalStatus}\nsurvivalProbability: ${survivalProbability}\nheuristicSurvivalProbability: ${heuristicSurvivalProbability}\nusable: ${usable}\n================================================================================\n`;
    fs.appendFileSync(resultsPath, proof);
}

async function runEnterpriseAudit() {
    console.log('--- STARTING ENTERPRISE READINESS AUDIT ---');
    console.log(`ORG_ID: ${ORG_ID}`);
    console.log(`USER_ID: ${USER_ID}`);
    const resultsPath = path.join(process.cwd(), 'enterprise-readiness-audit.txt');
    fs.writeFileSync(resultsPath, `ENTERPRISE READINESS AUDIT LOG\nTimestamp: ${new Date().toISOString()}\n\n`);

    try {
        await runMonteCarloScenarioProof(ORG_ID, USER_ID, resultsPath);
    } catch (e) {
        fs.appendFileSync(resultsPath, `\nMONTE CARLO PROOF:\nError creating or fetching Monte Carlo scenario.\n`);
    }

    for (const query of ENTERPRISE_QUERIES) {
        console.log(`Processing Enterprise Query: "${query}"...`);
        try {
            const result = await agentOrchestrator.processQuery(ORG_ID, USER_ID, query);
            const output = `
================================================================================
QUERY: ${query}
AGENT: ${result.agentType}
CONFIDENCE: ${(result.confidence * 100).toFixed(1)}%

ANSWER:
${result.answer}

DATA LINEAGE & METADATA:
${JSON.stringify(result.auditMetadata || {}, null, 2)}

POLICY MAPPING:
${JSON.stringify(result.policyMapping || [], null, 2)}

VARIANCE DRIVERS:
${JSON.stringify(result.varianceDrivers || [], null, 2)}

--------------------------------------------------------------------------------
`;
            fs.appendFileSync(resultsPath, output);
            console.log(`SUCCESS: ${query.slice(0, 30)}...`);
        } catch (error) {
            console.error(`ERROR: ${query}`, error);
        }
    }

    console.log(`--- AUDIT COMPLETE. RESULTS: ${resultsPath} ---`);
}

runEnterpriseAudit().catch(console.error);
