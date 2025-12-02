/**
 * MONITORING & OBSERVABILITY SERVICE
 * Tracks metrics, confidence scores, errors, and performance
 */

import prisma from '../../config/database';

export interface Metric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: Date;
}

export interface AlertRule {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  severity: 'critical' | 'warning' | 'info';
}

export const observabilityService = {
  /**
   * Record metric
   */
  recordMetric: async (
    name: string,
    value: number,
    tags?: Record<string, string>
  ): Promise<void> => {
    // In production, send to metrics service (Datadog, Prometheus, etc.)
    // For MVP, metrics table may not exist - fail silently
    try {
      // First check if metrics table exists to avoid Prisma error logging
      const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'metrics'
        ) as exists
      `;
      
      if (!tableExists[0]?.exists) {
        // Table doesn't exist, silently return
        return;
      }
      
      // Table exists, proceed with insert
      await prisma.$executeRaw`
        INSERT INTO metrics (name, value, tags, created_at)
        VALUES (${name}, ${value}, ${JSON.stringify(tags || {})}::jsonb, NOW())
        ON CONFLICT DO NOTHING
      `;
    } catch (error: any) {
      // Silently fail - metrics are non-critical
      // Suppress all errors completely
      // No logging needed - metrics are optional
    }
  },

  /**
   * Record LLM confidence distribution
   */
  recordConfidence: async (confidence: number, intent: string): Promise<void> => {
    await observabilityService.recordMetric('llm_confidence', confidence, {
      intent,
      bucket: confidence < 0.5 ? 'low' : confidence < 0.85 ? 'medium' : 'high',
    });
  },

  /**
   * Record recommendation acceptance
   */
  recordRecommendationAcceptance: async (
    planId: string,
    accepted: boolean,
    userId: string
  ): Promise<void> => {
    await observabilityService.recordMetric('recommendation_acceptance', accepted ? 1 : 0, {
      planId,
      userId,
    });
  },

  /**
   * Record hallucination incident
   */
  recordHallucination: async (
    requestId: string,
    details: string
  ): Promise<void> => {
    await observabilityService.recordMetric('hallucination_incident', 1, {
      requestId,
      details: details.substring(0, 100),
    });
  },

  /**
   * Record calculation validation error
   */
  recordValidationError: async (
    errorType: string,
    details: string
  ): Promise<void> => {
    await observabilityService.recordMetric('validation_error', 1, {
      errorType,
      details: details.substring(0, 100),
    });
  },

  /**
   * Record latency
   */
  recordLatency: async (
    operation: string,
    latencyMs: number
  ): Promise<void> => {
    await observabilityService.recordMetric('operation_latency', latencyMs, {
      operation,
    });
  },

  /**
   * Check alert rules
   */
  checkAlerts: async (rules: AlertRule[]): Promise<Array<{
    rule: AlertRule;
    triggered: boolean;
    currentValue: number;
  }>> => {
    // In production, implement alert checking logic
    // For MVP, return empty array
    return [];
  },
};

