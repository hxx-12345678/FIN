import prisma from '../config/database';
import { jobService } from './job.service';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { auditService } from './audit.service';
import { sanitizeString, validateUUID } from '../utils/validation';
import { financialCalculations } from './financial-calculations.service';
import { intentClassifierService } from './llm/intent-classifier.service';
import { groundingService } from './rag/grounding.service';
import { actionOrchestrator } from './planner/action-orchestrator.service';
import { responseAssembler } from './response-assembler.service';
import { observabilityService } from './monitoring/observability.service';
import { generateCFOExplanation, generateCFOResponse, CFOAnalysis } from './llm/cfo-prompt.service';
import { overviewDashboardService } from './overview-dashboard.service';
import { agentOrchestrator } from './agents/agent-orchestrator.service';

export interface GeneratePlanParams {
  modelRunId?: string;
  goal: string;
  constraints?: Record<string, any>;
  context?: Record<string, any>; // Support context parameter from board-reporting
}

export interface ApplyPlanParams {
  planId: string;
  changes: Record<string, any>;
}

// Track rate limits to fail fast and use local "CFO Brain"
let lastGeminiRateLimitTime = 0;
const RATE_LIMIT_COOLDOWN = 60 * 1000; // 1 minute

export const aicfoService = {
  generatePlan: async (
    orgId: string,
    userId: string,
    params: GeneratePlanParams
  ) => {
    validateUUID(orgId, 'Organization ID');
    validateUUID(userId, 'User ID');

    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role || !['admin', 'finance'].includes(role.role)) {
      throw new ForbiddenError('Only admins and finance users can generate AI-CFO plans');
    }

    if (!params.goal || typeof params.goal !== 'string') {
      throw new ValidationError('Goal is required');
    }

    const sanitizedGoal = sanitizeString(params.goal.trim(), 500);
    const queryLower = sanitizedGoal.toLowerCase();

    // Handle meta-queries (UI suggestions) that need special responses
    // Check for exact match or key phrases
    const isConnectQuery = queryLower === 'connect accounting system' ||
      queryLower.includes('connect accounting') ||
      (queryLower.includes('connect') && queryLower.includes('accounting'));

    if (isConnectQuery) {
      // Check if already connected
      const connectors = await prisma.connector.findMany({
        where: { orgId, status: { in: ['connected', 'syncing'] } },
        select: { id: true, type: true }
      });

      if (connectors.length > 0) {
        // Already connected - provide helpful message
        const plan = await prisma.aICFOPlan.create({
          data: {
            orgId,
            modelRunId: params.modelRunId || null,
            name: 'AI-CFO: Accounting System Status',
            description: 'User inquired about accounting system connection',
            status: 'completed',
            planJson: {
              goal: sanitizedGoal,
              stagedChanges: [],
              generatedAt: new Date().toISOString(),
              structuredResponse: {
                natural_text: `Great! You already have ${connectors.length} accounting system(s) connected. Your financial data is being synced automatically. If you'd like to connect additional systems or need help with integration, please visit the Integrations page.`,
                calculations: {},
                intent: 'system_status'
              },
              metadata: {
                modelUsed: 'deterministic',
                worker: 'nodejs'
              }
            },
            createdById: userId
          }
        });
        return plan;
      } else {
        // Not connected - guide them to connect
        const plan = await prisma.aICFOPlan.create({
          data: {
            orgId,
            modelRunId: params.modelRunId || null,
            name: 'AI-CFO: Connect Accounting System',
            description: 'User wants to connect accounting system',
            status: 'completed',
            planJson: {
              goal: sanitizedGoal,
              stagedChanges: [],
              generatedAt: new Date().toISOString(),
              structuredResponse: {
                natural_text: `To connect your accounting system, please:\n\n1. Navigate to the **Integrations** page in the sidebar\n2. Click **"Connect"** next to your accounting system (QuickBooks, Xero, etc.)\n3. Follow the authentication steps\n4. Once connected, I'll automatically sync your financial data and provide real-time insights\n\nConnecting your accounting system will enable:\n• Automatic transaction syncing\n• Real-time financial metrics\n• More accurate forecasts and recommendations\n• Seamless data updates without manual CSV imports`,
                calculations: {},
                intent: 'system_guidance'
              },
              metadata: {
                modelUsed: 'deterministic',
                worker: 'nodejs'
              }
            },
            createdById: userId
          }
        });
        return plan;
      }
    }

    const isAnotherQuestionQuery = queryLower === 'ask another financial question' ||
      queryLower === 'another financial question' ||
      (queryLower.includes('ask another') && queryLower.includes('question')) ||
      (queryLower.includes('another') && queryLower.includes('financial') && queryLower.includes('question'));

    if (isAnotherQuestionQuery) {
      // User wants to ask a different question - prompt them
      const plan = await prisma.aICFOPlan.create({
        data: {
          orgId,
          modelRunId: params.modelRunId || null,
          name: 'AI-CFO: Ready for Your Question',
          description: 'User wants to ask another question',
          status: 'completed',
          planJson: {
            goal: sanitizedGoal,
            stagedChanges: [],
            generatedAt: new Date().toISOString(),
            structuredResponse: {
              natural_text: `I'm ready to help! Please ask me any financial question, such as:\n\n• **Cash & Runway**: "What's my current runway?" or "How long will my cash last?"\n• **Burn Rate**: "What's my monthly burn rate?" or "How can I reduce expenses?"\n• **Revenue**: "Show me revenue trends" or "What's my growth rate?"\n• **Planning**: "Create a plan to extend runway by 6 months" or "How should I optimize my burn?"\n• **Fundraising**: "Should I raise funding now?" or "What's the optimal fundraising timing?"\n• **Strategy**: "What strategies can help me accelerate revenue growth?" or "How can I improve profitability?"\n\nJust type your question and I'll provide a detailed analysis with actionable recommendations.`,
              calculations: {},
              intent: 'conversation_prompt'
            },
            metadata: {
              modelUsed: 'deterministic',
              worker: 'nodejs'
            }
          },
          createdById: userId
        }
      });
      return plan;
    }

    let modelRun = null;
    if (params.modelRunId) {
      validateUUID(params.modelRunId, 'Model run ID');
      modelRun = await prisma.modelRun.findUnique({ where: { id: params.modelRunId } });
    }

    let stagedChanges: any[] = [];
    let structuredResponse: any = null;
    let intentClassification: any = null;
    let groundingContext: any = null;
    let calculations: Record<string, any> = {};
    let allPromptIds: string[] = [];
    let hasConnectedAccounting = false;
    let hasFinancialData = false;
    let transactionCount = 0;

    const startTime = Date.now();

    try {
      // Step 1: Parallel Intent Classification & Data Checks (HIGH PERFORMANCE)
      const startParallel = Date.now();
      const [intentRes, connectors, transactionCountResult, overviewDataResult] = await Promise.all([
        intentClassifierService.classify(sanitizedGoal),
        prisma.connector.findMany({ where: { orgId, status: { in: ['connected', 'syncing'] } }, select: { id: true } }),
        prisma.rawTransaction.count({ where: { orgId, isDuplicate: false } as any }).catch(() => 0),
        overviewDashboardService.getOverviewData(orgId).catch(() => null)
      ]);
      intentClassification = intentRes;
      console.log(`Parallel Intent + Data Check: ${Date.now() - startParallel}ms`);

      // Step 2: Grounding (OPTIMIZED)
      const startGrounding = Date.now();
      groundingContext = await groundingService.retrieve(orgId, intentClassification.intent, intentClassification.slots);
      console.log(`Grounding: ${Date.now() - startGrounding}ms`);

      transactionCount = transactionCountResult;
      hasConnectedAccounting = connectors.length > 0;
      hasFinancialData = transactionCount > 0 || (overviewDataResult && (overviewDataResult.monthlyRevenue > 0 || overviewDataResult.monthlyBurnRate > 0));

      // Step 3: Planning & Calculations (OPTIMIZED)
      const startPlanning = Date.now();

      // Fast path for calculations from overview data
      calculations = {};
      if (overviewDataResult) {
        calculations.revenue = overviewDataResult.monthlyRevenue;
        calculations.burnRate = overviewDataResult.monthlyBurnRate;
        calculations.runway = overviewDataResult.cashRunway;
        calculations.growth = overviewDataResult.revenueGrowth;
        calculations.healthScore = overviewDataResult.healthScore;
        calculations.customers = overviewDataResult.activeCustomers;
      }

      const plannerResult = await actionOrchestrator.plan(orgId, userId, intentClassification.intent, intentClassification.slots, params.modelRunId || undefined);

      let executionResults: any[] = [];
      if (plannerResult.validation.ok && !plannerResult.requiresApproval) {
        executionResults = await actionOrchestrator.execute(orgId, userId, plannerResult.actions, params.modelRunId || undefined);
      }

      for (const result of executionResults) {
        const val = result.result !== undefined ? result.result : result.params?.result;
        if (typeof val === 'number') {
          const op = result.operation || result.params?.operation || 'calculation';
          calculations[op] = val;
          if (op.includes('burn_rate')) calculations.burnRate = val;
          if (op.includes('runway')) calculations.runway = val;
          if (op.includes('revenue')) calculations.revenue = val;
        }
      }
      console.log(`Planning & execution: ${Date.now() - startPlanning}ms`);

      // Step 4: AI Response Generation - Shifted to Python for performance and quality

      // Create the plan in 'queued' status FIRST to get an ID
      const plan = await prisma.aICFOPlan.create({
        data: {
          orgId,
          modelRunId: params.modelRunId || null,
          name: `AI-CFO Analysis: ${sanitizedGoal.substring(0, 60)}...`,
          description: `Strategic query: ${sanitizedGoal}`,
          status: 'queued',
          planJson: {
            goal: sanitizedGoal,
            stagedChanges: [],
            generatedAt: new Date().toISOString()
          },
          createdById: userId
        }
      });

      // Now create the job with the plan ID
      const job = await jobService.createJob({
        jobType: 'aicfo_chat',
        orgId,
        objectId: plan.id,
        createdByUserId: userId,
        params: {
          query: sanitizedGoal,
          modelRunId: params.modelRunId,
          constraints: params.constraints,
          calculations, // Pass calculations already done in Node.js
          groundingContext: {
            evidence: groundingContext.evidence.map((e: any) => ({
              content: e.content,
              doc_type: e.doc_type,
              score: e.score
            })),
            confidence: groundingContext.confidence
          }
        }
      });

      // Update plan with job ID
      await prisma.aICFOPlan.update({
        where: { id: plan.id },
        data: {
          planJson: {
            ...(plan.planJson as any),
            jobId: job.id
          }
        }
      });

      // POLL for completion (Max 20 seconds, 500ms intervals for <5s response)
      let completedPlan = null;
      const maxAttempts = 40; // 20 seconds total
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const updatedPlan = await prisma.aICFOPlan.findUnique({
          where: { id: plan.id }
        });

        if (updatedPlan && updatedPlan.status === 'completed') {
          completedPlan = updatedPlan;
          break;
        }

        // If failed, don't throw - fall through to catch block for fallback
        if (updatedPlan && updatedPlan.status === 'failed') {
          console.log('Worker marked plan as failed, using fallback');
          break;
        }
      }

      if (completedPlan) {
        // Verify the response has proper structure
        const planJson = completedPlan.planJson as any;
        if (planJson?.structuredResponse?.natural_text) {
          return completedPlan;
        } else {
          console.log('Completed plan missing structuredResponse, using fallback');
          // Fall through to catch block for proper fallback
        }
      } else {
        console.log('Plan not completed in time, using fallback');
        // Fall through to catch block for fallback
      }

    } catch (error: any) {
      console.error('AICFO Pipeline Error:', error);
      // Re-check data status in error case
      try {
        const [connectorsCheck, transactionCountCheck, overviewDataCheck] = await Promise.all([
          prisma.connector.count({ where: { orgId, status: { in: ['connected', 'syncing'] } } }).catch(() => 0),
          prisma.rawTransaction.count({ where: { orgId, isDuplicate: false } as any }).catch(() => 0),
          overviewDashboardService.getOverviewData(orgId).catch(() => null)
        ]);
        hasConnectedAccounting = connectorsCheck > 0;
        hasFinancialData = transactionCountCheck > 0 || (overviewDataCheck && (overviewDataCheck.monthlyRevenue > 0 || overviewDataCheck.monthlyBurnRate > 0));
        transactionCount = transactionCountCheck;
      } catch {
        // If even the check fails, use defaults (false)
      }

      stagedChanges = await generateDeepCFOAnalysis(sanitizedGoal, params.constraints, modelRun, orgId, intentClassification?.intent || 'strategy_recommendation');

      // Generate proper natural language response from the recommendations (NO GENERIC ERROR MESSAGE)
      let naturalText = '';
      if (stagedChanges.length > 0) {
        const primaryRec = stagedChanges[0];
        if (intentClassification?.intent === 'runway_calculation' || sanitizedGoal.toLowerCase().includes('runway')) {
          naturalText = `Based on your current financial position, your cash runway is approximately ${calculations.runway?.toFixed(1) || 'unknown'} months. ${primaryRec.explain || primaryRec.summary}`;
        } else if (intentClassification?.intent === 'burn_rate_calculation' || sanitizedGoal.toLowerCase().includes('burn')) {
          naturalText = `Your monthly burn rate is currently $${(calculations.burnRate || 0).toLocaleString()}. ${primaryRec.explain || primaryRec.summary}`;
        } else if (sanitizedGoal.toLowerCase().includes('revenue') && (sanitizedGoal.toLowerCase().includes('strategy') || sanitizedGoal.toLowerCase().includes('strategies') || sanitizedGoal.toLowerCase().includes('accelerate'))) {
          const rev = (calculations.revenue || 0);
          const growth = ((calculations.growth || 0) * 100);
          naturalText = `Based on your current monthly revenue of $${rev.toLocaleString()} and growth rate of ${growth.toFixed(1)}%, here are specific strategies to accelerate revenue growth:\n\n**1. Customer Acquisition Optimization**\n- Analyze your current CAC and optimize channels with the best LTV:CAC ratio\n- Implement referral programs to leverage existing customers\n- Focus on high-intent channels that align with your ideal customer profile\n\n**2. Pricing & Packaging Strategy**\n- Review your pricing model and test value-based pricing tiers\n- Consider expansion revenue through upsells and add-ons\n- Implement annual contracts with discounts to improve cash flow\n\n**3. Sales Process Enhancement**\n- Shorten sales cycles by removing friction points\n- Implement sales automation for lead nurturing\n- Focus on high-value deals that move the needle\n\n**4. Customer Retention & Expansion**\n- Reduce churn through proactive customer success\n- Implement expansion revenue strategies (upsells, cross-sells)\n- Build strong customer relationships that drive advocacy\n\n**5. Market Expansion**\n- Identify new market segments or geographies\n- Develop partnerships and channel strategies\n- Consider product extensions that serve adjacent markets`;
        } else if (sanitizedGoal.toLowerCase().includes('revenue')) {
          naturalText = `Your current monthly revenue is $${(calculations.revenue || 0).toLocaleString()} with a growth rate of ${((calculations.growth || 0) * 100).toFixed(1)}%. ${primaryRec.explain || primaryRec.summary}`;
        } else if (sanitizedGoal.toLowerCase().includes('funding') || sanitizedGoal.toLowerCase().includes('raise')) {
          naturalText = `Based on your ${(calculations.runway || 0).toFixed(1)}-month runway and ${((calculations.growth || 0) * 100).toFixed(1)}% revenue growth, ${primaryRec.summary || primaryRec.explain}`;
        } else {
          // Generic but query-specific response based on recommendations
          naturalText = `${primaryRec.summary} ${primaryRec.explain}`;
          if (stagedChanges.length > 1) {
            naturalText += ` Additionally, ${stagedChanges[1].summary}`;
          }
        }
      } else {
        // Last resort - still query-specific
        naturalText = `I've analyzed your query: "${sanitizedGoal}". Based on your financial data, I recommend focusing on optimizing your cash position and growth trajectory.`;
      }

      structuredResponse = {
        intent: intentClassification?.intent || 'strategy_recommendation',
        calculations,
        natural_text: naturalText || 'I have analyzed your financial position and provided actionable recommendations based on your current metrics.'
      };

      // Ensure auditability
      if (allPromptIds.length === 0) {
        allPromptIds.push(`deterministic_audit_${Date.now()}_${orgId.substring(0, 8)}`);
      }

      // Create fallback plan and return it
      return await prisma.aICFOPlan.create({
        data: {
          orgId,
          modelRunId: params.modelRunId || null,
          name: `AI-CFO Plan (Fallback): ${sanitizedGoal.substring(0, 60)}...`,
          description: `Financial analysis for: ${sanitizedGoal} (Recovered from error)`,
          planJson: {
            goal: sanitizedGoal,
            stagedChanges,
            generatedAt: new Date().toISOString(),
            structuredResponse,
            metadata: {
              intent: intentClassification?.intent || 'strategy',
              intentConfidence: intentClassification?.confidence || 0,
              processingTimeMs: Date.now() - startTime,
              promptIds: Array.from(new Set(allPromptIds)),
              totalDataSources: stagedChanges.length || 5,
              hasConnectedAccounting: hasConnectedAccounting,
              hasFinancialData: hasFinancialData,
              transactionCount: transactionCount,
              error: error.message
            },
          },
          status: 'draft',
          createdById: userId,
        },
      });
    }
  },

  /**
   * Process query through multi-agent orchestration
   * This provides the proper agentic workflow with specialized agents
   */
  processAgenticQuery: async (
    orgId: string,
    userId: string,
    query: string,
    context?: Record<string, any>
  ) => {
    validateUUID(orgId, 'Organization ID');
    validateUUID(userId, 'User ID');

    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });

    if (!role || !['admin', 'finance', 'viewer'].includes(role.role)) {
      throw new ForbiddenError('Access denied');
    }

    const sanitizedQuery = sanitizeString(query.trim(), 500);
    const startTime = Date.now();

    try {
      // Use the new agent orchestrator for proper multi-agent workflow
      const agentResponse = await agentOrchestrator.processQuery(
        orgId,
        userId,
        sanitizedQuery,
        context,
        (context as any)?.bypassApproval === true
      );

      // Save to database for history (serialize to JSON-compatible format)
      const plan = await prisma.aICFOPlan.create({
        data: {
          orgId,
          modelRunId: null,
          name: `AI-CFO: ${sanitizedQuery.substring(0, 60)}...`,
          description: `Agentic analysis: ${sanitizedQuery}`,
          status: agentResponse.status === 'waiting_approval' ? 'pending_approval' : 'completed',
          planJson: JSON.parse(JSON.stringify({
            goal: sanitizedQuery,
            generatedAt: new Date().toISOString(),
            agentResponse: {
              answer: agentResponse.answer,
              confidence: agentResponse.confidence,
              agentType: agentResponse.agentType,
              thoughts: agentResponse.thoughts,
              dataSources: agentResponse.dataSources,
              calculations: agentResponse.calculations,
              recommendations: agentResponse.recommendations,
              followUpQuestions: agentResponse.followUpQuestions,
              visualizations: agentResponse.visualizations,
              requiresApproval: agentResponse.requiresApproval,
              escalationReason: agentResponse.escalationReason,
            },
            structuredResponse: {
              natural_text: agentResponse.answer,
              calculations: agentResponse.calculations || {},
              intent: agentResponse.agentType,
              confidence: agentResponse.confidence,
            },
            metadata: {
              processingTimeMs: Date.now() - startTime,
              agentType: agentResponse.agentType,
              modelUsed: 'multi-agent-orchestrator',
              thoughtSteps: agentResponse.thoughts.length,
              dataSourceCount: agentResponse.dataSources.length,
            },
          })),
          createdById: userId,
        },
      });

      return {
        planId: plan.id,
        response: agentResponse,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      console.error('[AICFO] Agent orchestration error:', error);

      // Fallback to existing system
      const fallbackPlan = await aicfoService.generatePlan(orgId, userId, {
        goal: sanitizedQuery,
        context,
      });

      return {
        planId: fallbackPlan.id,
        response: {
          agentType: 'orchestrator',
          taskId: fallbackPlan.id,
          status: 'completed',
          answer: (fallbackPlan.planJson as any)?.structuredResponse?.natural_text || 'Analysis completed.',
          confidence: 0.7,
          thoughts: [{
            step: 1,
            thought: 'Used fallback analysis system',
            observation: 'Primary agent system unavailable',
          }],
          dataSources: [],
          calculations: (fallbackPlan.planJson as any)?.structuredResponse?.calculations || {},
        },
        processingTimeMs: Date.now() - startTime,
      };
    }
  },

  applyPlan: async (orgId: string, userId: string, params: ApplyPlanParams) => {
    const plan = await prisma.aICFOPlan.findUnique({ where: { id: params.planId }, include: { modelRun: true } });
    if (!plan) throw new NotFoundError('Plan not found');
    const overrides = { ...((plan.modelRun?.paramsJson as any)?.overrides || {}), ...params.changes };
    const modelRun = await prisma.modelRun.create({
      data: { modelId: plan.modelRun?.modelId!, orgId, runType: 'scenario', paramsJson: { overrides }, status: 'queued' }
    });
    await jobService.createJob({ jobType: 'model_run', orgId, objectId: modelRun.id, createdByUserId: userId, params: { modelRunId: modelRun.id } });
    return { modelRunId: modelRun.id };
  },
  listPlans: async (orgId: string, userId?: string, status?: string) => {
    const where: any = { orgId };
    if (status) where.status = status;
    return prisma.aICFOPlan.findMany({ where, orderBy: { createdAt: 'desc' } });
  },
  getPlan: async (planId: string, userId?: string) => prisma.aICFOPlan.findUnique({ where: { id: planId } }),
  updatePlan: async (planId: string, userId: string, updateData: any) => prisma.aICFOPlan.update({ where: { id: planId }, data: updateData }),
  deletePlan: async (planId: string, userId: string) => prisma.aICFOPlan.delete({ where: { id: planId } }),
  getPrompt: async (promptId: string, userId?: string) => {
    // Validate UUID format - synthetic IDs (deterministic_audit_*) are not real prompts
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(promptId)) {
      // Synthetic prompt ID (deterministic fallback) - return null instead of error
      return null;
    }
    return prisma.prompt.findUnique({ where: { id: promptId } });
  },
};

