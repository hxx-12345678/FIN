/**
 * AI CFO Multi-Agent System - Agent Type Definitions
 * 
 * This implements a proper agentic workflow with specialized agents
 * that collaborate to handle diverse CFO tasks.
 */

// Agent types that specialize in different CFO functions
export type AgentType = 
  | 'treasury'      // Cash management, runway, burn rate
  | 'forecasting'   // Revenue predictions, scenario modeling
  | 'analytics'     // Drill-down analysis, EBITDA variance
  | 'anomaly'       // Duplicate detection, fraud scanning
  | 'reporting'     // Board summaries, narrative generation
  | 'tax'           // Tax compliance, filings
  | 'procurement'   // Vendor analysis, cost optimization
  | 'capital'       // Capital allocation, portfolio optimization
  | 'risk'          // Stress testing, tail risk, black swan analysis
  | 'compliance'    // Regulatory compliance, audit readiness
  | 'strategic'     // M&A analysis, strategic recommendations
  | 'orchestrator'; // Coordinates other agents

// Agent execution status
export type AgentStatus = 'idle' | 'thinking' | 'executing' | 'waiting_approval' | 'completed' | 'failed';

// Agent action types
export type AgentActionType = 
  | 'data_retrieval'      // Fetch data from sources
  | 'calculation'         // Perform financial calculations
  | 'analysis'            // Analyze data patterns
  | 'simulation'          // Run what-if scenarios
  | 'anomaly_scan'        // Detect anomalies
  | 'report_generation'   // Generate reports
  | 'recommendation'      // Provide strategic recommendations
  | 'escalation';         // Escalate to human

// Data source types for explainability
export interface DataSource {
  type: 'transaction' | 'connector' | 'model_run' | 'budget' | 'manual_input' | 'calculation';
  id: string;
  name: string;
  timestamp: Date;
  confidence: number;
  snippet?: string;
}

// Agent thought/reasoning step for explainability
export interface AgentThought {
  step: number;
  thought: string;
  action?: string;
  observation?: string;
  dataSources?: DataSource[];
}

// Agent task definition
export interface AgentTask {
  id: string;
  type: AgentActionType;
  description: string;
  params: Record<string, any>;
  status: AgentStatus;
  result?: any;
  error?: string;
  thoughts: AgentThought[];
  dataSources: DataSource[];
  startedAt?: Date;
  completedAt?: Date;
}

// Agent response with full context
export interface AgentResponse {
  agentType: AgentType;
  taskId: string;
  status: AgentStatus;
  answer: string;
  confidence: number;
  thoughts: AgentThought[];
  dataSources: DataSource[];
  calculations?: Record<string, number>;
  recommendations?: AgentRecommendation[];
  requiresApproval?: boolean;
  escalationReason?: string;
  followUpQuestions?: string[];
  visualizations?: AgentVisualization[];
}

// Recommendation from agent
export interface AgentRecommendation {
  id: string;
  title: string;
  description: string;
  impact: {
    type: 'positive' | 'negative' | 'neutral';
    metric: string;
    value: string;
    confidence: number;
  };
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  actions: string[];
  risks?: string[];
  dataSources: DataSource[];
}

// Visualization data for UI
export interface AgentVisualization {
  type: 'chart' | 'table' | 'metric' | 'comparison';
  title: string;
  data: any;
  config?: Record<string, any>;
}

// Intent classification result
export interface IntentClassification {
  primaryIntent: string;
  subIntent?: string;
  confidence: number;
  entities: Record<string, any>;
  requiredAgents: AgentType[];
  complexity: 'simple' | 'moderate' | 'complex';
  requiresRealTimeData: boolean;
}

// Orchestrator plan for multi-agent coordination
export interface OrchestratorPlan {
  id: string;
  query: string;
  intent: IntentClassification;
  agents: AgentType[];
  tasks: AgentTask[];
  executionOrder: string[]; // Task IDs in order
  parallelizable: string[][]; // Groups of task IDs that can run in parallel
  estimatedDuration: number;
  requiresApproval: boolean;
  approvalThreshold?: string;
}

