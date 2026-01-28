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
import { treasuryAgent } from './treasury-agent.service';
import { forecastingAgent } from './forecasting-agent.service';
import { analyticsAgent } from './analytics-agent.service';
import { anomalyAgent } from './anomaly-agent.service';
import { reportingAgent } from './reporting-agent.service';
import { capitalAgent } from './capital-agent.service';
import { riskAgent } from './risk-agent.service';
import { strategicAgent } from './strategic-agent.service';
import { complianceAgent } from './compliance-agent.service';

class AgentOrchestratorService {
  private agents: Map<AgentType, any> = new Map();

  constructor() {
    // Register specialized agents for comprehensive CFO operations
    // Core Financial Agents
    this.agents.set('treasury', treasuryAgent);       // Cash, runway, burn
    this.agents.set('forecasting', forecastingAgent); // Revenue predictions, scenarios
    this.agents.set('analytics', analyticsAgent);     // Variance, drill-down
    this.agents.set('anomaly', anomalyAgent);         // Duplicate detection, fraud
    this.agents.set('reporting', reportingAgent);     // Board summaries, narratives

    // Advanced Strategic Agents
    this.agents.set('capital', capitalAgent);         // Capital allocation, portfolio optimization
    this.agents.set('risk', riskAgent);               // Stress testing, tail risk, black swan
    this.agents.set('strategic', strategicAgent);     // M&A, cost optimization, synergies
    this.agents.set('compliance', complianceAgent);   // Tax, regulatory, audit readiness
  }

  /**
   * Main entry point - processes a user query through the agentic workflow
   */
  async processQuery(
    orgId: string,
    userId: string,
    query: string,
    context?: Record<string, any>,
    bypassApproval: boolean = false
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    const thoughts: AgentThought[] = [];
    const dataSources: DataSource[] = [];

    try {
      // Step 1: Classify intent
      thoughts.push({
        step: 1,
        thought: `Analyzing query: "${query}"`,
        action: 'intent_classification',
      });

      const intent = await this.classifyIntent(query);

      thoughts.push({
        step: 2,
        thought: `Identified intent: ${intent.primaryIntent} (confidence: ${(intent.confidence * 100).toFixed(0)}%)`,
        observation: `Required agents: ${intent.requiredAgents.join(', ')}`,
      });

      // Step 2: Create execution plan
      const plan = await this.createPlan(orgId, query, intent);

      thoughts.push({
        step: 3,
        thought: `Created execution plan with ${plan.tasks.length} tasks`,
        action: plan.requiresApproval ? 'awaiting_approval' : 'executing_plan',
      });

      // Step 3: Check if human approval is needed
      if (plan.requiresApproval && !bypassApproval) {
        return this.createApprovalResponse(plan, thoughts, dataSources);
      }

      // Step 4: Execute tasks through specialized agents
      const results = await this.executePlan(orgId, userId, plan, thoughts, dataSources);

      // Step 5: Aggregate data from all agents
      const allRecommendations = results.flatMap(r => r.recommendations || []);
      const allCalculations = results.reduce((acc, r) => ({ ...acc, ...r.calculations }), {});
      const allVisualizations = results.flatMap(r => r.visualizations || []);

      // Step 6: Synthesize final response narrative
      let finalAnswer = '';
      if (intent.complexity !== 'simple' && results.length > 0) {
        thoughts.push({
          step: thoughts.length + 1,
          thought: 'Synthesizing professional CFO narrative using LLM...',
          action: 'narrative_synthesis',
        });

        try {
          finalAnswer = await llmService.synthesizeCfoReport(
            query,
            results.map(r => r.answer),
            allCalculations
          );
        } catch (llmError) {
          console.warn('[AgentOrchestrator] LLM Synthesis failed, using deterministic fallback');
          finalAnswer = this.combineAnswers(intent.primaryIntent, results.map(r => r.answer), allCalculations);
        }
      } else {
        finalAnswer = this.combineAnswers(intent.primaryIntent, results.map(r => r.answer), allCalculations);
      }

      const response = await this.synthesizeResponse(
        query,
        intent,
        results,
        finalAnswer,
        allCalculations,
        allRecommendations,
        allVisualizations,
        thoughts,
        dataSources,
        startTime
      );

      return response;
    } catch (error: any) {
      console.error('[AgentOrchestrator] Error:', error);

      return {
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
    }
  }

  /**
   * Classify the intent of a user query
   */
  async classifyIntent(query: string): Promise<IntentClassification> {
    const queryLower = query.toLowerCase();

    // Check against known patterns
    for (const [intentName, config] of Object.entries(QUERY_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(queryLower)) {
          let complexity = config.complexity;

          // Dynamic complexity upgrade: if user asks for reasoning/analysis, it's NOT simple
          if (/(?:why|because|analyze|explain|plan|strategy|how|what if)/i.test(queryLower)) {
            complexity = complexity === 'simple' ? 'moderate' : 'complex';
          }

          return {
            primaryIntent: intentName,
            confidence: 0.85,
            entities: this.extractEntities(query),
            requiredAgents: config.agents,
            complexity,
            requiresRealTimeData: true,
          };
        }
      }
    }

    // Default: general financial query
    return {
      primaryIntent: 'general_financial_query',
      confidence: 0.6,
      entities: this.extractEntities(query),
      requiredAgents: ['analytics', 'treasury'],
      complexity: 'moderate',
      requiresRealTimeData: true,
    };
  }

