
import { agentOrchestrator } from '../src/services/agents/agent-orchestrator.service';
import * as fs from 'fs';
import * as path from 'path';

const ORG_ID = 'e4711415-1ae2-4b91-99d8-6e3e4606107e';
const USER_ID = 'bae091b3-e028-4745-81ec-bee46f5e8d68';

const QUERIES = [
    "How accurate have your forecasts been in the last 12 months? Show MAPE, bias, and confidence calibration.",
    "What percentage of our costs are fixed vs variable, and what happens if we need to cut burn by 25%?",
    "Simulate a black swan event: 50% revenue drop + 2x churn + interest rate up 300bps. Do we breach covenants?",
    "Did our business model structurally change in the last 6 months?",
    "What happens if our largest customer leaves tomorrow?",
    "If customers pay 30 days slower, what happens to cash?",
    "How much can we increase price before churn erases margin gain?",
    "If I manually increase revenue forecast by 20%, what controls trigger?"
];

async function runTests() {
    console.log('--- STARTING HIGH-PRECISION GEMINI 2.5 FLASH AUDIT ---');
    const resultsPath = path.join(process.cwd(), 'results-verification-audit-v2.5.txt');
    fs.writeFileSync(resultsPath, `AI CFO AUDIT LOG - GEMINI 2.5 FLASH\nTimestamp: ${new Date().toISOString()}\n\n`);

    for (let i = 0; i < QUERIES.length; i++) {
        const query = QUERIES[i];
        console.log(`[${i + 1}/${QUERIES.length}] Processing: "${query}"... (This may take several minutes for deep reasoning)`);

        try {
            const startTime = Date.now();
            const result = await agentOrchestrator.processQuery(ORG_ID, USER_ID, query);
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);

            const output = `
================================================================================
QUERY: ${query}
DURATION: ${duration}s
STATUS: ${result.status}
AGENT: ${result.agentType}
CONFIDENCE: ${(result.confidence * 100).toFixed(1)}%

ANSWER:
${result.answer}

THOUGHTS:
${JSON.stringify(result.thoughts, null, 2)}

--------------------------------------------------------------------------------
`;
            fs.appendFileSync(resultsPath, output);
            console.log(`[${i + 1}/${QUERIES.length}] SUCCESS | Status: ${result.status} | Time: ${duration}s`);
        } catch (error) {
            console.error(`[${i + 1}/${QUERIES.length}] ERROR:`, error);
            fs.appendFileSync(resultsPath, `\nERROR testing query: ${query}\n${error}\n`);
        }
    }

    console.log(`\n--- ALL TESTS COMPLETE. RESULTS SAVED TO: ${resultsPath} ---`);
}

runTests().catch(console.error);
