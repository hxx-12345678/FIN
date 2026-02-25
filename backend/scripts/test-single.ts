
import { agentOrchestrator } from '../src/services/agents/agent-orchestrator.service';
import * as fs from 'fs';
import * as path from 'path';

const ORG_ID = 'e4711415-1ae2-4b91-99d8-6e3e4606107e';
const USER_ID = 'bae091b3-e028-4745-81ec-bee46f5e8d68';

const QUERIES = [
    "How accurate have your forecasts been in the last 12 months? Show MAPE, bias, and confidence calibration."
];

async function runTests() {
    console.log('--- STARTING SINGLE QUERY TEST ---');
    for (const query of QUERIES) {
        console.log(`\nTesting Query: "${query}"`);
        try {
            const result = await agentOrchestrator.processQuery(ORG_ID, USER_ID, query);
            console.log('RESULT STATUS:', result.status);
            console.log('ANSWER PREVIEW:', result.answer.substring(0, 200));
        } catch (error) {
            console.error('ERROR:', error);
        }
    }
}

runTests().catch(console.error);