  /**
   * Extract entities from query (numbers, dates, percentages, etc.)
   */
  private extractEntities(query: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // Extract percentages
    const percentMatch = query.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch) {
      entities.percentage = parseFloat(percentMatch[1]);
    }

    // Extract monetary values
    const moneyMatch = query.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:k|K|m|M|million|thousand)?/);
    if (moneyMatch) {
      let value = parseFloat(moneyMatch[1].replace(/,/g, ''));
      if (/k|K|thousand/i.test(query)) value *= 1000;
      if (/m|M|million/i.test(query)) value *= 1000000;
      entities.amount = value;
    }

    // Extract time periods
    const timeMatch = query.match(/(?:Q([1-4])|next\s+(\w+)|last\s+(\w+)|(\d+)\s*months?)/i);
    if (timeMatch) {
      if (timeMatch[1]) entities.quarter = `Q${timeMatch[1]}`;
      if (timeMatch[2]) entities.period = `next_${timeMatch[2]}`;
      if (timeMatch[3]) entities.period = `last_${timeMatch[3]}`;
      if (timeMatch[4]) entities.months = parseInt(timeMatch[4]);
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
      treasury: 'calculation',
      forecasting: 'simulation',
      analytics: 'analysis',
      anomaly: 'anomaly_scan',
      reporting: 'report_generation',
      tax: 'calculation',
      procurement: 'analysis',
      capital: 'simulation',
      risk: 'simulation',
      strategic: 'recommendation',
      compliance: 'analysis',
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

    // High value operations require approval
    if (intent.entities.amount && intent.entities.amount > HITL_THRESHOLDS.highValueTransaction) {
      return true;
    }

    // Complex multi-agent operations may require approval
    if (intent.complexity === 'complex' && intent.requiredAgents.length > 2) {
      // Only require approval for irreversible actions
      const irreversibleIntents = ['budget_change', 'contract_approval', 'large_transfer'];
      if (irreversibleIntents.includes(intent.primaryIntent)) {
        return true;
      }
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
   * Execute the plan through specialized agents with shared context
   */
  async executePlan(
    orgId: string,
    userId: string,
    plan: OrchestratorPlan,
    thoughts: AgentThought[],
    dataSources: DataSource[]
  ): Promise<AgentResponse[]> {
    const results: AgentResponse[] = [];
    const sharedContext: Record<string, any> = {
      calculations: {},
      observations: [],
      dataSources: []
    };

    // Execute tasks (can be parallelized based on plan.parallelizable)
    for (const taskId of plan.executionOrder) {
      const task = plan.tasks.find(t => t.id === taskId);
      if (!task) continue;

      const agentType = plan.agents[plan.tasks.indexOf(task)];
      const agent = this.agents.get(agentType);

      if (!agent) {
        thoughts.push({
          step: thoughts.length + 1,
          thought: `Agent ${agentType} not available, skipping task`,
        });
        continue;
      }

      thoughts.push({
        step: thoughts.length + 1,
        thought: `Executing ${agentType} agent for: ${task.description}`,
        action: 'agent_execution',
      });

      try {
        // Pass sharedContext to the agent for "Better than CFO" holistic reasoning
        const result = await agent.execute(orgId, userId, {
          ...task.params,
          sharedContext
        });
        results.push(result);

        // Update shared context for subsequent agents
        if (result.calculations) {
          sharedContext.calculations = { ...sharedContext.calculations, ...result.calculations };
        }
        if (result.answer) {
          sharedContext.observations.push(`${agentType}: ${result.answer.substring(0, 500)}`);
        }
        if (result.dataSources) {
          sharedContext.dataSources.push(...result.dataSources);
          dataSources.push(...result.dataSources);
        }

        thoughts.push({
          step: thoughts.length + 1,
          thought: `${agentType} agent completed with confidence ${(result.confidence * 100).toFixed(0)}%`,
          observation: result.answer.substring(0, 100) + '...',
          dataSources: result.dataSources,
        });
      } catch (error: any) {
        thoughts.push({
          step: thoughts.length + 1,
          thought: `${agentType} agent failed: ${error.message}`,
        });
      }
    }

    return results;
  }

  /**
   * Synthesize final response from agent results and aggregated data
   */
  async synthesizeResponse(
    query: string,
    intent: IntentClassification,
    results: AgentResponse[],
    finalAnswer: string,
    allCalculations: Record<string, number>,
    allRecommendations: AgentRecommendation[],
    allVisualizations: any[],
    thoughts: AgentThought[],
    dataSources: DataSource[],
    startTime: number
  ): Promise<AgentResponse> {
    // Calculate overall confidence (weighted average)
    const avgConfidence = results.length > 0
      ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      : 0.5;

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
      dataSources,
      calculations: allCalculations,
      recommendations: allRecommendations,
      followUpQuestions,
      visualizations: allVisualizations,
    };
  }

  /**
   * Combine answers from multiple agents into a cohesive CFO report
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
        // Production Level Synthesis: Build a professional CFO report
        let report = `### 📊 AI CFO Executive Report\n\n`;

        // Key Financial Snapshot
        if (calculations.revenue || calculations.cashBalance || calculations.burnRate) {
          report += `#### 🏷️ Financial Snapshot\n`;
          if (calculations.cashBalance) report += `• **Cash Position:** $${calculations.cashBalance.toLocaleString()}\n`;
          if (calculations.revenue) report += `• **Monthly Revenue:** $${calculations.revenue.toLocaleString()}\n`;
          if (calculations.burnRate) report += `• **Monthly Burn:** $${calculations.burnRate.toLocaleString()}\n`;
          if (calculations.runway) report += `• **Current Runway:** ${calculations.runway.toFixed(1)} months\n`;
          report += `\n`;
        }

        report += `#### 🔍 Strategic Analysis & Insights\n`;
        // Intelligently combine insights without duplicates
        const uniqueInsights = Array.from(new Set(answers.map(a => a.trim())));
        uniqueInsights.forEach((insight, idx) => {
          // Clean up individual agent answers to fit into a report format
          const cleanedInsight = insight
            .replace(/^#+.*$/gm, '') // Remove nested headers
            .replace(/\*\*Analysis Summary\*\*/g, '')
            .trim();

          if (cleanedInsight) {
            report += `${cleanedInsight}\n\n`;
          }
        });

        report += `---\n*This analysis was synthesized by a collaboration of specialized agents (Treasury, Analytics, and Forecasting).*`;

        return report;
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