// Human-in-the-loop approval request
export interface ApprovalRequest {
  id: string;
  planId: string;
  type: 'high_value_decision' | 'irreversible_action' | 'policy_exception' | 'uncertainty';
  description: string;
  context: Record<string, any>;
  recommendations: AgentRecommendation[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  deadline?: Date;
  status: 'pending' | 'approved' | 'rejected' | 'modified';
}

// Query patterns for intent classification
export const QUERY_PATTERNS: Record<string, { patterns: RegExp[]; agents: AgentType[]; complexity: IntentClassification['complexity'] }> = {
  // Treasury queries
  'cash_runway': {
    patterns: [
      /cash\s*runway/i,
      /how\s*long.*cash/i,
      /runway.*month/i,
      /when.*run\s*out/i,
      /cash.*last/i,
    ],
    agents: ['treasury'],
    complexity: 'simple',
  },
  'burn_rate': {
    patterns: [
      /burn\s*rate/i,
      /monthly\s*burn/i,
      /spending.*month/i,
      /how\s*much.*spending/i,
    ],
    agents: ['treasury'],
    complexity: 'simple',
  },
  
  // Analytics queries
  'variance_analysis': {
    patterns: [
      /why.*miss/i,
      /variance.*explain/i,
      /ebitda.*miss/i,
      /forecast.*actual/i,
      /explain.*difference/i,
    ],
    agents: ['analytics', 'forecasting'],
    complexity: 'complex',
  },
  
  // Forecasting queries
  'scenario_modeling': {
    patterns: [
      /model.*drop/i,
      /what\s*if.*revenue/i,
      /scenario.*percent/i,
      /simulate.*change/i,
      /model.*increase/i,
    ],
    agents: ['forecasting', 'treasury'],
    complexity: 'moderate',
  },
  'revenue_forecast': {
    patterns: [
      /revenue.*forecast/i,
      /predict.*revenue/i,
      /revenue.*next/i,
      /growth.*projection/i,
    ],
    agents: ['forecasting'],
    complexity: 'moderate',
  },
  
  // Anomaly detection queries
  'duplicate_detection': {
    patterns: [
      /duplicate.*payment/i,
      /double.*payment/i,
      /suspicious.*transaction/i,
      /fraud.*detect/i,
      /anomaly.*payment/i,
    ],
    agents: ['anomaly'],
    complexity: 'moderate',
  },
  
  // Reporting queries
  'board_summary': {
    patterns: [
      /board.*summary/i,
      /board.*meeting/i,
      /executive.*summary/i,
      /draft.*report/i,
      /prepare.*board/i,
    ],
    agents: ['reporting', 'analytics', 'treasury'],
    complexity: 'complex',
  },
  
  // Cost optimization
  'cost_optimization': {
    patterns: [
      /reduce.*cost/i,
      /cut.*expense/i,
      /optimize.*spending/i,
      /save.*money/i,
      /lower.*burn/i,
      /cut.*(\d+).*percent.*cost/i,
      /(\d+)%.*cost.*cut/i,
    ],
    agents: ['procurement', 'treasury', 'analytics'],
    complexity: 'moderate',
  },

  // Capital allocation & optimization
  'capital_allocation': {
    patterns: [
      /capital.*allocat/i,
      /invest.*cash/i,
      /reallocat.*fund/i,
      /portfolio.*optim/i,
      /efficient.*frontier/i,
      /liquidity.*pool/i,
      /hedge.*currency/i,
      /fx.*hedge/i,
    ],
    agents: ['capital', 'treasury', 'risk'],
    complexity: 'complex',
  },

  // Risk & stress testing
  'stress_testing': {
    patterns: [
      /stress\s*test/i,
      /black\s*swan/i,
      /tail\s*risk/i,
      /worst\s*case/i,
      /risk.*assess/i,
      /what.*if.*crisis/i,
      /supply.*chain.*risk/i,
      /geopolitical.*risk/i,
      /how\s*safe/i,
    ],
    agents: ['risk', 'forecasting', 'analytics'],
    complexity: 'complex',
  },

  // M&A & strategic analysis
  'ma_analysis': {
    patterns: [
      /acqui(re|sition)/i,
      /merger/i,
      /should.*buy/i,
      /target.*company/i,
      /synergy/i,
      /accretion.*dilution/i,
      /valuation/i,
    ],
    agents: ['strategic', 'forecasting', 'analytics'],
    complexity: 'complex',
  },

  // Tax & compliance
  'tax_compliance': {
    patterns: [
      /tax.*exposure/i,
      /tax.*audit/i,
      /regulation/i,
      /compliance/i,
      /audit.*ready/i,
      /eu.*regulation/i,
      /gdpr/i,
      /sox.*compliance/i,
    ],
    agents: ['compliance', 'analytics'],
    complexity: 'complex',
  },

  // Month-end close
  'month_end_close': {
    patterns: [
      /month.*end.*close/i,
      /closing.*books/i,
      /reconcil/i,
      /balance.*sheet/i,
      /close.*period/i,
    ],
    agents: ['analytics', 'anomaly', 'compliance'],
    complexity: 'complex',
  },

  // Strategic cost reduction (with R&D preservation)
  'strategic_cost_reduction': {
    patterns: [
      /cut.*cost.*without.*slow/i,
      /reduce.*operat.*cost/i,
      /identify.*redundant/i,
      /ghost.*subscription/i,
      /saas.*audit/i,
      /software.*spend/i,
    ],
    agents: ['strategic', 'procurement', 'analytics'],
    complexity: 'complex',
  },

  // Solvency & debt analysis
  'solvency_analysis': {
    patterns: [
      /solvency/i,
      /debt.*covenant/i,
      /debt.*capacity/i,
      /leverage.*ratio/i,
      /interest.*coverage/i,
    ],
    agents: ['treasury', 'risk', 'analytics'],
    complexity: 'complex',
  },
};

// Thresholds for human-in-the-loop
export const HITL_THRESHOLDS = {
  // Value thresholds (in USD)
  highValueTransaction: 100000,
  majorInvestment: 500000,
  
  // Confidence thresholds
  lowConfidenceThreshold: 0.6,
  
  // Risk thresholds
  highRiskActions: ['budget_approval', 'vendor_contract', 'tax_filing', 'large_transfer'],
  
  // Complexity requiring human review
  complexDecisions: ['restructuring', 'acquisition', 'major_pivot'],
};
