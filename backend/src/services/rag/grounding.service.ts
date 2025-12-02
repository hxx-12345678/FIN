/**
 * RAG & GROUNDING SERVICE
 * Retrieves relevant financial data and context for LLM grounding
 * Prevents hallucinations by providing evidence
 */

import prisma from '../../config/database';
import { NotFoundError } from '../../utils/errors';

export interface EvidenceDocument {
  doc_id: string;
  doc_type: 'model_assumption' | 'historical' | 'policy' | 'recommendation' | 'audit_log' | 'template';
  content: string;
  score: number;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface GroundingContext {
  evidence: EvidenceDocument[];
  model_state?: any;
  recent_recommendations?: any[];
  policy_constraints?: any;
  confidence: number;
}

export const groundingService = {
  /**
   * Retrieve grounding context for a query
   */
  retrieve: async (
    orgId: string,
    intent: string,
    slots: Record<string, any>,
    topK: number = 5
  ): Promise<GroundingContext> => {
    const evidence: EvidenceDocument[] = [];

    // 1. Get current model state
    const model = await prisma.model.findFirst({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        modelRuns: {
          where: { status: 'done' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (model) {
      evidence.push({
        doc_id: `model_${model.id}`,
        doc_type: 'model_assumption',
        content: JSON.stringify(model.modelJson),
        score: 0.9,
        metadata: {
          modelId: model.id,
          modelName: model.name,
          version: model.version,
        },
        timestamp: model.createdAt.toISOString(),
      });

      // Get latest model run summary
      if (model.modelRuns.length > 0) {
        const latestRun = model.modelRuns[0];
        evidence.push({
          doc_id: `run_${latestRun.id}`,
          doc_type: 'historical',
          content: JSON.stringify(latestRun.summaryJson),
          score: 0.85,
          metadata: {
            runId: latestRun.id,
            runType: latestRun.runType,
          },
          timestamp: latestRun.finishedAt?.toISOString() || latestRun.createdAt.toISOString(),
        });
      }
    }

    // 2. Get recent AI-CFO recommendations
    const recentPlans = await prisma.aICFOPlan.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        planJson: true,
        createdAt: true,
      },
    });

    for (const plan of recentPlans) {
      const planJson = plan.planJson as any;
      if (planJson?.stagedChanges) {
        evidence.push({
          doc_id: `plan_${plan.id}`,
          doc_type: 'recommendation',
          content: JSON.stringify(planJson.stagedChanges),
          score: 0.7,
          metadata: {
            planId: plan.id,
            goal: planJson.goal,
          },
          timestamp: plan.createdAt.toISOString(),
        });
      }
    }

    // 3. Get actual transaction data (Industry Standard: Use real financial data)
    // Filter to current year and previous year only (not all historical data)
    const currentYear = new Date().getFullYear()
    const startOfCurrentYear = new Date(currentYear, 0, 1) // January 1st of current year
    const startOfPreviousYear = new Date(currentYear - 1, 0, 1) // January 1st of previous year
    
    const transactions = await prisma.$queryRaw`
      SELECT 
        date,
        amount,
        category,
        description
      FROM raw_transactions
      WHERE "orgId" = ${orgId}::uuid
        AND date >= ${startOfPreviousYear}::date
      ORDER BY date DESC
      LIMIT 100
    ` as Array<{ date: Date; amount: number; category: string | null; description: string | null }>;

    if (transactions.length > 0) {
      // Aggregate transaction data for grounding
      const revenue = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
      const expenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const monthlyData: Record<string, { revenue: number; expenses: number }> = {};
      
      for (const tx of transactions) {
        const monthKey = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { revenue: 0, expenses: 0 };
        }
        if (tx.amount > 0) {
          monthlyData[monthKey].revenue += tx.amount;
        } else {
          monthlyData[monthKey].expenses += Math.abs(tx.amount);
        }
      }

      evidence.push({
        doc_id: `transactions_${orgId}`,
        doc_type: 'historical',
        content: JSON.stringify({
          totalRevenue: revenue,
          totalExpenses: expenses,
          netIncome: revenue - expenses,
          monthlyBreakdown: monthlyData,
          transactionCount: transactions.length,
        }),
        score: 0.95, // High score - real transaction data is most reliable
        metadata: {
          source: 'raw_transactions',
          transactionCount: transactions.length,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // 4. Get recent audit logs for context
    const recentAudits = await prisma.auditLog.findMany({
      where: {
        orgId,
        action: { in: ['ai_plan_generated', 'model_run_created', 'assumption_updated'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        action: true,
        metaJson: true,
        createdAt: true,
      },
    });

    for (const audit of recentAudits) {
      evidence.push({
        doc_id: `audit_${audit.id}`,
        doc_type: 'audit_log',
        content: JSON.stringify(audit.metaJson),
        score: 0.6,
        metadata: {
          action: audit.action,
        },
        timestamp: audit.createdAt.toISOString(),
      });
    }

    // 4. Score and rank evidence by relevance to intent
    const scoredEvidence = evidence.map((doc) => {
      let relevanceScore = doc.score;
      
      // Boost relevance based on intent
      if (intent === 'runway_calculation' && doc.doc_type === 'historical') {
        relevanceScore += 0.1;
      }
      if (intent === 'scenario_simulation' && doc.doc_type === 'model_assumption') {
        relevanceScore += 0.1;
      }
      if (intent === 'strategy_recommendation' && doc.doc_type === 'recommendation') {
        relevanceScore += 0.1;
      }

      return { ...doc, score: Math.min(1.0, relevanceScore) };
    });

    // Sort by score and take top K
    const topEvidence = scoredEvidence
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    // Calculate overall confidence
    const avgScore = topEvidence.length > 0
      ? topEvidence.reduce((sum, e) => sum + e.score, 0) / topEvidence.length
      : 0.5;

    return {
      evidence: topEvidence,
      model_state: model?.modelJson || null,
      recent_recommendations: recentPlans.map(p => p.planJson),
      confidence: avgScore,
    };
  },

  /**
   * Check if grounding is sufficient
   */
  validateGrounding: (context: GroundingContext, minEvidence: number = 2): {
    sufficient: boolean;
    issues: string[];
  } => {
    const issues: string[] = [];

    if (context.evidence.length < minEvidence) {
      issues.push(`Insufficient evidence: found ${context.evidence.length}, need ${minEvidence}`);
    }

    if (context.confidence < 0.6) {
      issues.push(`Low grounding confidence: ${context.confidence.toFixed(2)}`);
    }

    if (!context.model_state) {
      issues.push('No model state available for grounding');
    }

    return {
      sufficient: issues.length === 0,
      issues,
    };
  },
};

