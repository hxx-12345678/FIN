import { PrismaClient } from '@prisma/client';
import { agentOrchestrator } from '../src/services/agents/agent-orchestrator.service';
import { AgentType, AgentResponse } from '../src/services/agents/agent-types';
import { z } from 'zod';

const prisma = new PrismaClient();
const orchestrator = agentOrchestrator;

const TARGET_EMAIL = 'cptjacksprw@gmail.com';
const LATENCY_THRESHOLD_MS = 10000; // 10s for LLM-based tasks is more realistic, but flagging if very high

// Zod Schema to ensure AgentResponse is structurally valid
const AgentResponseSchema = z.object({
  agentType: z.string(),
  taskId: z.string(),
  status: z.enum(['completed', 'failed', 'waiting_approval', 'warning']),
  answer: z.string(),
  confidence: z.number().min(0).max(1),
  thoughts: z.array(z.any()),
  dataSources: z.array(z.any()),
  calculations: z.record(z.string(), z.any()).optional(),
  recommendations: z.array(z.any()).optional(),
  executiveSummary: z.string().optional(),
  causalExplanation: z.string().optional()
});

async function injectAdversarialData(orgId: string) {
  console.log('\n☣️ Injecting Adversarial Data for Testing...');
  const now = new Date();
  
  // 1. Data Cleaning Nightmare (Invalid Date / Format)
  await prisma.rawTransaction.create({
    data: {
      orgId,
      date: new Date('2099-13-32T00:00:00.000Z').toString() === 'Invalid Date' ? new Date('2099-12-31') : new Date('2099-12-31'),
      amount: 5000,
      description: "Amázön Web Sèrvicés (AWS)",
      category: "IT_INFRA"
    }
  });

  // 2. Anomaly "Boiling Frog" (50 small increasing transactions)
  let amount = 10;
  for (let i = 0; i < 50; i++) {
    await prisma.rawTransaction.create({
      data: {
        orgId,
        date: new Date(now.getTime() - (50 - i) * 24 * 60 * 60 * 1000),
        amount: -(amount),
        description: "Consulting Retainer - Acme Corp",
        category: "PROF_SERVICES"
      }
    });
    amount += 0.50; // Increases by $0.50 a day
  }

  console.log('☣️ Adversarial Data Injected Successfully.');
}

async function cleanupAdversarialData(orgId: string) {
  console.log('\n🧹 Cleaning up Adversarial Data...');
  await prisma.rawTransaction.deleteMany({
    where: {
      orgId,
      OR: [
        { date: { gte: new Date('2099-01-01') } },
        { description: "Consulting Retainer - Acme Corp" }
      ]
    }
  });
  console.log('🧹 Cleanup Complete.');
}

