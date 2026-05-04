/**
 * AI CFO Multi-Agent System - Agent Type Definitions
 * 
 * This implements a proper agentic workflow with specialized agents
 * that collaborate to handle diverse CFO tasks.
 */

// Agent types that specialize in different CFO functions
export type AgentType =
  | 'risk_compliance'     // Risk & Compliance Agent: Stress-tests models against macro scenarios
  | 'variance_analysis'   // Variance Analysis Agent: Explains plan vs actuals
  | 'financial_modeling'  // Financial Modeling Agent: Builds 3-statement models
  | 'reporting'           // Reporting Agent: Auto-drafts narratives and board presentations
  | 'market_monitoring'   // Market Monitoring Agent: Watches macro indicators
  | 'resource_allocation' // Resource Allocation Agent: Suggests optimal capital allocation
  | 'data_cleaning'       // Data Cleaning Agent: Normalizes messy ERP/CSV data
  | 'scenario_planning'   // Scenario Planning Agent: Runs Monte Carlo simulations
  | 'cash_flow'           // Cash Flow Agent: Simulates daily runway/burn
  | 'circular_logic'      // Circular Logic Agent: Resolves 3-statement circular references
  | 'audit_provenance'    // Audit & Provenance Agent: Logs cell updates and provenance
  | 'anomaly_detection'   // Anomaly Detection Agent: Spots unusual spending patterns
  | 'orchestrator';       // Coordinates other agents

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
  | 'grounding'           // Cross-reference data for truth
  | 'escalation';         // Escalate to human

// Data source types for explainability
export interface DataSource {
  type: 'historical_run' | 'policy_document' | 'calculation' | 'monte_carlo' | 'system_logs' | 'user_upload' | 'web_search' | 'transaction' | 'connector' | 'model_run' | 'budget' | 'manual_input' | 'reasoning_engine';
  id: string;
  name: string;
  timestamp: Date;
  confidence: number;
  snippet?: string;
  url?: string;
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

  // Enterprise Strategic Sections
  executiveSummary?: string;
  causalExplanation?: string;
  risks?: string[];
  assumptions?: string[];
  confidenceIntervals?: {
    p10: number;
    p50: number;
    p90: number;
    metric: string;
    stdDev?: number;
    skewness?: number;
  };
  auditMetadata?: {
    modelVersion: string;
    timestamp: Date;
    inputVersions: Record<string, string>;
    datasetHash?: string;
    processingPlanId?: string;
  };

  // Institutional Grade Extensions
  statisticalMetrics?: {
    mape?: number;
    rmse?: number;
    forecastBias?: number;
    calibrationError?: number;
    driftStatus?: 'stable' | 'warning' | 'critical';
  };
  sensitivityAnalysis?: {
    driver: string;
    delta: number;
    elasticity: number;
    ranking: string[];
  };
  liquidityMetrics?: {
    survivalProbability: number;
    minCashMonth?: string;
    capitalRequired?: number;
    dilutionImpact?: number;
  };
  dataQuality?: {
    score: number;
    missingDataPct: number;
    outlierPct: number;
    reliabilityTier: 1 | 2 | 3;
  };
  reconciliationSummary?: string;
  formulasUsed?: string[];

  // Deterministic Integrity Logic
  financialIntegrity?: {
    incomeStatement: Record<string, number>;
    cashFlow: Record<string, number>;
    balanceSheet: Record<string, number>;
    reconciliations: {
      label: string;
      difference: number;
      derivation: string;
    }[];
  };

  // Governance Traceability
  governanceOverrides?: {
    userId: string;
    timestamp: Date;
    originalValue: number;
    newValue: number;
    justification: string;
    impactDelta: number;
  }[];

  // Enterprise Governance & Compliance
  policyMapping?: {
    policyId: string;
    policyName: string;
    controlId: string;
    framework: 'SOX' | 'SOC2' | 'Internal' | 'IFRS' | 'GAAP';
    status: 'pass' | 'fail' | 'warning';
    evidence: string;
  }[];

  // Advanced Analysis Extensions
  varianceDrivers?: {
    driver: string;
    variance: number;
    type: 'price' | 'volume' | 'mix' | 'fx' | 'cost' | 'one-time' | 'structural';
    impact: number;
    explanation: string;
  }[];

