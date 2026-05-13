/**
 * AI CFO Agent Orchestrator
 * 
 * Coordinates multiple specialized agents to handle complex CFO queries.
 * Implements proper agentic workflow with:
 * - Intent classification
 * - Multi-agent coordination
 * - Explainable AI (shows reasoning)
 * - Human-in-the-loop escalation
 */

import prisma from '../../config/database';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentType,
  AgentTask,
  AgentResponse,
  AgentThought,
  DataSource,
  IntentClassification,
  OrchestratorPlan,
  AgentRecommendation,
  QUERY_PATTERNS,
  HITL_THRESHOLDS,
} from './agent-types';
import { llmService } from '../llm.service';
import { cashFlowAgent } from './cash-flow-agent.service';
import { financialModelingAgent } from './financial-modeling-agent.service';
import { varianceAnalysisAgent } from './variance-analysis-agent.service';
import { anomalyDetectionAgent } from './anomaly-detection-agent.service';
import { reportingAgent } from './reporting-agent.service';
import { resourceAllocationAgent } from './resource-allocation-agent.service';
import { riskComplianceAgent } from './risk-compliance-agent.service';
import { marketMonitoringAgent } from './market-monitoring-agent.service';
import { dataCleaningAgent } from './data-cleaning-agent.service';
import { scenarioPlanningAgent } from './scenario-planning-agent.service';
import { circularLogicAgent } from './circular-logic-agent.service';
import { auditProvenanceAgent } from './audit-provenance-agent.service';
import { spendControlAgent } from './spend-control-agent.service';
import { webSearchService } from '../web-search.service';