async function runUltimateStressTest() {
  console.log('===========================================================');
  console.log('🚀 FINAPILOT ADVERSARIAL STRESS TEST SUITE (13 AGENTS)');
  console.log('===========================================================');

  const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL }, include: { roles: true } });
  if (!user || user.roles.length === 0) {
    console.error(`❌ FATAL: User ${TARGET_EMAIL} not found in database.`);
    process.exit(1);
  }

  const orgId = user.roles[0].orgId;
  const userId = user.id;
  console.log(`✅ Authenticated Target: ${user.email} | Org: ${orgId}`);

  await injectAdversarialData(orgId);

  const testCases: { agent: AgentType; name: string; query: string; intent?: string; entities?: any; allowNegative?: boolean; validation: (res: AgentResponse) => string[] }[] = [
    {
      agent: 'risk_compliance',
      name: 'Risk & Compliance - The Macro Clash Paradox',
      query: 'Run a stress test where Inflation is 15% but Interest Rates are capped at 0.5% by government mandate.',
      validation: (res) => {
        const errors = [];
        const answer = res.answer.toLowerCase();
        if (!answer.includes('macro') && !answer.includes('imbalance') && !answer.includes('invalid') && !answer.includes('risk')) {
          errors.push('Did not flag macro-economic imbalance or paradoxical conditions.');
        }
        return errors;
      }
    },
    {
      agent: 'variance_analysis',
      name: 'Variance Analysis - The Reclassification',
      query: 'Explain the gross margin expansion after moving $1M from COGS to OpEx mid-quarter.',
      validation: (res) => {
        const errors = [];
        const ans = res.answer.toLowerCase();
        if (!ans.includes('structural') && !ans.includes('accounting') && !ans.includes('reclassification')) {
          errors.push('Failed to identify structural variance/reclassification instead of performance variance.');
        }
        return errors;
      }
    },
    {
      agent: 'financial_modeling',
      name: 'Financial Modeling - The Negative Growth Trap',
      query: 'Input a 3-year forecast where revenue declines 90% YoY but headcount remains flat.',
      validation: (res) => {
        const errors = [];
        const ans = res.answer.toLowerCase();
        if (!ans.includes('going concern') && !ans.includes('liquidity') && !ans.includes('negative')) {
          errors.push('Failed to flag going concern or liquidity warning for extreme decay.');
        }
        return errors;
      }
    },
    {
      agent: 'reporting',
      name: 'Reporting - The Data Contradiction',
      query: 'Summarize the board narrative. The summary says $10M revenue but the transaction ledger sums to $9.2M.',
      validation: (res) => {
        const errors = [];
        const ans = res.answer.toLowerCase();
        if (!ans.includes('mismatch') && !ans.includes('discrepancy') && !ans.includes('integrity') && !ans.includes('variance')) {
          errors.push('Failed to flag data integrity mismatch between summary and ledger.');
        }
        return errors;
      }
    },
    {
      agent: 'market_monitoring',
      name: 'Market Monitoring - The Delayed Correlation',
      query: 'Analyze the impact of a 20% spike in Lithium prices on our SaaS company bottom line.',
      validation: (res) => {
        const errors = [];
        const ans = res.answer.toLowerCase();
        if (!ans.includes('no direct exposure') && !ans.includes('indirect') && !ans.includes('hardware')) {
          errors.push('Failed to identify lack of direct correlation or secondary effects.');
        }
        return errors;
      }
    },
    {
      agent: 'resource_allocation',
      name: 'Resource Allocation - The Impossible Constraint',
      query: 'Allocate $1M budget to 5 departments, each requiring a minimum of $300k to function.',
      validation: (res) => {
        const errors = [];
        const ans = res.answer.toLowerCase();
        if (!ans.includes('failure') && !ans.includes('impossible') && !ans.includes('exceeds') && !ans.includes('prioritize')) {
          errors.push('Agent allocated blindly instead of failing on impossible constraint ($1.5M required vs $1M available).');
        }
        return errors;
      }
    },
    {
      agent: 'data_cleaning',
      name: 'Data Cleaning - The "Garbage In" Test',
      query: 'Clean the ledger. We have dates like "Yesterday" and "2099-12-31" and duplicates of AWS and Amázön Web Sèrvicés.',
      validation: (res) => {
        const errors = [];
        const ans = res.answer.toLowerCase();
        if (!ans.includes('quarantine') && !ans.includes('invalid') && !ans.includes('normalize') && !ans.includes('map')) {
          errors.push('Failed to quarantine invalid dates or handle unicode normalizations.');
        }
        return errors;
      }
    },
    {
      agent: 'scenario_planning',
      name: 'Scenario Planning - The Fat Tail',
      query: 'Run a Monte Carlo simulation for a startup but set the Standard Deviation to 500%.',
      allowNegative: true,
      validation: (res) => {
        const errors = [];
        const ans = res.answer.toLowerCase();
        if (!ans.includes('power law') && !ans.includes('fat tail') && !ans.includes('extreme') && !ans.includes('unreliable')) {
          errors.push('Failed to warn about extreme distribution shapes and reliability.');
        }
        return errors;
      }
    },
    {
      agent: 'cash_flow',
      name: 'Cash Flow - The Zero Runway',
      query: 'Simulate a scenario where all AR (Accounts Receivable) is delayed by 180 days starting today.',
      validation: (res) => {
        const errors = [];
        const ans = res.answer.toLowerCase();
        if (!ans.includes('insolvency') && !ans.includes('zero') && !ans.includes('liquidity crisis') && !ans.includes('shortfall')) {
          errors.push('Agent did not trigger immediate insolvency/liquidity alert.');
        }
        return errors;
      }
    },
    {
      agent: 'circular_logic',
      name: 'Circular Logic - The Triple Loop',
      query: 'Resolve loop: Interest depends on Debt; Debt depends on Cash Flow; Cash Flow depends on Tax; Tax depends on Interest.',
      validation: (res) => {
        const errors = [];
        const ans = res.answer.toLowerCase();
        if (!ans.includes('divergent') && !ans.includes('plug') && !ans.includes('non-convergent') && !ans.includes('break')) {
          errors.push('Failed to identify divergent loop or suggest a hard-coded plug.');
        }
        return errors;
      }
    },
    {
      agent: 'audit_provenance',
      name: 'Audit & Provenance - The Man-in-the-Middle',
      query: 'Who changed cell B12 directly in the SQL database, bypassing the UI?',
      validation: (res) => {
        const errors = [];
        const ans = res.answer.toLowerCase();
        if (!ans.includes('unauthorized') && !ans.includes('external') && !ans.includes('missing') && !ans.includes('compromised')) {
          errors.push('Agent did not flag unauthorized/external change or missing log.');
        }
        return errors;
      }
    },
    {
      agent: 'anomaly_detection',
      name: 'Anomaly Detection - The "Boiling Frog"',
      query: 'Analyze the last 50 days of "Consulting Retainer - Acme Corp". The theft increases by $0.50 every day.',
      validation: (res) => {
        const errors = [];
        const ans = res.answer.toLowerCase();
        if (!ans.includes('drift') && !ans.includes('systemic') && !ans.includes('pattern') && !ans.includes('incremental')) {
          errors.push('Agent failed to detect statistical drift/trend over time.');
        }
        return errors;
      }
    },
    {
      agent: 'spend_control',
      name: 'Spend Control - The Ghost Subscription',
      query: 'Analyze OpEx for multiple $9.99 charges to Meta, Facebook, and Instagram. Normalise any massive annual contracts.',
      validation: (res) => {
        const errors = [];
        const ans = res.answer.toLowerCase();
        if (!ans.includes('conglomerate') && !ans.includes('meta') && !ans.includes('normalize') && !ans.includes('single vendor')) {
          errors.push('Failed to identify conglomerate vendor concentration risk or normalize annual contracts.');
        }
        return errors;
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    console.log(`\n🧪 Testing Agent: [${tc.name}]`);
    console.log(`   Query: "${tc.query}"`);
    
    try {
      const startTime = Date.now();
      const response = await orchestrator.processQuery(orgId, userId, tc.query, {
        intent: tc.intent,
        entities: tc.entities
      });
      const latency = Date.now() - startTime;

      // 1. Zod Schema Validation
      const schemaCheck = AgentResponseSchema.safeParse(response);
      if (!schemaCheck.success) {
        throw new Error(`Schema Validation Failed: ${schemaCheck.error.message}`);
      }

      // 2. Latency Threshold Validation
      if (latency > LATENCY_THRESHOLD_MS) {
         console.log(`   ⚠️ WARNING: Latency too high (${latency}ms). Target is sub-${LATENCY_THRESHOLD_MS}ms.`);
      }

      // 3. Logic Validation Closure
      const validationErrors = tc.validation(response);
      
      if (validationErrors.length > 0) {
         failed++;
         console.log(`   ❌ FAIL | Logic Validation Errors:`);
         validationErrors.forEach(err => console.log(`      - ${err}`));
         console.log(`      Response: ${response.answer.substring(0, 150)}...`);
      } else {
         passed++;
         console.log(`   ✅ PASS | Latency: ${latency}ms | Confidence: ${(response.confidence * 100).toFixed(1)}%`);
      }

    } catch (err: any) {
      failed++;
      console.error(`   ❌ FAIL | Exception: ${err.message}`);
    }
  }

  // Bonus Stress: Empty Data Hallucination Check
  console.log(`\n🧪 Testing Bonus Stress: [Empty Data Hallucination Check]`);
  try {
     const emptyCheck = await orchestrator.processQuery(orgId, userId, "Show me my revenue", { mockEmpty: true });
     if (emptyCheck.answer.includes("85000") || emptyCheck.answer.includes("200000") || emptyCheck.status === 'failed') {
        console.log(`   ❌ FAIL: Agent hallucinated hardcoded data in an empty state or crashed!`);
        failed++;
     } else {
        console.log(`   ✅ PASS: Handled empty state gracefully without hallucinating fallback integers.`);
     }
  } catch(e) {
     console.log(`   ❌ FAIL: Crash during empty state check`);
  }

  await cleanupAdversarialData(orgId);

  console.log('\n===========================================================');
  console.log(`🏁 ADVERSARIAL STRESS TEST COMPLETE`);
  console.log(`📈 Passed: ${passed}/${testCases.length}`);
  console.log(`📉 Failed: ${failed}/${testCases.length}`);
  console.log('===========================================================');
}

runUltimateStressTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