  scenarioTree?: {
    nodeId: string;
    label: string;
    probability: number;
    metrics: Record<string, number>;
    children?: string[];
  }[];
  weakAssumptions?: {
    name: string;
    issue: string;
    recommendation: string;
  }[];
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
  // Institutional Grade Validation (Global Priority)
  'institutional_validation': {
    patterns: [
      /institutional.*validation/i,
      /audit.*grade/i,
      /regulator.*ready/i,
      /mathematically.*defensible/i,
      /full.*institutional/i,
      /institutional.*ready/i,
      /institutional.*grade/i,
    ],
    agents: ['variance_analysis', 'financial_modeling', 'risk_compliance', 'resource_allocation', 'reporting', 'cash_flow', 'audit_provenance'],
    complexity: 'complex',
  },
  // SOC 2 Verification & Deep Analysis (Highest Priority)
  'solvency_and_covenants': {
    patterns: [
      /debt.*covenant/i,
      /dscr/i,
      /solvency/i,
      /breach.*probab/i,
      /monte.*carlo/i,
    ],
    agents: ['cash_flow', 'risk_compliance', 'variance_analysis', 'scenario_planning'],
    complexity: 'complex',
  },
  'liquidity_stress': {
    patterns: [
      /revolver/i,
      /auto-draw/i,
      /liquidity.*stress/i,
      /cash.*threshold/i,
      /interest.*burden/i,
    ],
    agents: ['financial_modeling', 'cash_flow', 'risk_compliance'],
    complexity: 'complex',
  },
  'structural_break_detection': {
    patterns: [
      /structural.*break/i,
      /regime.*shift/i,
      /arima/i,
      /model.*retrain/i,
    ],
    agents: ['variance_analysis', 'financial_modeling'],
    complexity: 'complex',
  },
  'governance_override': {
    patterns: [
      /override.*governance/i,
      /analyst.*override/i,
      /governance.*delta/i,
      /log.*governance/i,
    ],
    agents: ['risk_compliance', 'variance_analysis', 'audit_provenance'],
    complexity: 'moderate',
  },
  'inflation_analysis': {
    patterns: [
      /inflation/i,
      /pass-through/i,
      /margin.*compression/i,
      /pricing.*adjust/i,
    ],
    agents: ['financial_modeling', 'variance_analysis', 'market_monitoring'],
    complexity: 'complex',
  },
  'consolidation_integrity': {
    patterns: [
      /consolidation.*integrity/i,
      /intercompany/i,
      /double.*counting/i,
      /subsidiary/i,
    ],
    agents: ['reporting', 'variance_analysis', 'circular_logic'],
    complexity: 'complex',
  },
  'black_swan_resilience': {
    patterns: [
      /black.*swan/i,
      /survival.*probab/i,
      /resilience/i,
      /simultaneous.*spike/i,
    ],
    agents: ['risk_compliance', 'financial_modeling', 'cash_flow', 'scenario_planning'],
    complexity: 'complex',
  },
  'governance_audit': {
    patterns: [
      /controls/i,
      /governance/i,
      /audit/i,
      /policy/i,
      /override/i,
      /compliance/i,
      /manual.*increase/i,
    ],
    agents: ['risk_compliance', 'audit_provenance'],
    complexity: 'moderate',
  },
  'policy_compliance': {
    patterns: [
      /hiring.*plan/i,
      /burn.*cap/i,
      /policy.*conflict/i,
      /violation/i,
      /policy.*threshold/i,
    ],
    agents: ['risk_compliance', 'reporting'],
    complexity: 'moderate',
  },
  'forecast_calibration': {
    patterns: [
      /calibration/i,
      /forecast.*vs.*actual/i,
      /p90.*band/i,
      /confidence.*interval.*captured/i,
      /mape/i,
      /bias/i,
      /accurate/i,
    ],
    agents: ['variance_analysis', 'financial_modeling'],
    complexity: 'moderate',
  },