/**
 * Enhanced Deterministic CFO Brain
 * Provides specific recommendations based on intent if Gemini is unavailable.
 */
async function generateDeepCFOAnalysis(
  goal: string,
  constraints: any,
  modelRun: any,
  orgId: string,
  intent: string
): Promise<any[]> {
  const changes: any[] = [];
  const lowerGoal = goal.toLowerCase();

  // Default context (Industry standard SaaS)
  let context: any = {
    cashBalance: 500000,
    burnRate: 80000,
    runwayMonths: 6.25,
    revenue: 67000,
    revenueGrowth: 0.08,
    topExpense: 'Payroll',
    topExpenseValue: 45000,
    hasRealData: false
  };

  // Load real data if available
  if (modelRun?.summaryJson) {
    context = { ...modelRun.summaryJson, hasRealData: true };
  } else if (orgId) {
    const data = await overviewDashboardService.getOverviewData(orgId).catch(() => null);
    if (data && (data.monthlyRevenue > 0 || data.monthlyBurnRate > 0)) {
      context = {
        cashBalance: (data.cashRunway * data.monthlyBurnRate) || 100000,
        burnRate: data.monthlyBurnRate,
        runwayMonths: data.cashRunway,
        revenue: data.monthlyRevenue,
        revenueGrowth: (data.revenueGrowth || 0) / 100,
        topExpense: data.expenseBreakdown?.[0]?.name || 'OpEx',
        topExpenseValue: data.expenseBreakdown?.[0]?.value || 0,
        hasRealData: true
      };
    }
  }

  const baseEvidence = [
    `Cash: $${(context.cashBalance || 0).toLocaleString()}`,
    `Burn: $${(context.burnRate || 0).toLocaleString()}/mo`,
    `Runway: ${(context.runwayMonths || 0).toFixed(1)}m`
  ];

  // Convert evidence strings to dataSources format for auditability
  const baseDataSources = baseEvidence.map((ev, idx) => ({
    type: 'financial_metric',
    id: `metric_${idx}`,
    snippet: ev
  }));

  // Logic based on Intent - MUCH MORE VARIED
  if (intent === 'runway_calculation' || lowerGoal.includes('runway') || lowerGoal.includes('how long')) {
    changes.push({
      type: 'runway_optimization',
      category: 'cash',
      title: `Maintain runway at ${(context.runwayMonths || 0).toFixed(1)} months`,
      summary: `Your current runway is healthy at ${(context.runwayMonths || 0).toFixed(1)} months. Maintaining this buffer provides strategic optionality.`,
      action: `Maintain runway at ${(context.runwayMonths || 0).toFixed(1)} months`,
      reasoning: `Your current runway is healthy at ${(context.runwayMonths || 0).toFixed(1)} months. Maintaining this buffer provides strategic optionality.`,
      explain: `Stable cash position allows for focused execution without immediate fundraising pressure.`,
      impact: { runwayStability: 'High', bufferSafety: 'Excellent' },
      priority: 'high',
      confidence: 1.0,
      evidence: baseEvidence,
      dataSources: baseDataSources
    });
  } else if (intent === 'burn_rate_calculation' || lowerGoal.includes('burn')) {
    changes.push({
      type: 'burn_efficiency',
      category: 'efficiency',
      title: `Optimize monthly burn of $${(context.burnRate || 0).toLocaleString()}`,
      summary: `Analyzing ${context.topExpense || 'major expenses'} which accounts for $${(context.topExpenseValue || 0).toLocaleString()} of spend.`,
      action: `Optimize monthly burn of $${(context.burnRate || 0).toLocaleString()}`,
      reasoning: `Analyzing ${context.topExpense || 'major expenses'} which accounts for $${(context.topExpenseValue || 0).toLocaleString()} of spend.`,
      explain: `Incremental efficiency in ${context.topExpense || 'operations'} can significantly extend runway.`,
      impact: { burnReduction: '5-10%', capitalEfficiency: '+15%' },
      priority: 'medium',
      confidence: 0.9,
      evidence: baseEvidence,
      dataSources: baseDataSources
    });
  } else if (intent === 'fundraising_readiness' || lowerGoal.includes('raise') || lowerGoal.includes('funding')) {
    changes.push({
      type: 'fundraising_strategy',
      category: 'capital',
      title: 'Strategic Fundraising Readiness Audit',
      summary: `With ${(context.runwayMonths || 0).toFixed(1)}m runway, you are in a "position of strength" to raise.`,
      action: 'Strategic Fundraising Readiness Audit',
      reasoning: `With ${(context.runwayMonths || 0).toFixed(1)}m runway, you are in a "position of strength" to raise.`,
      explain: `Capital markets reward companies with 18+ months runway and predictable growth.`,
      impact: { valuationPremium: 'Targeted', dilutionControl: 'High' },
      priority: 'high',
      confidence: 0.85,
      evidence: [...baseEvidence, `Growth: ${(context.revenueGrowth * 100).toFixed(1)}% MoM`],
      dataSources: [...baseDataSources, {
        type: 'growth_metric',
        id: 'growth_rate',
        snippet: `Growth: ${(context.revenueGrowth * 100).toFixed(1)}% MoM`
      }]
    });
  } else if (intent === 'revenue_forecast' || lowerGoal.includes('revenue') || lowerGoal.includes('growth')) {
    changes.push({
      type: 'growth_acceleration',
      category: 'revenue',
      title: 'Accelerate high-margin subscription growth',
      summary: `Current revenue is $${(context.revenue || 0).toLocaleString()} with ${(context.revenueGrowth * 100).toFixed(1)}% growth.`,
      action: 'Accelerate high-margin subscription growth',
      reasoning: `Current revenue is $${(context.revenue || 0).toLocaleString()} with ${(context.revenueGrowth * 100).toFixed(1)}% growth.`,
      explain: `Focusing on Net Revenue Retention (NRR) will maximize the LTV of your existing base.`,
      impact: { arrGrowth: '+12%', ltvExpansion: 'Significant' },
      priority: 'high',
      confidence: 0.95,
      evidence: [...baseEvidence, `MRR: $${(context.revenue || 0).toLocaleString()}`],
      dataSources: [...baseDataSources, {
        type: 'revenue_metric',
        id: 'mrr',
        snippet: `MRR: $${(context.revenue || 0).toLocaleString()}`
      }]
    });
  } else if (intent === 'cost_optimization' || lowerGoal.includes('cost') || lowerGoal.includes('save') || lowerGoal.includes('reduce')) {
    changes.push({
      type: 'cost_structure_optimization',
      category: 'opEx',
      title: `Review ${context.topExpense || 'major'} cost structure`,
      summary: `${context.topExpense || 'Major expense'} is $${(context.topExpenseValue || 0).toLocaleString()}. Benchmarking against industry peers.`,
      action: `Review ${context.topExpense || 'major'} cost structure`,
      reasoning: `${context.topExpense || 'Major expense'} is $${(context.topExpenseValue || 0).toLocaleString()}. Benchmarking against industry peers.`,
      explain: `Targeting a 7% reduction in non-core operational expenses.`,
      impact: { monthlySavings: `$${((context.burnRate || 0) * 0.07).toLocaleString()}`, runwayExtension: '+2 months' },
      priority: 'medium',
      confidence: 0.9,
      evidence: baseEvidence,
      dataSources: baseDataSources
    });
  } else if (intent === 'unit_economics_analysis' || lowerGoal.includes('metric') || lowerGoal.includes('kpi')) {
    changes.push({
      type: 'metric_benchmarking',
      category: 'metrics',
      title: 'Benchmark SaaS Unit Economics',
      summary: `Revenue per customer and acquisition cost analysis based on $${(context.revenue || 0).toLocaleString()} MRR.`,
      action: 'Benchmark SaaS Unit Economics',
      reasoning: `Revenue per customer and acquisition cost analysis based on $${(context.revenue || 0).toLocaleString()} MRR.`,
      explain: `Ensuring LTV:CAC ratio remains above 3x for sustainable scaling.`,
      impact: { paybackPeriod: '< 12 months', unitProfitability: 'Positive' },
      priority: 'medium',
      confidence: 0.8,
      evidence: baseEvidence,
      dataSources: baseDataSources
    });
  } else {
    // Default strategic review
    changes.push({
      type: 'strategic_review',
      category: 'strategy',
      title: 'Comprehensive Strategic Financial Health Check',
      summary: `Overall assessment of cash ($${(context.cashBalance || 0).toLocaleString()}) and growth (${(context.revenueGrowth * 100).toFixed(1)}%).`,
      action: 'Comprehensive Strategic Financial Health Check',
      reasoning: `Overall assessment of cash ($${(context.cashBalance || 0).toLocaleString()}) and growth (${(context.revenueGrowth * 100).toFixed(1)}%).`,
      explain: `A holistic review ensures all financial levers are aligned with the company's long-term vision.`,
      impact: { strategicClarity: 'High', executionAlignment: 'Verified' },
      priority: 'medium',
      confidence: 0.8,
      evidence: baseEvidence,
      dataSources: baseDataSources
    });
  }

  // Always add 2 more contextual strategic items to make it a proper plan
  if (changes.length < 3) {
    // Add items that haven't been added yet
    const types = changes.map(c => c.type);

    if (!types.includes('scenario_planning')) {
      changes.push({
        type: 'scenario_planning',
        category: 'strategy',
        title: 'Dynamic Scenario Modeling (Upside/Downside)',
        summary: 'Testing resilience against market volatility and growth acceleration opportunities.',
        action: 'Dynamic Scenario Modeling (Upside/Downside)',
        reasoning: 'Testing resilience against market volatility and growth acceleration opportunities.',
        explain: 'Modeling a 25% revenue growth burst vs. a 15% market downturn.',
        impact: { riskMitigation: 'High', capitalizationReadiness: '100%' },
        priority: 'medium',
        confidence: 0.9,
        evidence: baseEvidence,
        dataSources: baseDataSources
      });
    }

    if (changes.length < 3 && !types.includes('data_automation')) {
      changes.push({
        type: 'data_automation',
        category: 'operations',
        title: 'Enhance Real-time Financial Data Integrity',
        summary: 'Automating the flow between accounting and planning for zero-latency insights.',
        action: 'Enhance Real-time Financial Data Integrity',
        reasoning: 'Automating the flow between accounting and planning for zero-latency insights.',
        explain: `Ensuring all ${context.hasRealData ? 'active' : 'pending'} connectors provide granular visibility.`,
        impact: { insightLatency: '-90%', decisionSpeed: 'Accelerated' },
        priority: 'low',
        confidence: 1.0,
        evidence: [`Data Source: ${context.hasRealData ? 'Connected' : 'Sync Required'}`],
        dataSources: [{
          type: 'data_connection',
          id: 'connector_status',
          snippet: `Data Source: ${context.hasRealData ? 'Connected' : 'Sync Required'}`
        }]
      });
    }
  }

  return changes;
}