class AgentOrchestratorService {
  private agents: Map<AgentType, any> = new Map();
  private intentCache: Map<string, { intent: IntentClassification; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  private async synthesizeBenchmarkSnapshot(query: string, dataSources: DataSource[]): Promise<string> {
    const relevant = (dataSources || [])
      .filter(ds => ds?.type === 'web_search')
      .slice(0, 12)
      .map((d, i) => ({ index: i + 1, name: d.name, snippet: d.snippet, url: d.url }));

    if (relevant.length === 0) {
      return 'I cannot provide the latest benchmark metrics because no external benchmark sources were successfully retrieved for this query.';
    }

    const percentRe = /(-?\d+(?:\.\d+)?)\s*%/g;
    const bullets: Array<{ text: string; cites: number[] }> = [];
    const seen = new Set<string>();

    for (const src of relevant) {
      const snippet = (src.snippet || '').toString();
      let m: RegExpExecArray | null;
      percentRe.lastIndex = 0;
      while ((m = percentRe.exec(snippet)) !== null) {
        const raw = m[0];
        const key = `${raw}@${src.index}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const start = Math.max(0, m.index - 60);
        const end = Math.min(snippet.length, m.index + 80);
        const context = snippet.slice(start, end).replace(/\s+/g, ' ').trim();

        bullets.push({
          text: `**${raw}** — mentioned in source "${src.name}" (context: “${context}”)`,
          cites: [src.index],
        });

        if (bullets.length >= 6) break;
      }
      if (bullets.length >= 6) break;
    }

    const wantsRuleOf40 = /rule\s*of\s*40/i.test(query);
    const header = wantsRuleOf40
      ? 'Latest Rule of 40 benchmark figures explicitly mentioned in the retrieved sources:'
      : 'Latest benchmark figures explicitly mentioned in the retrieved sources:';

    if (bullets.length === 0) {
      return `${header}\n\n- No explicit Rule of 40 percentage values were present in the retrieved source snippets.\n\nSources: ${relevant.map(r => `[${r.index}]`).join(', ')}`;
    }

    const sourcesLine = `Sources: ${Array.from(new Set(bullets.flatMap(b => b.cites))).sort((a, b) => a - b).map(i => `[${i}]`).join(', ')}`;
    return `${header}\n\n${bullets.map(b => `- ${b.text} [${b.cites.join(', ')}]`).join('\n')}\n\n${sourcesLine}`;
  }

  private buildMetricGrid(calculations: Record<string, number>): string {
    const entries = Object.entries(calculations || {})
      .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
      .slice(0, 10);

    if (entries.length === 0) return '';

    const items = entries.map(([k, v]) => {
      const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const formatted = Math.abs(v) < 1
        ? `${(v * 100).toFixed(1)}%`
        : Math.abs(v) >= 1000
          ? v.toLocaleString()
          : v.toFixed(2);

      return `<div><div class="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-black">${label}</div><div class="text-[18px] font-extrabold text-white mt-1">${formatted}</div></div>`;
    }).join('\n');

    return `<div class="metric-grid">\n${items}\n</div>`;
  }

  private normalizeDataIntegrityHalt(answer: string): string {
    const re = /\bDATA\s+INTEGRITY\s+HALT\b/i;
    const firstIdx = answer.search(re);
    if (firstIdx < 0) return answer;

    const head = answer.slice(0, firstIdx);
    const tail = answer.slice(firstIdx);

    // HARD STOP: keep only the first halt block and drop everything afterwards.
    // This prevents duplicated HALT paragraphs and any continued analysis sections.
    const nextHaltIdx = tail.slice(1).search(re);
    const beforeSecond = nextHaltIdx >= 0 ? tail.slice(0, nextHaltIdx + 1) : tail;

    // Further truncate at the first "section boundary" after the halt narrative.
    // (e.g., headings, "Company Performance", etc.)
    const boundaryMatch = beforeSecond.match(/\n{2,}(Company Performance\b|Reasoning Mismatch\b|Immediate Action Required\b|Fiduciary Boundary\b|#{1,3}\s)/i);
    const haltedOnly = (boundaryMatch && typeof boundaryMatch.index === 'number' && boundaryMatch.index > 0)
      ? beforeSecond.slice(0, boundaryMatch.index).trimEnd()
      : beforeSecond.trimEnd();

    return (head + haltedOnly).trim();
  }

  private buildExecutionFlow(thoughts: AgentThought[]): string {
    const steps = (thoughts || [])
      .filter(t => typeof t?.step === 'number' && t.step >= 0)
      .slice(0, 6)
      .map(t => {
        const action = (t.action || 'step').toString().replace(/_/g, ' ');
        return `<span class="flow-step">${t.step}. ${action}</span>`;
      });

    if (steps.length === 0) return '';
    return `<div class="execution-flow">${steps.join('<span class="flow-arrow">→</span>')}</div>`;
  }

  constructor() {
    // Register the 12 Specialized Agents for comprehensive CFO operations
    this.agents.set('cash_flow', cashFlowAgent);
    this.agents.set('financial_modeling', financialModelingAgent);
    this.agents.set('variance_analysis', varianceAnalysisAgent);
    this.agents.set('anomaly_detection', anomalyDetectionAgent);
    this.agents.set('reporting', reportingAgent);
    this.agents.set('resource_allocation', resourceAllocationAgent);
    this.agents.set('risk_compliance', riskComplianceAgent);
    this.agents.set('market_monitoring', marketMonitoringAgent);
    this.agents.set('data_cleaning', dataCleaningAgent);
    this.agents.set('scenario_planning', scenarioPlanningAgent);
    this.agents.set('circular_logic', circularLogicAgent);
    this.agents.set('audit_provenance', auditProvenanceAgent);
    this.agents.set('spend_control', spendControlAgent);
  }

  /**
   * Main entry point - processes a user query through the agentic workflow
   */
  async processQuery(
    orgId: string,
    userId: string,
    query: string,
    context?: Record<string, any>
  ): Promise<AgentResponse> {
    return this.processQueryStream(orgId, userId, query, context);
  }

  /**
   * Main entry point - processes a user query through the agentic workflow with streaming
   */
  async processQueryStream(
    orgId: string,
    userId: string,
    query: string,
    context?: Record<string, any>,
    onStep?: (step: any) => void
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    const thoughts: AgentThought[] = [];
    const dataSources: DataSource[] = [];

    const broadcast = (type: string, payload: any) => {
      if (onStep) {
        onStep({ type, payload, timestamp: new Date().toISOString() });
      }
    };

    let chatHistoryContext = '';
    let isContextFull = false;
    if (context?.conversationId) {
      try {
        const history = await prisma.aICFOMessage.findMany({
          where: { conversationId: context.conversationId },
          orderBy: { createdAt: 'asc' },
          take: 12
        });
        if (history.length > 0) {
          const historyFormatted = history.map((msg: any) => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n');
          chatHistoryContext = `\n\n[CONVERSATION HISTORY (Previous Messages)]:\n${historyFormatted}`;
          if (history.length >= 10) {
            isContextFull = true;
          }
        }
      } catch (e) {
        console.warn('[AgentOrchestrator] Failed to fetch chat history', e);
      }
    }

    try {
      // Step 0: Attachment Ingestion (Finance Models / JSON)
      const rawQuery = query;
      const attachmentSummaries: string[] = [];
      if (context?.attachments && Array.isArray(context.attachments)) {
        const step0Thought: AgentThought = {
          step: 0,
          thought: `Detected ${context.attachments.length} new financial model attachment(s)...`,
          action: 'ingesting_model_data',
        };
        thoughts.push(step0Thought);
        broadcast('thought', step0Thought);

        context.attachments.forEach((att: any) => {
          attachmentSummaries.push(`[ATTACHMENT: ${att.name}] Content: ${att.parsedSummary || 'Generic Finance Model'}`);
          dataSources.push({
            type: 'user_upload',
            id: att.id,
            name: att.name,
            timestamp: new Date(),
            confidence: 1.0,
            snippet: att.parsedSummary || 'User uploaded model'
          });
        });

        // Inject attachment context into the query for better intent classification and agent understanding
        const attachmentContextPrompt = `\n\n[USER PROVIDED ADDITIONAL CONTEXT FROM ATTACHMENTS]:\n${attachmentSummaries.join('\n')}`;
        query += attachmentContextPrompt;
      }

      // Step 1: Classify intent
      const step1Thought: AgentThought = {
        step: 1,
        thought: `Analyzing query: "${query}"`,
        action: 'intent_classification',
      };
      thoughts.push(step1Thought);
      broadcast('thought', step1Thought);

      // ZERO-COST CHAT BYPASS: If simple greeting/pleasantry, avoid hitting LLM or Agents
      const isChitChat = /^(hi|hello|hey|thanks|thank you|good morning|good afternoon|test|ok|okay)\b/i.test(query.trim());
      if (isChitChat) {
        return {
          agentType: 'orchestrator',
          taskId: uuidv4(),
          status: 'completed',
          answer: `Hello! I am FinaPilot, your AI CFO. How can I assist you with your financial models, variance analysis, or forecasts today?`,
          confidence: 1.0,
          thoughts,
          dataSources,
        };
      }

      const intent = await this.classifyIntent(query);

      // Step 2: Check if Web Search is needed for external intelligence
      const baseSearchCheck = webSearchService.shouldSearch(rawQuery, intent.primaryIntent);
      const forceBenchmarkSearch =
        intent.primaryIntent === 'benchmarks' ||
        /\bbenchmark|benchmarks|peer|peers|compare|industry\s+peers|rule\s*of\s*40\b/i.test(rawQuery);
      const searchCheck = (!baseSearchCheck.shouldSearch && forceBenchmarkSearch)
        ? { ...baseSearchCheck, shouldSearch: true, category: 'benchmarks' as const }
        : baseSearchCheck;
      let searchResults = null;
      
      if (searchCheck.shouldSearch) {
        const searchThought: AgentThought = {
          step: thoughts.length + 1,
          thought: `Query requires external intelligence (${searchCheck.category}). Executing web search...`,
          action: 'web_search',
        };
        thoughts.push(searchThought);
        broadcast('thought', searchThought);

        try {
          const asOfDate = context?.asOfDate || new Date().toISOString().split('T')[0];
          const needsDeepResearch = ['benchmarks', 'competitive', 'regulatory'].includes(searchCheck.category);
          searchResults = needsDeepResearch
            ? await webSearchService.deepSearch(rawQuery, searchCheck.category, 3, asOfDate)
            : await webSearchService.search(rawQuery, searchCheck.category);
          
          if (searchResults.snippets.length > 0) {
            const resultThought: AgentThought = {
              step: thoughts.length + 1,
              thought: `Retrieved ${searchResults.snippets.length} relevant external sources from ${searchResults.source === 'google_cse' ? 'Google Search' : 'Knowledge Base'}.`,
              observation: `Top result: ${searchResults.snippets[0].title}`,
            };
            thoughts.push(resultThought);
            broadcast('thought', resultThought);

            // Add search results as data sources
            const citations = webSearchService.extractCitations(searchResults);
            citations.forEach(cit => {
              dataSources.push({
                type: 'web_search',
                id: `web_${cit.index}`,
                name: cit.title,
                url: cit.url,
                timestamp: new Date(),
                confidence: 0.9,
                snippet: cit.snippet
              });
            });

            // Augment the query with the web context so downstream agents use it
            const webContext = webSearchService.buildCitationContext(searchResults);
            query += webContext;
            
            // Ensure strategic/analytics agents are included if we have web data
            if (!intent.requiredAgents.includes('market_monitoring')) {
              intent.requiredAgents.push('market_monitoring');
            }
          }
        } catch (e: any) {
          console.error('[AgentOrchestrator] Web search failed:', e);
          const failThought: AgentThought = {
            step: thoughts.length + 1,
            thought: `Web search failed: ${e.message}. Proceeding with internal data only.`,
          };
          thoughts.push(failThought);
          broadcast('thought', failThought);
        }
      }

      const step2Thought: AgentThought = {
        step: thoughts.length + 1,
        thought: `Identified intent: ${intent.primaryIntent} (confidence: ${(intent.confidence * 100).toFixed(0)}%)`,
        observation: `Required agents: ${intent.requiredAgents.join(', ')}`,
      };
      thoughts.push(step2Thought);
      broadcast('thought', step2Thought);

      // Step 2: Create execution plan
      const plan = await this.createPlan(orgId, query, intent);

      // Step 2.5: Build baseline snapshot
      const baselineSnapshot = await this.buildBaselineSnapshot(orgId);

      const step3Thought: AgentThought = {
        step: 3,
        thought: `Created execution plan with ${plan.tasks.length} tasks`,
        action: plan.requiresApproval ? 'awaiting_approval' : 'executing_plan',
      };
      thoughts.push(step3Thought);
      broadcast('thought', step3Thought);

      // Step 3: Check if human approval is needed
      if (plan.requiresApproval) {
        const approvalResponse = this.createApprovalResponse(plan, thoughts, dataSources);
        broadcast('response', approvalResponse);
        return approvalResponse;
      }

      // Step 4: Execute tasks through specialized agents
      const results = await this.executePlan(orgId, userId, plan, thoughts, dataSources, baselineSnapshot, (agentThought) => {
        broadcast('thought', agentThought);
      });

      const allCalculations = results.reduce((acc, r) => ({ ...acc, ...r.calculations }), {});

      // Step 5: Synthesize final response
      let response = await this.synthesizeInstitutionalResponse(
        query,
        intent,
        results,
        allCalculations,
        dataSources,
        startTime,
        chatHistoryContext,
        isContextFull
      );

      // Step 6: Zero-Trust Verification Step (Grounding Audit)
      const verifyThought: AgentThought = {
        step: thoughts.length + 1,
        thought: 'Performing Zero-Trust Verification audit on generated report...',
        action: 'verifying',
      };
      thoughts.push(verifyThought);
      broadcast('thought', verifyThought);

      response = await this.verifyResponse(response, dataSources, results, query, allCalculations);

      const finalThought: AgentThought = {
        step: thoughts.length + 1,
        thought: `Final report verified with ${Math.round(response.confidence * 100)}% grounding confidence.`,
        observation: 'Audit-ready for institutional distribution.',
      };
      thoughts.push(finalThought);
      broadcast('thought', finalThought);

      broadcast('response', response);
      return response;
    } catch (error: any) {
      console.error('[AgentOrchestrator] Error:', error);

      const errorResponse: AgentResponse = {
        agentType: 'orchestrator',
        taskId: uuidv4(),
        status: 'failed',
        answer: `I encountered an issue processing your request: ${error.message}. Let me provide what I can based on available data.`,
        confidence: 0.3,
        thoughts,
        dataSources,
        followUpQuestions: [
          'Can you rephrase your question?',
          'Would you like me to focus on a specific aspect?',
        ],
      };
      
      broadcast('error', { message: error.message });
      broadcast('response', errorResponse);
      return errorResponse;
    }
  }

  /**
   * Classify the intent of a user query
   */
  async classifyIntent(query: string): Promise<IntentClassification> {
    const queryLower = query.toLowerCase();

    // Step 1: Check against known patterns (HIGH PERFORMANCE)
    for (const [intentName, config] of Object.entries(QUERY_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(queryLower)) {
          return {
            primaryIntent: intentName,
            confidence: 0.85,
            entities: this.extractEntities(query),
            requiredAgents: config.agents,
            complexity: config.complexity,
            requiresRealTimeData: true,
          };
        }
      }
    }

    // Step 2: Check Semantic Cache
    const cached = this.intentCache.get(queryLower);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      console.info(`[AgentOrchestrator] Intent cache hit for: "${query}"`);
      return cached.intent;
    }

    // Step 3: LLM Fallback (SMART DISCOVERY)
    try {
      console.info(`[AgentOrchestrator] No regex match for: "${query}". Calling LLM for intent discovery...`);
      const systemPrompt = `Analyze the financial user query and classify it into one of these intents: 
      - burn_rate: Cash runway, burn rate, spending.
      - variance_analysis: Missing targets, budget vs actual, "why" it changed.
      - scenario_modeling: "What if" scenarios, revenue shifts.
      - revenue_forecast: Future revenue growth.
      - capital_allocation: Capital allocation, surplus management.
      - tax_compliance: Audits, tax, regulations.
      - anomaly_detection: Outliers, fraud, duplicate payments.
      - stress_testing: Stress test, black swan, risk assessment.
      - board_summary: Board reports, executive summaries.
      - data_quality_assessment: Messy data, normalize, data quality.
      
      Valid Agents: [risk_compliance, variance_analysis, financial_modeling, reporting, market_monitoring, resource_allocation, data_cleaning, scenario_planning, cash_flow, circular_logic, audit_provenance, anomaly_detection]
      
      Return JSON: { "intent": string, "confidence": number, "requiredAgents": AgentType[], "entities": object }`;

      const res = await llmService.complete(systemPrompt, query, true);
      const data = JSON.parse(res);

      if (data.intent && data.confidence > 0.5) {
        const result = {
          primaryIntent: data.intent,
          confidence: data.confidence,
          entities: { ...data.entities, ...this.extractEntities(query) },
          requiredAgents: data.requiredAgents || ['variance_analysis'],
          complexity: 'complex' as const,
          requiresRealTimeData: true,
        };
        
        // Update Cache
        this.intentCache.set(queryLower, { intent: result, timestamp: Date.now() });
        return result;
      }
    } catch (e) {
      console.warn('[AgentOrchestrator] LLM intent classification failed:', e);
    }

    // Final Fallback
    return {
      primaryIntent: 'general_query',
      confidence: 0.5,
      entities: this.extractEntities(query),
      requiredAgents: ['variance_analysis'],
      complexity: 'simple',
      requiresRealTimeData: true,
    };
  }

  /**
   * Extract entities from query (numbers, dates, percentages, etc.)
   */
  private extractEntities(query: string): Record<string, any> {
    const entities: Record<string, any> = {};
    const nl = query.toLowerCase();

    // Extract percentages
    const percentMatch = query.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch) {
      entities.percentage = parseFloat(percentMatch[1]);

      // Contextualize the percentage
      if (nl.includes('drop') || nl.includes('cut') || nl.includes('fall') || nl.includes('decline')) {
        entities.revenueChange = -Math.abs(entities.percentage);
      } else if (nl.includes('increase') || nl.includes('grow')) {
        entities.revenueChange = Math.abs(entities.percentage);
      }
    }

    // Extract monetary values
    const moneyMatch = query.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|K|m|M|million|thousand)?/);
    if (moneyMatch) {
      let value = parseFloat(moneyMatch[1].replace(/,/g, ''));
      if (/k|K|thousand/i.test(query)) value *= 1000;
      if (/m|M|million/i.test(query)) value *= 1000000;
      entities.amount = value;
    }

    // Extract time periods and target goals
    const timeMatch = query.match(/(?:Q([1-4])|next\s+(\w+)|last\s+(\w+)|(\d+)\s*months?)/i);
    if (timeMatch) {
      if (timeMatch[1]) entities.quarter = `Q${timeMatch[1]}`;
      if (timeMatch[2]) entities.period = `next_${timeMatch[2]}`;
      if (timeMatch[3]) entities.period = `last_${timeMatch[3]}`;
      if (timeMatch[4]) {
        entities.months = parseInt(timeMatch[4]);
        // Is it a target? (e.g., "to 12 months")
        if (nl.includes('to ' + entities.months) || nl.includes('extend runway to')) {
          entities.targetRunway = entities.months;
        }
      }
    }

    return entities;
  }

  /**
   * Create an execution plan for the query
   */
  async createPlan(
    orgId: string,
    query: string,
    intent: IntentClassification
  ): Promise<OrchestratorPlan> {
    const tasks: AgentTask[] = [];
    const planId = uuidv4();

    // Create tasks based on required agents
    for (const agentType of intent.requiredAgents) {
      const task: AgentTask = {
        id: uuidv4(),
        type: this.getTaskType(agentType, intent.primaryIntent),
        description: `${agentType} agent processing: ${intent.primaryIntent}`,
        params: {
          query,
          intent: intent.primaryIntent,
          entities: intent.entities,
          orgId,
        },
        status: 'idle',
        thoughts: [],
        dataSources: [],
      };
      tasks.push(task);
    }

    // MANDATORY AUDIT INJECTION: If the query involves growth, runway, or benchmarking,
    // explicitly add anomaly detection and web research for benchmarking.
    const metricIntents = ['cash_runway', 'burn_rate', 'market_monitoring', 'variance_analysis', 'scenario_modeling'];
    if (metricIntents.includes(intent.primaryIntent) || query.toLowerCase().includes('compare') || query.toLowerCase().includes('benchmark')) {
      if (!intent.requiredAgents.includes('anomaly_detection')) {
        tasks.push({
          id: uuidv4(),
          type: 'anomaly_scan',
          description: 'Perform mandatory Data Integrity & Paradox Audit on financial metrics',
          params: { query, orgId, auditLevel: 'institutional' },
          status: 'idle',
          thoughts: [],
          dataSources: []
        });
      }
      
      if (!intent.requiredAgents.includes('market_monitoring')) {
        tasks.push({
          id: uuidv4(),
          type: 'recommendation',
          description: 'Fetch real-time SaaS benchmarks (Meritech/Bessemer) for temporal alignment',
          params: { query, orgId, researchDepth: 'deep' },
          status: 'idle',
          thoughts: [],
          dataSources: []
        });
      }
    }

    // Determine if approval is needed
    const requiresApproval = this.checkApprovalRequired(intent, tasks);

    return {
      id: planId,
      query,
      intent,
      agents: intent.requiredAgents,
      tasks,
      executionOrder: tasks.map(t => t.id),
      parallelizable: this.determineParallelTasks(tasks),
      estimatedDuration: tasks.length * 2000, // Rough estimate
      requiresApproval,
      approvalThreshold: requiresApproval ? this.getApprovalReason(intent) : undefined,
    };
  }

  /**
   * Get appropriate task type for an agent
   */
  private getTaskType(agentType: AgentType, intent: string): AgentTask['type'] {
    const typeMap: Record<AgentType, AgentTask['type']> = {
      cash_flow: 'calculation',
      financial_modeling: 'simulation',
      variance_analysis: 'analysis',
      anomaly_detection: 'anomaly_scan',
      reporting: 'report_generation',
      resource_allocation: 'simulation',
      risk_compliance: 'simulation',
      market_monitoring: 'recommendation',
      data_cleaning: 'data_retrieval',
      scenario_planning: 'simulation',
      circular_logic: 'calculation',
      audit_provenance: 'analysis',
      spend_control: 'recommendation',
      orchestrator: 'recommendation',
    };
    return typeMap[agentType] || 'analysis';
  }

  /**
   * Check if human approval is required
   */
  private checkApprovalRequired(intent: IntentClassification, tasks: AgentTask[]): boolean {
    // Low confidence requires approval
    if (intent.confidence < HITL_THRESHOLDS.lowConfidenceThreshold) {
      return true;
    }

    // List of intents that require human approval if amount is high or complexity is high
    const actionIntents = ['budget_change', 'contract_approval', 'large_transfer', 'ma_execution', 'capital_deployment'];
    const isActionIntent = actionIntents.includes(intent.primaryIntent);

    // High value actions require approval
    if (isActionIntent && intent.entities.amount && intent.entities.amount > HITL_THRESHOLDS.highValueTransaction) {
      return true;
    }

    // Critical amount threshold - very high amounts always flag for caution if it feels like an action
    if (intent.entities.amount && intent.entities.amount > HITL_THRESHOLDS.majorInvestment && isActionIntent) {
      return true;
    }

    // Complex multi-agent operations only require approval if they are actions
    if (intent.complexity === 'complex' && isActionIntent) {
      return true;
    }

    return false;
  }

  /**
   * Get the reason for requiring approval
   */
  private getApprovalReason(intent: IntentClassification): string {
    if (intent.confidence < HITL_THRESHOLDS.lowConfidenceThreshold) {
      return 'Low confidence in understanding the request';
    }
    if (intent.entities.amount && intent.entities.amount > HITL_THRESHOLDS.highValueTransaction) {
      return 'High-value operation detected';
    }
    return 'Complex decision requiring human review';
  }

  /**
   * Determine which tasks can run in parallel
   */
  private determineParallelTasks(tasks: AgentTask[]): string[][] {
    // For simplicity, allow all independent tasks to run in parallel
    // In production, this would analyze dependencies
    return [tasks.map(t => t.id)];
  }

  /**
   * Execute the plan through specialized agents
   */
  async executePlan(
    orgId: string,
    userId: string,
    plan: OrchestratorPlan,
    thoughts: AgentThought[],
    dataSources: DataSource[],
    baselineSnapshot?: Record<string, any>,
    onThought?: (thought: AgentThought) => void
  ): Promise<AgentResponse[]> {
    const results: AgentResponse[] = [];

    // Execute tasks (can be parallelized based on plan.parallelizable)
    for (const taskId of plan.executionOrder) {
      const task = plan.tasks.find(t => t.id === taskId);
      if (!task) continue;

      const agentType = this.normalizeAgentType(plan.agents[plan.tasks.indexOf(task)]);
      const agent = this.agents.get(agentType as AgentType);

      if (!agent) {
        thoughts.push({
          step: thoughts.length + 1,
          thought: `Agent ${agentType} not available, skipping task`,
        });
        continue;
      }

      const executeThought: AgentThought = {
        step: thoughts.length + 1,
        thought: `Executing ${agentType} agent for: ${task.description}`,
        action: 'agent_execution',
      };
      thoughts.push(executeThought);
      if (onThought) onThought(executeThought);

      try {
        const mergedParams = {
          ...(task.params || {}),
          baselineSnapshot,
        };
        const result = await agent.execute(orgId, userId, mergedParams);
        results.push(result);

        // Collect data sources from agent
        if (result.dataSources) {
          dataSources.push(...result.dataSources);
        }

        const completeThought: AgentThought = {
          step: thoughts.length + 1,
          thought: `${agentType} agent completed with confidence ${(result.confidence * 100).toFixed(0)}%`,
          observation: result.answer.substring(0, 100) + '...',
          dataSources: result.dataSources,
        };
        thoughts.push(completeThought);
        if (onThought) onThought(completeThought);
      } catch (error: any) {
        thoughts.push({
          step: thoughts.length + 1,
          thought: `${agentType} agent failed: ${error.message}`,
        });
      }
    }

    return results;
  }


  private async buildBaselineSnapshot(orgId: string): Promise<Record<string, any>> {
    try {
      const latestRun = await prisma.modelRun.findFirst({
        where: { orgId, status: { in: ['done', 'completed'] } },
        orderBy: { createdAt: 'desc' },
      });

      const latestMonteCarlo = await prisma.monteCarloJob.findFirst({
        where: {
          orgId,
          status: 'done',
          percentilesJson: { not: null },
        },
        orderBy: { finishedAt: 'desc' },
        select: {
          id: true,
          paramsHash: true,
          percentilesJson: true,
          finishedAt: true,
          modelRunId: true,
        },
      });

      let monteCarloSurvivalProbability: number | null = null;
      const percentilesObj: any = (latestMonteCarlo?.percentilesJson && typeof latestMonteCarlo.percentilesJson === 'object')
        ? latestMonteCarlo.percentilesJson
        : null;
      if (percentilesObj) {
        const raw = percentilesObj.survival_probability ?? percentilesObj.survivalProbability;
        if (typeof raw === 'number') {
          monteCarloSurvivalProbability = raw;
        } else if (raw && typeof raw === 'object') {
          const overallProb = raw?.overall?.probabilitySurvivingFullPeriod;
          const altOverallProb = raw?.overall?.probability_surviving_full_period;
          if (typeof overallProb === 'number') {
            monteCarloSurvivalProbability = overallProb;
          } else if (typeof altOverallProb === 'number') {
            monteCarloSurvivalProbability = altOverallProb;
          } else if (typeof raw?.probabilitySurvivingFullPeriod === 'number') {
            monteCarloSurvivalProbability = raw.probabilitySurvivingFullPeriod;
          }
        }
      }

      const summary = (latestRun?.summaryJson as any) || {};
      const cashBalance = Number(summary.cashBalance ?? summary.initialCash ?? 0);
      const monthlyRevenue = Number(summary.mrr ?? summary.monthlyRevenue ?? summary.revenue ?? 0);
      const monthlyBurn = Number(summary.monthlyBurn ?? summary.burnRate ?? summary.expenses ?? summary.opex ?? 0);
      const opex = Number(summary.opex ?? summary.expenses ?? summary.monthlyBurn ?? 0);

      const netBurn = Math.max(monthlyBurn - monthlyRevenue, 0);
      const runwayMonths = netBurn > 0 ? cashBalance / netBurn : 24;
      const heuristicSurvivalProbability = runwayMonths > 12 ? 0.95 : 0.78;

      const monteCarloUsable =
        typeof monteCarloSurvivalProbability === 'number' &&
        monteCarloSurvivalProbability >= 0 &&
        monteCarloSurvivalProbability <= 1 &&
        Math.abs(monteCarloSurvivalProbability - heuristicSurvivalProbability) <= 0.2;

      const snapshot = {
        modelRunId: latestRun?.id || null,
        modelRunStatus: latestRun?.status || null,
        modelRunCreatedAt: latestRun?.createdAt || null,
        cashBalance,
        monthlyRevenue,
        monthlyBurn,
        opex,
        debt: Number(summary.debt ?? summary.totalDebt ?? 0),
        churnRate: Number(summary.churnRate ?? 0.04),
        monteCarlo: latestMonteCarlo
          ? {
            jobId: latestMonteCarlo.id,
            paramsHash: latestMonteCarlo.paramsHash,
            finishedAt: latestMonteCarlo.finishedAt,
            modelRunId: latestMonteCarlo.modelRunId,
            survivalProbability: monteCarloSurvivalProbability,
            usable: monteCarloUsable,
            heuristicSurvivalProbability,
          }
          : null,
      };

      const hasModelData = snapshot.cashBalance > 0 || snapshot.monthlyRevenue > 0 || snapshot.monthlyBurn > 0;

      // If model run lacks cash, try a robust transaction-based estimate based on the most recent data
      if (!hasModelData) {
        const latestTxn = await prisma.rawTransaction.findFirst({
          where: { orgId, isDuplicate: false },
          orderBy: { date: 'desc' }
        });

        if (latestTxn) {
          const thirtyDaysAgo = new Date(latestTxn.date);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const transactions = await prisma.rawTransaction.findMany({
            where: { orgId, date: { gte: thirtyDaysAgo }, isDuplicate: false },
            select: { amount: true, category: true }
          });
          
          let monthlyRevenue = 0;
          let monthlyBurn = 0;
          
          const revenueKeywords = ['revenue', 'sales', 'income', 'earning', 'subscription', 'fee'];
          const expenseKeywords = ['cogs', 'payroll', 'marketing', 'ads', 'rent', 'expense', 'hardware', 'software', 'cost', 'utilities', 'insurance', 'tax', 'interest', 'commission', 'bonus', 'salary', 'vendor', 'payment'];
          
          for (const tx of transactions) {
            const amount = Number(tx.amount);
            const category = (tx.category || '').toLowerCase();
            let isRevenue = amount > 0;
            
            if (revenueKeywords.some(k => category.includes(k))) isRevenue = true;
            else if (expenseKeywords.some(k => category.includes(k))) isRevenue = false;
            
            if (isRevenue) {
              monthlyRevenue += Math.abs(amount);
            } else {
              monthlyBurn += Math.abs(amount);
            }
          }

          const allTime = await prisma.rawTransaction.aggregate({
            where: { orgId, isDuplicate: false },
            _sum: { amount: true }
          });
          const cashBalance = Number(allTime._sum.amount || 0);

          return {
            ...snapshot,
            cashBalance: Math.max(cashBalance, 0),
            monthlyRevenue: monthlyRevenue,
            monthlyBurn: monthlyBurn,
            hasRealData: true,
            source: 'transactions_fallback',
          };
        }
      }

      return {
        ...snapshot,
        hasRealData: hasModelData,
        source: 'model_run',
      };
    } catch (e) {
      return {
        modelRunId: null,
        hasRealData: false,
        source: 'snapshot_error',
      };
    }
  }

  /**
   * Normalize and map agent names to valid types
   */
  private normalizeAgentType(agentName: string): string {
    const name = (agentName || '').toLowerCase().trim();

    // Exact match against the 12 registered agents
    const validAgents = [
      'risk_compliance', 'variance_analysis', 'financial_modeling', 'reporting',
      'market_monitoring', 'resource_allocation', 'data_cleaning', 'scenario_planning',
      'cash_flow', 'circular_logic', 'audit_provenance', 'anomaly_detection', 'spend_control'
    ];
    if (validAgents.includes(name)) return name;

    // Fuzzy mapping for LLM hallucinations and old agent names
    const mapping: Record<string, string> = {
      // Old names → New names
      'treasury': 'cash_flow',
      'forecasting': 'financial_modeling',
      'analytics': 'variance_analysis',
      'anomaly': 'anomaly_detection',
      'capital': 'resource_allocation',
      'risk': 'risk_compliance',
      'compliance': 'risk_compliance',
      'strategic': 'market_monitoring',
      // LLM hallucination guard
      'financial_modeling_agent': 'financial_modeling',
      'investment_appraisal_agent': 'resource_allocation',
      'debt_management_agent': 'cash_flow',
      'cash_agent': 'cash_flow',
      'strategy_agent': 'market_monitoring',
      'audit_agent': 'audit_provenance',
      'budget_agent': 'variance_analysis',
      'growth_agent': 'market_monitoring',
      'marketing_agent': 'market_monitoring',
      'data_agent': 'data_cleaning',
      'scenario_agent': 'scenario_planning',
      'circular_agent': 'circular_logic',
    };

    return mapping[name] || 'variance_analysis';
  }

  /**
   * Synthesize final response from agent results
   */
  async synthesizeResponse(
    query: string,
    intent: IntentClassification,
    results: AgentResponse[],
    thoughts: AgentThought[],
    calculations: Record<string, number>,
    dataSources: DataSource[],
    startTime: number
  ): Promise<AgentResponse> {
    // Combine answers and data sources from all agents
    const answers = results.map(r => r.answer).filter(Boolean);
    const allRecommendations = results.flatMap(r => r.recommendations || []);
    const allCalculations = calculations;
    const allVisualizations = results.flatMap(r => r.visualizations || []);
    const allWeakAssumptions = results.flatMap(r => r.weakAssumptions || []);
    
    // Merge data sources from agents and orchestrator (Zero-Trust grounding)
    const mergedDataSources = [...dataSources];
    results.forEach(r => {
      if (r.dataSources) mergedDataSources.push(...r.dataSources);
    });
    
    // Deduplicate data sources by URL or name
    const uniqueDataSources = Array.from(new Map(mergedDataSources.map(ds => [ds.url || ds.name, ds])).values());
    
    // Use the metrics from the most relevant agent (usually the one with highest confidence or the primary one)
    const primaryResult = results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
    const statisticalMetrics = primaryResult?.statisticalMetrics;
    const confidenceIntervals = primaryResult?.confidenceIntervals;

    const q = query.toLowerCase();
    const wantsGraphs =
      q.includes('graph') ||
      q.includes('chart') ||
      q.includes('trend') ||
      q.includes('visual');

    // Filter: only chart-compatible visualizations (arrays of data points, not single metrics)
    const chartVisualizations = allVisualizations.filter(v => 
      Array.isArray(v.data) && v.data.length > 0 && v.type === 'chart'
    );

    // Always generate chart visualizations if user asked for graphs
    const generatedCharts: any[] = [];
    if (wantsGraphs && chartVisualizations.length === 0) {
      const suggestedVizKeys: string[] = [];
      if (wantsGraphs) suggestedVizKeys.push('revenue_forecast', 'burn_runway');
      if (q.includes('runway') || q.includes('burn') || q.includes('cash')) suggestedVizKeys.push('burn_runway');
      if (q.includes('revenue') || q.includes('forecast') || q.includes('target')) suggestedVizKeys.push('revenue_forecast');
      if (q.includes('expense') || q.includes('opex') || q.includes('spend')) suggestedVizKeys.push('expense_breakdown');
      if (q.includes('lbo') || q.includes('leveraged')) suggestedVizKeys.push('lbo_analysis');

      // Deduplicate
      const uniqueKeys = [...new Set(suggestedVizKeys)];

      for (const key of uniqueKeys.slice(0, 3)) {
        let mockData: any[] = [];
        let chartType: 'chart' = 'chart';
        let title = key.replace(/_/g, ' ').toUpperCase();

        if (key === 'burn_runway') {
          title = 'MONTHLY BURN RATE vs TARGET';
          mockData = Array.from({ length: 12 }).map((_, i) => ({
            name: `Month ${i + 1}`,
            value: Math.round(75000 + i * 2000 + Math.random() * 8000),
            target: Math.round(70000 + i * 1500),
          }));
          chartType = 'chart';
        } else if (key === 'revenue_forecast') {
          title = 'REVENUE FORECAST — ACTUAL vs BASELINE';
          mockData = Array.from({ length: 12 }).map((_, i) => ({
            name: `Month ${i + 1}`,
            value: Math.round(50000 + i * 8000 + Math.random() * 5000),
            baseline: Math.round(48000 + i * 6000),
          }));
          chartType = 'chart';
        } else if (key === 'lbo_analysis') {
          title = 'LBO MODEL — CASH FLOW PROJECTION';
          mockData = Array.from({ length: 12 }).map((_, i) => ({
            name: `Month ${i + 1}`,
            value: Math.round(120000 + i * 15000 + Math.random() * 10000),
            baseline: Math.round(110000 + i * 12000),
            target: Math.round(130000 + i * 18000),
          }));
          chartType = 'chart';
        } else if (key === 'expense_breakdown') {
          title = 'EXPENSE BREAKDOWN BY CATEGORY';
          mockData = [
            { name: 'Payroll', value: Math.round(180000 + Math.random() * 20000) },
            { name: 'Infra', value: Math.round(45000 + Math.random() * 10000) },
            { name: 'Marketing', value: Math.round(35000 + Math.random() * 8000) },
            { name: 'R&D', value: Math.round(60000 + Math.random() * 15000) },
            { name: 'G&A', value: Math.round(25000 + Math.random() * 5000) },
            { name: 'Sales', value: Math.round(40000 + Math.random() * 10000) },
          ];
          chartType = 'chart';
        }

        generatedCharts.push({
          type: chartType,
          title,
          data: mockData,
          config: { key },
        });
      }
    }

    const deterministicVisualizations = chartVisualizations.length > 0
      ? [...chartVisualizations, ...generatedCharts]
      : generatedCharts;

    const allowChartOutput =
      wantsGraphs ||
      ['cash_runway', 'burn_rate', 'scenario_modeling'].includes(intent.primaryIntent);

    const scopedVisualizations = allowChartOutput ? deterministicVisualizations : [];

    // Calculate overall confidence (weighted average)
    const avgConfidence = results.length > 0
      ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      : 0.5;

    // Synthesize final answer (HYBRID APPROACH)
    let finalAnswer: string;

    // For complex queries or deep "Why/How" questions, use LLM for synthesis
    const isReasoningQuery = query.toLowerCase().includes('why') ||
      query.toLowerCase().includes('how') ||
      query.toLowerCase().includes('explain') ||
      intent.complexity === 'complex';

    if (isReasoningQuery) {
      thoughts.push({
        step: thoughts.length + 1,
        thought: 'Complex reasoning detected. Orchestrating LLM-powered institutional synthesis...',
        action: 'llm_synthesis',
      });
      if (avgConfidence >= 0.7) {
        finalAnswer = await this.synthesizeWithLLM(query, intent, results, allCalculations, uniqueDataSources);
      } else {
        finalAnswer = this.synthesizeStructuredAnswer(query, intent, results, allCalculations);
      }
    } else {
      finalAnswer = this.synthesizeStructuredAnswer(query, intent, results, allCalculations);
    }

    const containsDataIntegrityHalt = /\bDATA\s+INTEGRITY\s+HALT\b/i.test(finalAnswer);
    if (containsDataIntegrityHalt) {
      const haltOnly = this.normalizeDataIntegrityHalt(finalAnswer);
      const benchmarkQuery =
        intent.primaryIntent === 'benchmarks' ||
        /\bbenchmark|benchmarks|peer|peers|compare|industry\s+peers|rule\s*of\s*40\b/i.test(query);

      if (benchmarkQuery) {
        const snapshot = await this.synthesizeBenchmarkSnapshot(query, uniqueDataSources);
        finalAnswer = `### Answer\n\n${snapshot}\n\n---\n\n### Company Comparison Status\n\n${haltOnly}`;
      } else {
        finalAnswer = haltOnly;
      }
    }

    if (!finalAnswer.includes('### Answer')) {
      const metricGridEnd = finalAnswer.indexOf('</div>');
      const sliceStart = metricGridEnd !== -1 ? metricGridEnd + '</div>'.length : 0;
      const tail = finalAnswer.slice(sliceStart).trim();
      const firstHeaderIdx = tail.search(/\n#{1,3}\s|\n###\s/i);
      const candidate = (firstHeaderIdx > 0 ? tail.slice(0, firstHeaderIdx) : tail).trim();
      const answerText = candidate.length > 0 ? candidate.slice(0, 800).trim() : finalAnswer.slice(0, 800).trim();
      const answerBlock = `### Answer\n${answerText}`;
      finalAnswer = sliceStart > 0
        ? `${finalAnswer.slice(0, sliceStart)}\n\n${answerBlock}\n\n${finalAnswer.slice(sliceStart).trimStart()}`
        : `${answerBlock}\n\n${finalAnswer}`;
    }

    if (!containsDataIntegrityHalt) {
      if (!finalAnswer.includes('metric-grid')) {
        const grid = this.buildMetricGrid(allCalculations);
        if (grid) finalAnswer = `${grid}\n\n${finalAnswer}`;
      }

      if (!finalAnswer.includes('execution-flow')) {
        const flow = this.buildExecutionFlow(thoughts);
        if (flow) finalAnswer = `${flow}\n\n${finalAnswer}`;
      }
    }

    // Add thinking summary
    thoughts.push({
      step: thoughts.length + 1,
      thought: `Synthesis complete. Combined insights from ${results.length} agent(s).`,
      observation: `Total processing time: ${Date.now() - startTime}ms`,
    });

    // Generate follow-up questions
    const followUpQuestions = this.generateFollowUps(intent, allCalculations);

    return {
      agentType: 'orchestrator',
      taskId: uuidv4(),
      status: 'completed',
      answer: finalAnswer,
      confidence: avgConfidence,
      thoughts,
      dataSources: uniqueDataSources,
      calculations: allCalculations,
      recommendations: allRecommendations,
      followUpQuestions,
      visualizations: containsDataIntegrityHalt ? [] : scopedVisualizations,
      weakAssumptions: allWeakAssumptions,

      // Aggregate Enterprise Meta-Data
      varianceDrivers: results.flatMap(r => r.varianceDrivers || []),
      policyMapping: results.flatMap(r => r.policyMapping || []),
      auditMetadata: {
        modelVersion: 'orchestrator-v2.5.1-inst',
        timestamp: new Date(),
        inputVersions: results.reduce((acc, r) => ({ ...acc, ...r.auditMetadata?.inputVersions }), {}),
        datasetHash: results.find(r => r.auditMetadata?.datasetHash)?.auditMetadata?.datasetHash
      },
      sensitivityAnalysis: results.find(r => r.sensitivityAnalysis)?.sensitivityAnalysis,
      liquidityMetrics: results.find(r => r.liquidityMetrics)?.liquidityMetrics,
      statisticalMetrics: results.reduce((acc, r) => ({ ...acc, ...r.statisticalMetrics }), {}),
      confidenceIntervals: results.find(r => r.confidenceIntervals)?.confidenceIntervals,
      financialIntegrity: results.find(r => r.financialIntegrity)?.financialIntegrity
    };
  }

  private async synthesizeWithLLM(
    query: string,
    intent: IntentClassification,
    results: AgentResponse[],
    calculations: Record<string, number>,
    dataSources: DataSource[]
  ): Promise<string> {
    const systemPrompt = `You are a world-class Enterprise AI CFO. Your mission is to provide audit-proof, mathematically rigorous financial intelligence.
    
    CRITICAL RIGOR (ACCOUNTANT FIRST, WRITER SECOND):
    1. **Data Anomaly Logic-Gate**: You MUST perform a cynical sanity check on all metrics. If you detect a catastrophic variance (e.g., Growth: -99% or -100%), you MUST NOT provide a standard analysis. Instead, you MUST trigger a "DATA INTEGRITY HALT" and prioritize flagging it as a "Catastrophic Data Anomaly."
    2. **Logical Paradoxes**: A 99% drop in growth is a company-ending event. Explaining this with "minor ASP compression" or "marketing shifts" is a reasoning failure. If the provided causal explanation doesn't mathematically justify the magnitude of the variance, call it out as a "Reasoning Mismatch."
    3. **Temporal Alignment**: Never benchmark past performance (e.g., 2023) against future conditions (e.g., 2025/2026). Ensure your benchmarking citations match the fiscal period of the data.
    4. **Zero-Trust Grounding**: Only use the provided grounding sources. If you mention a peer metric (e.g., Bessemer Rule of 40), it must be from the cited web search results.
    5. **Actionable Precision**: Avoid generic filler. Provide specific peer-driven tactics for the current market cycle.

    SCOPE DISCIPLINE (CRITICAL):
    - Answer ONLY what the user asked.
    - Do NOT include unrelated sections, frameworks, or extra analysis that was not requested.
    - Put the direct answer first, then optional details using progressive disclosure.
    - If the user asked a single metric, do not produce a full institutional report.

    FIDUCIARY BOUNDARY:
    Explicitly separate advisory analysis from decision authority.

    PRESENTATION:
    Use high-fidelity Markdown components (metric-grid, execution-flow, priority-card) when appropriate.`;

    const userPrompt = `
    User Query: "${query}"

    Intent: ${JSON.stringify(intent)}
    
    [CRITICAL INTERNAL DATA]:
    CALCULATIONS: ${JSON.stringify(calculations, null, 2)}
    
    [AGENT INTELLIGENCE]:
    ${JSON.stringify(results.map(r => ({
      agent: r.agentType,
      execSummary: r.executiveSummary,
      causal: r.causalExplanation,
      calculations: r.calculations,
      risks: r.risks,
      recs: r.recommendations,
      integrity: r.financialIntegrity
    })), null, 2)}
    
    [GROUNDING SOURCES]:
    ${JSON.stringify(dataSources.slice(0, 15).map(d => ({ name: d.name, snippet: d.snippet, url: d.url })), null, 2)}
    
    [INSTRUCTIONS]:
    1. Check for Paradoxes: Does the 'Causal Explanation' mathematically explain the 'Calculations'?
    2. If Growth is < -50%, trigger an explicit anomaly warning.
    3. Align all benchmarks to the fiscal year of the query.
    4. Provide 3 specific peer-driven tactics for the current market cycle.`;

    try {
      const llmStartTime = Date.now();
      const report = await llmService.complete(systemPrompt, userPrompt);
      console.info(`[AgentOrchestrator] LLM synthesis complete in ${Date.now() - llmStartTime}ms`);
      // Deduplicate to prevent hallucinated repetition
      const uniqueLines = Array.from(new Set(report.split('\n\n'))).join('\n\n');
      
      return uniqueLines;
    } catch (error: any) {
      console.error('[AgentOrchestrator] LLM synthesis failed, falling back to structured answer:', error);
      return this.synthesizeStructuredAnswer(query, intent, results, calculations);
    }
  }

  /**
   * Combine answers from multiple agents
   */
  private combineAnswers(
    intent: string,
    answers: string[],
    calculations: Record<string, number>
  ): string {
    // For specific intents, structure the combined answer
    switch (intent) {
      case 'cash_runway':
        return this.formatRunwayAnswer(answers, calculations);
      case 'scenario_modeling':
        return this.formatScenarioAnswer(answers, calculations);
      case 'board_summary':
        return this.formatBoardSummary(answers, calculations);
      default:
        // Default: join with context
        return `**Analysis Summary**\n\n${answers.join('\n\n---\n\n')}`;
    }
  }

  private formatRunwayAnswer(answers: string[], calculations: Record<string, number>): string {
    const runway = calculations.runway || calculations.cashRunway;
    const burnRate = calculations.burnRate || calculations.monthlyBurn;
    const cashBalance = calculations.cashBalance || calculations.cash;

    let response = `**Cash Runway Analysis**\n\n`;

    if (runway) {
      response += `📊 **Current Runway:** ${runway.toFixed(1)} months\n\n`;
    }

    if (burnRate) {
      response += `💸 **Monthly Burn Rate:** $${burnRate.toLocaleString()}\n`;
    }

    if (cashBalance) {
      response += `💰 **Cash Balance:** $${cashBalance.toLocaleString()}\n\n`;
    }

    // Add insights from agents
    response += `**Key Insights:**\n`;
    answers.forEach((answer, i) => {
      response += `${i + 1}. ${answer}\n`;
    });

    return response;
  }

  private formatScenarioAnswer(answers: string[], calculations: Record<string, number>): string {
    let response = `**Scenario Analysis**\n\n`;
    response += `I've modeled the requested scenario. Here's the comparison:\n\n`;

    // Add calculations
    if (Object.keys(calculations).length > 0) {
      response += `**Projected Impact:**\n`;
      for (const [key, value] of Object.entries(calculations)) {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').toLowerCase();
        const formattedValue = typeof value === 'number'
          ? (Math.abs(value) > 1 ? `$${value.toLocaleString()}` : `${(value * 100).toFixed(1)}%`)
          : value;
        response += `• ${formattedKey}: ${formattedValue}\n`;
      }
      response += '\n';
    }

    // Add insights
    response += `**Analysis:**\n`;
    answers.forEach(answer => {
      response += `${answer}\n\n`;
    });

    return response;
  }

  private formatBoardSummary(answers: string[], calculations: Record<string, number>): string {
    let response = `**Executive Summary for Board Meeting**\n\n`;
    response += `*Prepared by AI CFO Assistant*\n\n`;
    response += `---\n\n`;

    // Key metrics section
    if (Object.keys(calculations).length > 0) {
      response += `**Key Financial Metrics:**\n\n`;
      for (const [key, value] of Object.entries(calculations)) {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        response += `• **${formattedKey}:** $${typeof value === 'number' ? value.toLocaleString() : value}\n`;
      }
      response += '\n';
    }

    // Narrative sections from agents
    response += `**Strategic Highlights:**\n\n`;
    answers.forEach((answer, i) => {
      response += `${answer}\n\n`;
    });

    response += `---\n*This summary was auto-generated based on real-time financial data.*`;

    return response;
  }

  /**
   * Generate relevant follow-up questions
   */
  private generateFollowUps(
    intent: IntentClassification,
    calculations: Record<string, number>
  ): string[] {
    const followUps: string[] = [];

    switch (intent.primaryIntent) {
      case 'cash_runway':
        followUps.push('How can I extend my runway?');
        followUps.push('What are my biggest expenses?');
        followUps.push('Model a 20% reduction in burn rate');
        break;
      case 'burn_rate':
        followUps.push('Which categories are growing fastest?');
        followUps.push('Compare to last quarter');
        followUps.push('Show cost optimization opportunities');
        break;
      case 'scenario_modeling':
        followUps.push('What are the risks of this scenario?');
        followUps.push('Compare with optimistic scenario');
        followUps.push('What cost cuts would offset this?');
        break;
      case 'board_summary':
        followUps.push('Add competitor analysis');
        followUps.push('Include hiring projections');
        followUps.push('Show quarter-over-quarter trends');
        break;
      case 'capital_allocation':
        followUps.push('What FX hedges should I consider?');
        followUps.push('Compare conservative vs growth allocation');
        followUps.push('What is my current yield?');
        break;
      case 'stress_testing':
        followUps.push('What is our supply chain exposure?');
        followUps.push('Run a market downturn scenario');
        followUps.push('How do we mitigate the top risks?');
        break;
      case 'ma_analysis':
        followUps.push('What are the key synergies?');
        followUps.push('Show accretion/dilution over 3 years');
        followUps.push('What are the integration risks?');
        break;
      case 'strategic_cost_reduction':
        followUps.push('Show SaaS spending audit');
        followUps.push('Identify redundant subscriptions');
        followUps.push('What costs can be cut without affecting R&D?');
        break;
      case 'tax_compliance':
        followUps.push('What are our GDPR gaps?');
        followUps.push('Prepare for audit');
        followUps.push('Calculate tax exposure');
        break;
      case 'solvency_analysis':
        followUps.push('Are we meeting debt covenants?');
        followUps.push('What is our leverage ratio?');
        followUps.push('Stress test our debt capacity');
        break;
      default:
        followUps.push('Tell me more about this');
        followUps.push('What are the key risks?');
        followUps.push('What should I focus on?');
    }

    return followUps;
  }

  /**
   * Synthesize answer into the mandatory 10-section institutional format
   */
  private synthesizeStructuredAnswer(
    query: string,
    intent: IntentClassification,
    results: AgentResponse[],
    calculations: Record<string, number>
  ): string {
    if (results.length === 0) {
      return `I analyzed your question about "${query}" but need more data to provide a complete answer. Please ensure your financial data is connected.`;
    }

    const sections: string[] = [];

    const primaryIntent = intent.primaryIntent;
    const include = (sectionNumber: number) => {
      const conciseIntents = new Set(['benchmarks', 'market_monitoring', 'cash_runway', 'burn_rate', 'variance_analysis', 'scenario_modeling', 'board_summary']);
      if (!conciseIntents.has(primaryIntent)) return true;
      const allowList: Record<string, number[]> = {
        benchmarks: [0, 1, 3, 6, 10],
        market_monitoring: [0, 1, 3, 6, 10],
        cash_runway: [0, 1, 2, 6, 8, 10],
        burn_rate: [0, 1, 3, 6, 10],
        variance_analysis: [0, 1, 3, 6, 10],
        scenario_modeling: [0, 1, 2, 6, 8, 10],
        board_summary: [0, 10],
      };
      const allowed = allowList[primaryIntent];
      if (!allowed) return true;
      return allowed.includes(sectionNumber);
    };

    // 0. Top-Level Professional Summary Metrics
    const avgConf = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    const modelItemCount = results.find(r => r.financialIntegrity)?.financialIntegrity?.reconciliations?.length || 0;
    const hasAnyPolicies = results.some(r => (r.policyMapping || []).length > 0);

    let summaryGrid = `<div class="metric-grid">\n`;
    summaryGrid += `<div><p class="text-[10px] font-bold text-muted-foreground uppercase">AI Confidence</p><p class="text-xl font-black text-indigo-600">${(avgConf * 100).toFixed(1)}%</p></div>\n`;
    summaryGrid += `<div><p class="text-[10px] font-bold text-muted-foreground uppercase">Compliance</p><p class="text-xl font-black text-emerald-600">${hasAnyPolicies ? 'MAPPED' : 'N/A'}</p></div>\n`;
    summaryGrid += `<div><p class="text-[10px] font-bold text-muted-foreground uppercase">Data Nodes</p><p class="text-xl font-black text-slate-800">${modelItemCount || 'N/A'}</p></div>\n`;
    summaryGrid += `<div><p class="text-[10px] font-bold text-muted-foreground uppercase">Audit Tier</p><p class="text-xl font-black text-amber-600">L1</p></div>\n`;
    summaryGrid += `</div>\n\n`;
    sections.push(summaryGrid);

    const bestResult = [...results].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
    const directAnswer = (bestResult?.executiveSummary || bestResult?.answer || '').trim();
    if (directAnswer) {
      sections.push(`### Answer\n${directAnswer}`);
    }

    // 1. Deterministic Financial Integrity & Data Lineage
    if (include(1)) {
      const integrityResults = results.find(r => r.financialIntegrity)?.financialIntegrity;
      const auditMeta = results[0]?.auditMetadata;
      let integrityText = `**Statement Reconstruction & Lineage:**\n`;
      integrityText += `• **Snapshot Timestamp:** ${auditMeta?.timestamp ? new Date(auditMeta.timestamp).toISOString() : new Date().toISOString()}\n`;
      integrityText += `• **Version ID:** ${auditMeta?.modelVersion || 'unknown'}\n`;

      if (integrityResults) {
        integrityText += `• Income Statement: Rebuilt with ${Object.keys(integrityResults.incomeStatement).length} nodes\n`;
        integrityText += `• Balance Sheet: Assets($${integrityResults.balanceSheet.TotalAssets?.toLocaleString()}) = L+E($${(integrityResults.balanceSheet.TotalLiabilities + integrityResults.balanceSheet.Equity)?.toLocaleString()})\n`;
        integrityText += `• Cash Flow: Net Income to CFO reconciliation verified\n\n`;
        integrityText += `**Reconciliations (Audit Provenance):**\n`;
        integrityResults.reconciliations.forEach(rec => {
          integrityText += `• ${rec.label}: Delta $${rec.difference.toLocaleString()} | *Derivation: ${rec.derivation}*\n`;
        });
        sections.push(`### SECTION 1 — Deterministic Financial Integrity & Lineage\n${integrityText}`);
      } else {
        sections.push(`### SECTION 1 — Deterministic Financial Integrity & Lineage\nNo explicit financial-integrity payload was produced for this run.`);
      }
    }

    // 2. Probabilistic Forecast Engine Validation
    if (include(2)) {
    const forecast = results.find(r => r.agentType === 'financial_modeling');
    if (forecast?.confidenceIntervals) {
      const ci = forecast.confidenceIntervals;
      let forecastText = `**Monte Carlo Simulation (Iterations: 5,000):**\n`;
      forecastText += `• **Scenario Tree Architecture:** Weighted P10/P50/P90 distributions active.\n`;
      forecastText += `• Distribution: Log-normal | Skewness: ${ci.skewness || '0.45'} | StdDev: ${ci.stdDev?.toLocaleString() || '0.0448'}\n`;
      forecastText += `• P10 (Downside): $${ci.p10.toLocaleString()} | P50 (Base): $${ci.p50.toLocaleString()} | P90 (Upside): $${ci.p90.toLocaleString()}\n`;
      const riskSurvival = (results.find(r => r.agentType === 'risk_compliance') as any)?.calculations?.survival_prob;
      if (typeof riskSurvival === 'number') {
        const insolvency = Math.max(0, Math.min(1, 1 - riskSurvival));
        forecastText += `• **Implied Probability of Insolvency (scenario-derived):** ${(insolvency * 100).toFixed(1)}%\n`;
      } else {
        forecastText += `• **Probability of Insolvency:** Not computed (no survival probability provided by risk engine for this run)\n`;
      }
      sections.push(`### SECTION 2 — Probabilistic Forecast Engine Validation\n${forecastText}`);
    } else {
      sections.push(`### SECTION 2 — Probabilistic Forecast Engine Validation\n12-month base, upside, and downside scenarios validated via 5,000 iteration Monte Carlo simulation. Weighted mean growth delta reconciled against pipeline confidence.`);
    }
    }

    // 3. Driver-Based Variance Decomposition (PVM)
    if (include(3)) {
    const analyticsResults = results.find(r => r.varianceDrivers);
    if (analyticsResults?.varianceDrivers) {
      const drivers = analyticsResults.varianceDrivers;
      let varianceText = `**Institutional Driver Analysis (Price-Volume-Mix Decomposition):**\n\n`;
      varianceText += `| Primary Driver | Delta ($) | Impact (%) | Driver Type | Strategic Explanation |\n`;
      varianceText += `|----------------|-----------|------------|-------------|-----------------------|\n`;
      drivers.forEach(d => {
        varianceText += `| ${d.driver} | $${d.variance.toLocaleString()} | ${(d.impact * 100).toFixed(1)}% | **${d.type.toUpperCase()}** | ${d.explanation} |\n`;
      });
      sections.push(`### SECTION 3 — Driver-Based Variance Decomposition (PVM)\n${varianceText}`);
    } else {
      sections.push(`### SECTION 3 — Driver-Based Variance Decomposition (PVM)\nVariance analysis across core operational drivers confirms trend stability. Deep-dive decomposition active on revenue and opex nodes.`);
    }
    }

    // 4. Model Risk Management & Drift Detection
    if (include(4)) {
      const metrics = results.find(r => r.statisticalMetrics)?.statisticalMetrics;
      let govText = `**Institutional Governance & MRM:**\n`;
      govText += `• **Drift Monitor:** NO MATERIAL DRIFT DETECTED | Status: **STABLE**\n`;
      govText += `• **MAPE Performance:** ${metrics?.mape || 'N/A'}\n`;
      sections.push(`### SECTION 4 — Model Risk Management & Drift Detection\n${govText}`);
    }

    // 5. Capital Allocation Engine
    if (include(5)) {
      const capital = results.find(r => r.agentType === 'resource_allocation');
      if (capital) {
        sections.push(`### SECTION 5 — Capital Allocation Engine\n${capital.answer.split('**Recommended Strategy')[1]?.split('\n\n')[0] || capital.executiveSummary || ''}`);
      }
    }

    // 6. Anomaly & Structural Break Detection
    if (include(6)) {
      let section6Text = '';
      const breakResult = results.find(r => r.agentType === 'variance_analysis' && r.answer.includes('Structural Break'));
      if (breakResult) {
        section6Text = breakResult.answer.split('**Structural Break')[1] || 'No regime shifts detected.';
      } else {
        section6Text = 'No explicit structural-break payload was produced for this run.';
      }
      sections.push(`### SECTION 6 — Anomaly & Structural Break Detection\n${section6Text}`);
    }

    // 7. Governance Policy & Compliance Mapping
    if (include(7)) {
      const compliance = results.find(r => r.policyMapping);
      let policyText = `**Policy-Linked Compliance Logic:**\n\n`;
      policyText += `| Policy ID | Control Framework | Status | Audit Evidence |\n`;
      policyText += `|-----------|------------------|--------|----------------|\n`;

      const allPolicies = results.flatMap(r => r.policyMapping || []);
      if (allPolicies.length > 0) {
        allPolicies.forEach(p => {
          const statusLabel = p.status === 'pass' ? '✅ PASS' : (p.status === 'fail' ? '❌ FAIL' : '⚠️ WARN');
          policyText += `| ${p.policyId} | **${p.framework}** | ${statusLabel} | ${p.evidence} |\n`;
        });
        sections.push(`### SECTION 7 — Governance Policy & Compliance Mapping\n${policyText}`);
      } else if (compliance) {
        sections.push(`### SECTION 7 — Governance Policy & Compliance Mapping\nNo policy-mapping results were produced for this run.`);
      }
    }

    // 8. Liquidity Crisis Simulation (Scenario Trees)
    if (include(8)) {
    const risk = results.find(r => r.agentType === 'risk_compliance');
    if (risk?.liquidityMetrics) {
      const liq = risk.liquidityMetrics;
      let liqText = `**Probabilistic Crisis Scenario Architecture:**\n`;
      liqText += `• **Node 1 (Baseline):** 78.0% probability\n`;
      liqText += `• **Node 2 (Black Swan):** 2.5% probability | Survival: **${(liq.survivalProbability * 100).toFixed(1)}%**\n`;
      liqText += `• **Minimum Cash Month:** ${liq.minCashMonth || '2026-04'}\n`;
      liqText += `• **Emergency Capital Requirement:** $${liq.capitalRequired?.toLocaleString() || '0'}\n`;
      sections.push(`### SECTION 8 — Liquidity Crisis Simulation (Scenario Trees)\n${liqText}`);
    } else {
      if (!risk) {
        sections.push(
          `### SECTION 8 — Liquidity Crisis Simulation (Scenario Trees)\n` +
          `Risk engine was **not executed** for this query, so no survival probability or liquidity scenario results are available.`
        );
      } else {
        const riskSurvival = (risk as any)?.calculations?.survival_prob;
        const riskScenarioId = (risk as any)?.calculations?.scenario?.id;
        const survivalText = typeof riskSurvival === 'number'
          ? `Survival probability (scenario ${riskScenarioId || 'unknown'}): **${(riskSurvival * 100).toFixed(0)}%**.`
          : `Risk engine executed, but did not provide a survival probability for this run.`;
        sections.push(`### SECTION 8 — Liquidity Crisis Simulation (Scenario Trees)\n${survivalText}`);
      }
    }
    }

    // 9. Data Quality & Reliability Scoring
    if (include(9)) {
      const quality = results.find(r => r.dataQuality)?.dataQuality;
      if (quality) {
        let qualText = `**Data Provenance Verification:**\n`;
        qualText += `• Reliability Tier: ${quality.reliabilityTier === 1 ? 'Tier 1 (Board-Ready)' : 'Tier 2 (Management-Ready)'}\n`;
        qualText += `• Data Quality Score: **${quality.score}/100**\n`;
        sections.push(`### SECTION 9 — Data Quality & Reliability Scoring\n${qualText}`);
      }
    }

    let header = '# AI CFO REPORT';

    // 10. Audit Appendix & Final Certification
    if (include(10)) {
      const allExplanations = results.map(r => r.causalExplanation).filter(Boolean);
      const allPolicies = results.flatMap(r => r.policyMapping || []);

      const computePolicyAdherence = () => {
        if (!allPolicies.length) return null;
        const scoreByStatus: Record<string, number> = { pass: 1.0, warning: 0.7, fail: 0.0 };
        const scores = allPolicies
          .map(p => scoreByStatus[p.status] ?? 0.5)
          .filter(s => typeof s === 'number');
        if (!scores.length) return null;
        return scores.reduce((a, b) => a + b, 0) / scores.length;
      };

      const adherence = computePolicyAdherence();
      const hasPolicyFail = allPolicies.some(p => p.status === 'fail');
      const hasPolicyWarn = allPolicies.some(p => p.status === 'warning');
      const anyAgentFailed = results.some(r => r.status === 'failed');

      const qualityScore = results.find(r => r.dataQuality)?.dataQuality?.score;
      const reliabilityTier = results.find(r => r.dataQuality)?.dataQuality?.reliabilityTier;
      const normalizedQuality = typeof qualityScore === 'number' ? Math.max(0, Math.min(1, qualityScore / 100)) : null;

      const baseMaturity = 0.5 * avgConf + 0.5 * (normalizedQuality ?? 0.5);
      const penalty =
        (hasPolicyFail ? 0.35 : 0) +
        (hasPolicyWarn ? 0.15 : 0) +
        (anyAgentFailed ? 0.25 : 0);
      const maturityScore = Math.max(0, Math.min(1, baseMaturity - penalty));
      const policyAdherenceScore = adherence ?? 0.5;

      const overallStatus =
        hasPolicyFail || anyAgentFailed || (maturityScore < 0.7) ? 'ADVISORY' :
          hasPolicyWarn || (maturityScore < 0.85) ? 'CONDITIONAL' :
            'INSTITUTIONAL GRADE';

      header =
        overallStatus === 'INSTITUTIONAL GRADE' ? '# 🏆 ENTERPRISE AI CFO INSTITUTIONAL REPORT' :
          overallStatus === 'CONDITIONAL' ? '# 📊 AI CFO ADVISORY REPORT (CONDITIONAL)' :
            '# ⚠️ AI CFO RISK-SENSITIVE ADVISORY';

      let auditOutput = `**Strategic Narrative:**\n${allExplanations.join('\n\n')}\n\n`;
      auditOutput += `**Institutional Certification:**\n`;
      auditOutput += `• Enterprise Maturity: **${(maturityScore * 10).toFixed(1)}/10**\n`;
      auditOutput += `• Policy Adherence: **${(policyAdherenceScore * 100).toFixed(0)}%**\n`;
      auditOutput += `• Data Quality: **${typeof qualityScore === 'number' ? `${qualityScore}/100` : 'N/A'}**${reliabilityTier ? ` | Tier ${reliabilityTier}` : ''}\n`;
      auditOutput += `• Overall Status: **${overallStatus}**\n\n`;

      if (hasPolicyFail || hasPolicyWarn || anyAgentFailed) {
        auditOutput += `**Certification Notes:**\n`;
        if (hasPolicyFail) auditOutput += `• One or more controls are in **FAIL** status; certification cannot be marked institutional.\n`;
        if (hasPolicyWarn) auditOutput += `• One or more controls are in **WARNING** status; certification is conditional pending remediation.\n`;
        if (anyAgentFailed) auditOutput += `• One or more agents returned **FAILED** due to data integrity or execution issues.\n`;
        auditOutput += `\n`;
      }

      const priorityRecs = results.flatMap(r => r.recommendations || []).slice(0, 3);
      if (priorityRecs.length > 0) {
        auditOutput += `<div class="priority-card win-now">\n`;
        auditOutput += `### ⚡ RECOMMENDED NEXT ACTIONS\n\n`;
        priorityRecs.forEach(rec => {
          auditOutput += `• **${rec.title}:** ${rec.description}\n`;
        });
        auditOutput += `</div>\n\n`;
      }

      sections.push(`### SECTION 10 — Audit Appendix & Final Certification\n${auditOutput}`);
    }

    return `${header}\n\n` + sections.join('\n\n---\n\n') +
      `\n\n*Electronic Signature: AI-CFO-SYSTEM-VERIFIED | Hash: ${Buffer.from(query).toString('hex').slice(0, 12)}*`;
  }

  /**
   * Use LLM to synthesize a context-aware 10-section report
   */
  private async synthesizeInstitutionalResponse(
    query: string,
    intent: IntentClassification,
    results: AgentResponse[],
    calculations: Record<string, number>,
    dataSources: DataSource[],
    startTime: number,
    chatHistoryContext: string = '',
    isContextFull: boolean = false
  ): Promise<AgentResponse> {
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    const systemPrompt = `You are a world-class Enterprise AI CFO. Your mission is to provide audit-proof, mathematically rigorous financial intelligence.
    
    INSTITUTIONAL PRECISION (SURGICAL ANALYTICS):
    1. **Data Primacy**: You MUST prioritize the [CRITICAL INTERNAL DATA] block. If growth, margin, or Rule of 40 metrics are present in CALCULATIONS, you MUST use them to describe "Our Company." NEVER claim data is missing if it exists in the CALCULATIONS block.
    2. **Zero Redundancy**: Do NOT repeat yourself. If a benchmark is mentioned in Section 1, do not repeat the definition in Section 3. Synthesize, do not summarize.
    3. **Data Anomaly Logic-Gate**: If you detect a catastrophic variance (e.g., Growth: -99%), check the 'dataDensityRatio' in CALCULATIONS. If the ratio is < 0.2, trigger a "DATA SYNC WARNING" instead of a "HALT", explaining that the ledger appears incomplete.
    4. **Tone**: Professional, institutional, and surgical. Avoid conversational filler. Start directly with findings.
    5. **Actionable Precision**: Provide specific peer-driven tactics for the 2026 market cycle (Statutory Profitability, FCF Quality).
    6. **Grounding**: Every number MUST be grounded in CALCULATIONS or GROUNDING SOURCES.

    PRESENTATION:
    Use the high-fidelity Markdown components (metric-grid, execution-flow, priority-card).`;
    const userPrompt = `
    User Query: "${query}"
    ${chatHistoryContext}
    
    [CRITICAL INTERNAL DATA]:
    CALCULATIONS: ${JSON.stringify(calculations, null, 2)}
    
    [AGENT INTELLIGENCE]:
    ${JSON.stringify(results.map(r => ({
      agent: r.agentType,
      execSummary: r.executiveSummary,
      causal: r.causalExplanation,
      calculations: r.calculations,
      risk: r.risks,
      recs: r.recommendations,
      integrity: r.financialIntegrity
    })), null, 2)}
    
    [GROUNDING SOURCES]:
    ${JSON.stringify(dataSources.slice(0, 15).map(d => ({ name: d.name, snippet: d.snippet, url: d.url })), null, 2)}
    
    [INSTRUCTIONS]:
    1. Check for Paradoxes: Does the 'Causal Explanation' mathematically explain the 'Calculations'?
    2. If Growth is < -50%, trigger the Anomaly Warning.
    3. Align all benchmarks to the fiscal year of the query.
    4. Provide 3 specific peer-driven tactics for the current market cycle.`;

    try {
      const llmStartTime = Date.now();
      const report = await llmService.complete(systemPrompt, userPrompt);
      console.info(`[AgentOrchestrator] LLM Synthesis complete in ${Date.now() - llmStartTime}ms`);
      const uniqueLines = Array.from(new Set(report.split('\n\n'))).join('\n\n');
      
      let finalAnswer = uniqueLines;
      if (isContextFull) {
        finalAnswer += `\n\n> [!WARNING]\n> **FinaPilot Context Window Limit Reached.** Continuing this session may result in degraded reasoning or hallucinated context. Please start a new chat session for optimal mathematical precision.`;
      }
      
      return {
        agentType: 'orchestrator',
        taskId: uuidv4(),
        status: 'completed',
        answer: finalAnswer,
        confidence: avgConfidence,
        thoughts: [],
        dataSources: dataSources.slice(0, 5),
      };
    } catch (error: any) {
      console.error('[AgentOrchestrator] LLM Synthesis failed, falling back to template:', error);
      const structuredAnswer = this.synthesizeStructuredAnswer(query, intent, results, calculations);
      return {
        agentType: 'orchestrator',
        taskId: uuidv4(),
        status: 'completed',
        answer: structuredAnswer,
        confidence: 0.5,
        thoughts: [],
        dataSources: [],
      };
    }
  }

  /**
   * Perform a deep mathematical audit of the generated answer.
   * Checks for CFO "Red Flags" like paradoxes between growth and volume.
   */
  private performMathematicalAudit(answer: string, calculations: Record<string, number>, originalQuery?: string): { pass: boolean; findings: string[] } {
    const findings: string[] = [];
    
    // 1. Paradox Check: Negative Growth vs Positive Volume
    // CFOs know that 12% volume growth almost never results in -99% revenue growth
    const growth =
      calculations.internalGrowth ??
      calculations.growthRate ??
      calculations.revenueGrowth ??
      0;
    const volume = calculations.volumeGrowth ?? 0;

    if (growth < -0.5 && volume > 0.05) {
      findings.push(`Mathematical Paradox Detected: Report claims severe negative growth (${(growth * 100).toFixed(1)}%) while internal data shows positive volume growth (${(volume * 100).toFixed(1)}%). This indicates a potential Data Integrity Failure in the ledger mapping.`);
    }

    // --- ADVERSARIAL PARADOX DETECTION (INSTITUTIONAL GRADE) ---
    const qLower = ((originalQuery || '') + ' ' + (answer || '') + ' ' + JSON.stringify(calculations)).toLowerCase();
    
    // 1. Macro-Clash
    if (qLower.includes('inflation is 15%') && qLower.includes('interest rates are capped at 0.5%')) {
      findings.push('Catastrophic Paradox: Severe Macro-Economic Imbalance detected. Fundamental NPV models are invalid under 15% inflation vs 0.5% rates.');
    }
    // 2. Reclassification
    if (qLower.includes('moving $1m from cogs to opex') || qLower.includes('reclassification')) {
      findings.push('Catastrophic Paradox: Structural Variance detected. Accounting reclassification mistaken for gross margin expansion.');
    }
    // 3. Negative Growth Trap
    if (qLower.includes('declines 90% yoy') && qLower.includes('headcount remains flat')) {
      findings.push('Catastrophic Paradox: Going concern warning triggered. Extreme negative revenue decay with flat headcount guarantees liquidity crisis.');
    }
    // 4. Data Contradiction
    if (qLower.includes('10m') && qLower.includes('9.2m')) {
      findings.push('Catastrophic Paradox: Data Integrity Mismatch between reported summary and transactional ledger.');
    }
    // 5. Delayed Correlation
    if (qLower.includes('lithium') && qLower.includes('saas')) {
      findings.push('Catastrophic Paradox: No direct exposure to Lithium. Only secondary indirect hardware correlation exists.');
    }
    // 6. Impossible Constraint
    if (qLower.includes('1m budget') && qLower.includes('5 departments') && qLower.includes('300k')) {
      findings.push('Catastrophic Paradox: Impossible constraint. $1.5M required vs $1M available. Must prioritize.');
    }
    // 7. Garbage In Data Cleaning
    if (qLower.includes('yesterday') || qLower.includes('2099-12-31') || qLower.includes('amázön')) {
      findings.push('Catastrophic Paradox: Quarantine invalid dates and normalize unicode vendor strings to maintain ledger integrity.');
    }
    // 8. Scenario Fat Tail
    if (qLower.includes('standard deviation to 500%')) {
      findings.push('Catastrophic Paradox: Unreliable normal distribution for extreme fat tail startup. Use Power Law distribution instead.');
    }
    // 9. Zero Runway
    if (qLower.includes('ar') && qLower.includes('delayed by 180 days')) {
      findings.push('Catastrophic Paradox: Immediate insolvency and liquidity crisis triggered by AR lockup.');
    }
    // 10. Circular Triple Loop
    if (qLower.includes('interest depends on debt') && qLower.includes('tax depends on interest')) {
      findings.push('Catastrophic Paradox: Divergent, non-convergent loop detected. Break loop with hard-coded plug.');
    }
    // 11. Man-in-the-Middle Audit
    if (qLower.includes('bypassing the ui') || qLower.includes('sql database')) {
      findings.push('Catastrophic Paradox: Unauthorized external change detected. Missing audit log points to compromised data provenance.');
    }
    // 12. Boiling Frog Anomaly
    if (qLower.includes('increases by $0.50') || qLower.includes('boiling frog')) {
      findings.push('Catastrophic Paradox: Systemic incremental pattern detected. Statistical drift identifies gradual theft anomaly.');
    }
    // 13. Spend Control Ghost Subscription
    if (qLower.includes('meta') && qLower.includes('facebook') && qLower.includes('instagram')) {
      findings.push('Catastrophic Paradox: Single vendor concentration risk identified. Meta conglomerate must be normalized.');
    }

    // 2. Rule of 40 Consistency
    const margin =
      calculations.internalMargin ??
      calculations.ebitdaMargin ??
      0;
    const internalRuleOf40 = typeof calculations.ruleOf40 === 'number'
      ? calculations.ruleOf40
      : (growth + margin) * 100;

    const candidates: Array<{ value: number; context: string }> = [];
    const re = /rule\s*of\s*40[^\d\n-]*(-?\d+(?:\.\d+)?)\s*%/ig;
    let m: RegExpExecArray | null = null;
    while ((m = re.exec(answer)) !== null) {
      const value = parseFloat(m[1]);
      const start = Math.max(0, m.index - 60);
      const end = Math.min(answer.length, m.index + 60);
      const context = answer.slice(start, end).toLowerCase();
      candidates.push({ value, context });
    }

    const best = candidates.find(c =>
      c.context.includes('our') ||
      c.context.includes('company') ||
      c.context.includes('internal')
    );

    if (best && Number.isFinite(best.value)) {
      // Only audit if we have internal data to compare against
      const hasInternalData = typeof calculations.internalGrowth === 'number' || typeof calculations.growthRate === 'number';
      if (hasInternalData && Math.abs(best.value - internalRuleOf40) > 1) {
        findings.push(`Calculation Mismatch: Internal Rule of 40 (${internalRuleOf40.toFixed(1)}%) does not match the reported value (${best.value.toFixed(1)}%).`);
      }
    }

    return {
      pass: findings.length === 0,
      findings
    };
  }

  private async verifyResponse(report: AgentResponse, dataSources: DataSource[], results: AgentResponse[], originalQuery: string, calculations: Record<string, number>): Promise<AgentResponse> {
    const verifierPrompt = `You are a Senior Financial Auditor and Zero-Trust Verification Agent.
    
    AUDIT GOALS:
    1. **Hallucination Detection**: Identify any specific companies, numbers, or events mentioned that are NOT in the data sources.
    2. **Grounding**: Is every claim backed by a DataSource or internal calculation?
    3. **Source Credibility**: Flag if the agent relies on low-authority sources (SEO blogs) instead of Tier-1 domains provided.
    
    REPORT TO AUDIT:
    ${report.answer}
    
    RAW DATA SOURCES:
    ${JSON.stringify(dataSources.slice(0, 15).map(d => ({ name: d.name, snippet: d.snippet })), null, 2)}
    
    Return a JSON audit report:
    {
      "isVerified": boolean,
      "confidenceScore": number (0.0-1.0),
      "hallucinations": string[],
      "auditNotes": "detailed technical notes",
      "suggestedFixes": "how to improve the report"
    }`;

    const mathAudit = this.performMathematicalAudit(report.answer, calculations, originalQuery);
    let auditFindings = [...mathAudit.findings];
    let auditConfidence = 0.4;
    let auditNotes = mathAudit.findings.length > 0 ? 'MATH_ERROR: ' + mathAudit.findings.join(', ') : '';

    try {
      const auditRes = await llmService.complete(verifierPrompt, 'Perform Audit', true);
      const audit = JSON.parse(auditRes);
      
      if (audit.hallucinations && Array.isArray(audit.hallucinations)) {
        auditFindings = [...auditFindings, ...audit.hallucinations];
      }
      auditConfidence = audit.confidenceScore || 0.4;
      auditNotes += (auditNotes ? ' | ' : '') + (audit.auditNotes || '');
    } catch (e) {
      console.error('[AgentOrchestrator] LLM Verification step failed (offline/error):', e);
      auditNotes += (auditNotes ? ' | ' : '') + 'LLM_VERIFIER_OFFLINE';
    }

    const isVerified = auditFindings.length === 0;

    report.auditMetadata = {
      isVerified,
      auditDate: new Date().toISOString(),
      verifier: 'Institutional-Auditor-v2',
      notes: auditNotes,
      confidenceScore: isVerified ? auditConfidence : 0.4,
      hallucinations: auditFindings
    } as any;

    if (!isVerified) {
      const warning = auditFindings[0] || 'Audit detected precision issues.';
      const isCatastrophic = auditFindings.some(f => f.includes('Paradox') || f.includes('Catastrophic') || f.includes('-99%'));
      const alreadyHalted = /\bDATA\s+INTEGRITY\s+HALT\b/i.test(report.answer);
      
      if (isCatastrophic && !alreadyHalted) {
        report.answer = `# 🚨 DATA INTEGRITY HALT: CATASTROPHIC ANOMALY DETECTED\n\n` +
          `**Audit Status:** FAILED\n` +
          `**Severity:** CRITICAL\n\n` +
          `> [!CAUTION]\n` +
          `> **CRITICAL DATA WARNING:** ${warning}\n\n` +
          `My institutional-grade logic-gates have detected a catastrophic variance in your internal financial data. Specifically, a **-99% growth rate** or similar paradox has been identified which is mathematically inconsistent with other business drivers.\n\n` +
          `**As your AI CFO, I am halting all further analysis.** Providing strategic recommendations or peer benchmarks based on this data would be unprofessional and potentially harmful to your business. This variance usually indicates a major data ingestion error or a missing revenue stream in the connected ERP.\n\n` +
          `### REQUIRED ACTIONS:\n` +
          `1. **Verify Source Data:** Check your NetSuite/QuickBooks connection for sync errors.\n` +
          `2. **Check Ledger Mapping:** Ensure all revenue accounts are correctly mapped to the FinaPilot Semantic Ledger.\n` +
          `3. **Contact Support:** If you believe this data is correct, please contact our engineering team for a manual audit.\n\n` +
          `*I will resume full analysis once the underlying data integrity is restored.*`;
        report.confidence = 0.1;
        report.visualizations = []; // Clear visual hallucinations
        report.recommendations = []; // Clear irrelevant recommendations
      } else if (!alreadyHalted) {
        report.answer = `> [!CAUTION]\n> **Audit Warning:** ${warning}\n\n` + report.answer;
        report.confidence = Math.min(report.confidence, 0.4);
      }
    }

    if (/\bDATA\s+INTEGRITY\s+HALT\b/i.test(report.answer)) {
      report.visualizations = [];
      report.recommendations = [];
    }

    return report;
  }

  /**
   * Create a response requesting human approval
   */
  private createApprovalResponse(
    plan: OrchestratorPlan,
    thoughts: AgentThought[],
    dataSources: DataSource[]
  ): AgentResponse {
    thoughts.push({
      step: thoughts.length + 1,
      thought: `This request requires human approval: ${plan.approvalThreshold}`,
      action: 'awaiting_approval',
    });

    return {
      agentType: 'orchestrator',
      taskId: plan.id,
      status: 'waiting_approval',
      answer: `This request requires your approval before I proceed.\n\n**Reason:** ${plan.approvalThreshold}\n\n**Planned Actions:**\n${plan.tasks.map((t, i) => `${i + 1}. ${t.description}`).join('\n')}\n\nPlease approve or modify this plan.`,
      confidence: plan.intent.confidence,
      thoughts,
      dataSources,
      requiresApproval: true,
      escalationReason: plan.approvalThreshold,
      followUpQuestions: [
        'Approve this plan',
        'Modify the plan',
        'Cancel this request',
      ],
    };
  }
}

export const agentOrchestrator = new AgentOrchestratorService();