  // Standard Treasury & Analytics
  'cash_runway': {
    patterns: [
      /cash\s*runway/i,
      /how\s*long.*cash/i,
      /runway.*month/i,
      /when.*run\s*out/i,
      /cash.*last/i,
      /base.*upside.*downside/i,
      /p10.*p50.*p90/i,
    ],
    agents: ['cash_flow', 'financial_modeling'],
    complexity: 'moderate',
  },
  'burn_rate': {
    patterns: [
      /burn\s*rate/i,
      /monthly\s*burn/i,
      /spending.*month/i,
      /how\s*much.*spending/i,
    ],
    agents: ['cash_flow'],
    complexity: 'simple',
  },
  'variance_analysis': {
    patterns: [
      /why.*miss/i,
      /variance.*explain/i,
      /ebitda.*miss/i,
      /forecast.*actual/i,
      /explain.*difference/i,
    ],
    agents: ['variance_analysis', 'financial_modeling'],
    complexity: 'complex',
  },
  'scenario_modeling': {
    patterns: [
      /model.*drop/i,
      /revenue.*drop/i,
      /revenue.*cut/i,
      /sales.*fall/i,
      /if.*drops/i,
      /what\s*if.*revenue/i,
      /scenario.*percent/i,
      /simulate.*change/i,
      /model.*increase/i,
      /revenue.*increase/i,
      /grow.*by/i,
      /incident.*resolution.*time/i,
      /interest.*rate.*rise/i,
      /consistent.*logic/i,
      /what\s*happens\s*if/i,
      /customer\s*leaves/i,
      /pay.*slower/i,
    ],
    agents: ['financial_modeling', 'cash_flow', 'risk_compliance', 'scenario_planning'],
    complexity: 'complex',
  },
  'anomaly_detection': {
    patterns: [
      /anomaly/i,
      /unusual/i,
      /strange/i,
      /outlier/i,
      /structural.*change/i,
      /business.*model.*change/i,
    ],
    agents: ['anomaly_detection', 'variance_analysis'],
    complexity: 'complex',
  },
  'cost_structure': {
    patterns: [
      /fixed.*variable/i,
      /cost.*classification/i,
      /cut.*burn/i,
      /burn.*reduction/i,
    ],
    agents: ['variance_analysis', 'resource_allocation'],
    complexity: 'moderate',
  },
  'pricing_power': {
    patterns: [
      /increase.*price/i,
      /pricing.*power/i,
      /elasticity/i,
      /price.*churn/i,
    ],
    agents: ['variance_analysis', 'market_monitoring'],
    complexity: 'moderate',
  },
  'duplicate_detection': {
    patterns: [
      /duplicate.*payment/i,
      /double.*payment/i,
      /suspicious.*transaction/i,
      /fraud.*detect/i,
      /anomaly.*payment/i,
    ],
    agents: ['anomaly_detection'],
    complexity: 'moderate',
  },
  'board_summary': {
    patterns: [
      /board.*summary/i,
      /board.*meeting/i,
      /executive.*summary/i,
      /draft.*report/i,
      /prepare.*board/i,
    ],
    agents: ['reporting', 'variance_analysis', 'cash_flow'],
    complexity: 'complex',
  },
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
    agents: ['resource_allocation', 'cash_flow', 'risk_compliance'],
    complexity: 'complex',
  },
  'treasury_strategy': {
    patterns: [
      /spend.*marketing/i,
      /spend.*hiring/i,
      /spend.*product/i,
      /debt.*reduction/i,
      /surplus.*cash/i,
      /allocation.*options/i,
      /npv.*return/i,
    ],
    agents: ['resource_allocation', 'cash_flow', 'financial_modeling'],
    complexity: 'complex',
  },
  'stress_testing': {
    patterns: [
      /stress\s*test/i,
      /tail\s*risk/i,
      /worst\s*case/i,
      /risk.*assess/i,
      /what.*if.*crisis/i,
      /supply.*chain.*risk/i,
      /geopolitical.*risk/i,
      /how\s*safe/i,
    ],
    agents: ['risk_compliance', 'financial_modeling', 'variance_analysis', 'scenario_planning'],
    complexity: 'complex',
  },
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
    agents: ['risk_compliance', 'variance_analysis'],
    complexity: 'complex',
  },
  'revenue_forecast': {
    patterns: [
      /revenue.*forecast/i,
      /predict.*revenue/i,
      /revenue.*next/i,
      /growth.*projection/i,
    ],
    agents: ['financial_modeling'],
    complexity: 'moderate',
  },
  'data_quality_assessment': {
    patterns: [
      /data.*quality/i,
      /modeling.*risk/i,
      /missing.*data/i,
      /temporal.*misalignment/i,
      /inconsistent.*driver/i,
      /messy/i,
      /normalize/i,
    ],
    agents: ['data_cleaning', 'variance_analysis', 'risk_compliance'],
    complexity: 'moderate',
  },
  'web_search': {
    patterns: [
      /\b(competitor|competitive|industry|benchmark|compare|comparison|versus|vs\.?)\b/i,
      /\b(market\s+(share|position|leader)|peer\s+(group|comparison))\b/i,
      /\b(interest\s+rate|fed\s+rate|inflation|cpi|gdp|recession|macro|economy|economic)\b/i,
      /\b(tax\s+(law|reform|change|update|regulation)|compliance|regulation|regulatory)\b/i,
      /\b(saas\s+metric|ndr|net\s+dollar\s+retention|arr\s+multiple|ltv.?cac)\b/i,
      /\b(valuation\s+multiple|p.?e\s+ratio|ev.?ebitda)\b/i,
      /\b(news|latest|recent|update|announce|announcement|headline)\b/i,
      /\b(ipo|acquisition|merger|layoff|bankruptcy|funding\s+round)\b/i,
      /\b(series\s+[a-f]|seed\s+round|vc\s+(activity|funding)|valuation\s+trend)\b/i,
      /\b(search\s+(for|the\s+web|online|internet)|look\s+up|find\s+out|google)\b/i,
      /https?:\/\//i
    ],
    agents: ['market_monitoring', 'variance_analysis'],
    complexity: 'complex'
  }
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
