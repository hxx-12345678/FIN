/**
 * DATA TRANSFORMATION PIPELINE SERVICE
 * Cleans, normalizes, and transforms imported data
 * Similar to Abacum's data transformation feature
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { auditService } from './audit.service';

export interface TransformationRule {
  id?: string;
  name: string;
  type: 'clean' | 'normalize' | 'validate' | 'enrich' | 'aggregate';
  config: Record<string, any>;
  enabled: boolean;
}

export interface TransformationRequest {
  orgId: string;
  dataSource: 'transactions' | 'csv' | 'connector';
  rules: TransformationRule[];
  dryRun?: boolean;
}

export interface TransformationResult {
  success: boolean;
  recordsProcessed: number;
  recordsTransformed: number;
  recordsFailed: number;
  errors: Array<{ record: any; error: string }>;
  warnings: Array<{ record: any; warning: string }>;
  summary: {
    cleaned: number;
    normalized: number;
    validated: number;
    enriched: number;
    aggregated: number;
  };
}

export const dataTransformationService = {
  /**
   * Apply transformation rules to data
   */
  transformData: async (
    request: TransformationRequest,
    userId: string
  ): Promise<TransformationResult> => {
    try {
      // Validate org access
      const userRole = await prisma.userOrgRole.findUnique({
        where: { userId_orgId: { userId, orgId: request.orgId } },
      });

      if (!userRole || !['admin', 'finance'].includes(userRole.role)) {
        throw new ForbiddenError('Only admins and finance users can transform data');
      }

      // Validate rules
      if (!request.rules || request.rules.length === 0) {
        throw new ValidationError('At least one transformation rule is required');
      }

      // Get data based on source
      let records: any[] = [];
      
      if (request.dataSource === 'transactions') {
        records = await prisma.rawTransaction.findMany({
          where: { orgId: request.orgId },
          take: 10000, // Limit for performance
        });
      } else {
        throw new ValidationError(`Unsupported data source: ${request.dataSource}`);
      }

      if (records.length === 0) {
        return {
          success: true,
          recordsProcessed: 0,
          recordsTransformed: 0,
          recordsFailed: 0,
          errors: [],
          warnings: [],
          summary: {
            cleaned: 0,
            normalized: 0,
            validated: 0,
            enriched: 0,
            aggregated: 0,
          },
        };
      }

      // Apply transformations
      const result: TransformationResult = {
        success: true,
        recordsProcessed: records.length,
        recordsTransformed: 0,
        recordsFailed: 0,
        errors: [],
        warnings: [],
        summary: {
          cleaned: 0,
          normalized: 0,
          validated: 0,
          enriched: 0,
          aggregated: 0,
        },
      };

      // Apply each rule
      for (const rule of request.rules) {
        if (!rule.enabled) continue;

        try {
          const ruleResult = await applyTransformationRule(rule, records, request.orgId);
          
          result.recordsTransformed += ruleResult.transformed;
          result.recordsFailed += ruleResult.failed;
          result.errors.push(...ruleResult.errors);
          result.warnings.push(...ruleResult.warnings);
          
          // Update summary
          switch (rule.type) {
            case 'clean':
              result.summary.cleaned += ruleResult.transformed;
              break;
            case 'normalize':
              result.summary.normalized += ruleResult.transformed;
              break;
            case 'validate':
              result.summary.validated += ruleResult.transformed;
              break;
            case 'enrich':
              result.summary.enriched += ruleResult.transformed;
              break;
            case 'aggregate':
              result.summary.aggregated += ruleResult.transformed;
              break;
          }

          // Update records for next rule
          records = ruleResult.updatedRecords || records;

          // Persist changes if not dryRun and rule produced DB actions
          if (!request.dryRun && ruleResult.dbActions) {
            // Category updates (audit-friendly, idempotent)
            if (ruleResult.dbActions.setCategories && ruleResult.dbActions.setCategories.length > 0) {
              await prisma.$transaction(
                ruleResult.dbActions.setCategories.map(({ id, category }) =>
                  prisma.rawTransaction.update({
                    where: { id },
                    data: { category },
                  })
                )
              );
            }

            // Mark duplicates (does not delete; makes analytics ignore them)
            if (ruleResult.dbActions.markDuplicates && ruleResult.dbActions.markDuplicates.length > 0) {
              await prisma.rawTransaction.updateMany({
                where: { id: { in: ruleResult.dbActions.markDuplicates } },
                data: { isDuplicate: true } as any,
              });
            }
          }
        } catch (error: any) {
          logger.error(`Error applying transformation rule ${rule.name}`, error);
          result.errors.push({
            record: null,
            error: `Rule ${rule.name} failed: ${error.message}`,
          });
        }
      }

      // If not dry run, save transformed data
      if (!request.dryRun && result.success) {
        // Log transformation as an auditable event
        await auditService.log({
          actorUserId: userId,
          orgId: request.orgId,
          action: 'data_transformation_applied',
          objectType: 'data',
          metaJson: {
            dataSource: request.dataSource,
            rules: request.rules.map(r => ({ name: r.name, type: r.type, enabled: r.enabled })),
            summary: result.summary,
            recordsProcessed: result.recordsProcessed,
            recordsTransformed: result.recordsTransformed,
            recordsFailed: result.recordsFailed,
          },
        });

        // Update transactions in database was done per-rule above.
        logger.info(`Data transformation completed`, {
          orgId: request.orgId,
          recordsProcessed: result.recordsProcessed,
          recordsTransformed: result.recordsTransformed,
        });
      }

      result.success = result.errors.length === 0;

      return result;
    } catch (error: any) {
      logger.error('Error transforming data', error);
      throw error;
    }
  },

  /**
   * Get available transformation templates
   */
  getTemplates: async (): Promise<TransformationRule[]> => {
    return [
      {
        name: 'Clean Uncategorized Transactions',
        type: 'clean',
        config: { action: 'categorize_uncategorized' },
        enabled: true,
      },
      {
        name: 'Normalize Currency',
        type: 'normalize',
        config: { targetCurrency: 'USD' },
        enabled: true,
      },
      {
        name: 'Validate Amounts',
        type: 'validate',
        config: { minAmount: -1000000, maxAmount: 1000000 },
        enabled: true,
      },
      {
        name: 'Remove Duplicates',
        type: 'clean',
        config: { action: 'remove_duplicates', matchFields: ['description', 'amount', 'date'] },
        enabled: true,
      },
      {
        name: 'Enrich with Categories',
        type: 'enrich',
        config: { useML: true },
        enabled: true,
      },
    ];
  },
};

/**
 * Apply a single transformation rule
 */
async function applyTransformationRule(
  rule: TransformationRule,
  records: any[],
  orgId: string
): Promise<{
  transformed: number;
  failed: number;
  errors: Array<{ record: any; error: string }>;
  warnings: Array<{ record: any; warning: string }>;
  updatedRecords?: any[];
  dbActions?: {
    setCategories?: Array<{ id: string; category: string }>;
    markDuplicates?: string[];
  };
}> {
  const result = {
    transformed: 0,
    failed: 0,
    errors: [] as Array<{ record: any; error: string }>,
    warnings: [] as Array<{ record: any; warning: string }>,
    updatedRecords: [] as any[],
    dbActions: {} as {
      setCategories?: Array<{ id: string; category: string }>;
      markDuplicates?: string[];
    },
  };

  switch (rule.type) {
    case 'clean':
      result.updatedRecords = await cleanData(rule, records, result);
      break;
    case 'normalize':
      result.updatedRecords = await normalizeData(rule, records, result);
      break;
    case 'validate':
      result.updatedRecords = await validateData(rule, records, result);
      break;
    case 'enrich':
      result.updatedRecords = await enrichData(rule, records, orgId, result);
      break;
    case 'aggregate':
      result.updatedRecords = await aggregateData(rule, records, result);
      break;
  }

  return result;
}

/**
 * Clean data
 */
async function cleanData(
  rule: TransformationRule,
  records: any[],
  result: any
): Promise<any[]> {
  const cleaned = [...records];

  if (rule.config.action === 'categorize_uncategorized') {
    result.dbActions.setCategories = result.dbActions.setCategories || [];
    cleaned.forEach((record, index) => {
      if (!record.category || record.category.trim() === '') {
        // Try to infer category from description
        const inferred = inferCategory(record.description || '');
        if (inferred) {
          cleaned[index].category = inferred;
          result.transformed++;
          if (record.id) {
            result.dbActions.setCategories.push({ id: record.id, category: inferred });
          }
        } else {
          result.warnings.push({
            record: { id: record.id },
            warning: 'Could not infer category',
          });
        }
      }
    });
  } else if (rule.config.action === 'remove_duplicates' || Array.isArray(rule.config.matchFields)) {
    const seen = new Set<string>();
    const unique: any[] = [];
    result.dbActions.markDuplicates = result.dbActions.markDuplicates || [];
    
    cleaned.forEach(record => {
      const matchFields: string[] = Array.isArray(rule.config.matchFields) ? rule.config.matchFields : ['description', 'amount', 'date'];
      const parts = matchFields.map((f) => {
        const v = (record as any)[f];
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        return String(v ?? '').trim().toLowerCase();
      });
      const key = parts.join('|');
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(record);
        result.transformed++; // treated as "kept"
      } else {
        result.warnings.push({
          record: { id: record.id },
          warning: 'Duplicate removed',
        });
        if (record.id) {
          result.dbActions.markDuplicates.push(record.id);
        }
      }
    });
    
    return unique;
  }

  return cleaned;
}

/**
 * Normalize data
 */
async function normalizeData(
  rule: TransformationRule,
  records: any[],
  result: any
): Promise<any[]> {
  const normalized = records.map(record => {
    const normalizedRecord = { ...record };
    
    if (rule.config.targetCurrency && record.currency !== rule.config.targetCurrency) {
      // Currency normalization would require FX rates
      // For now, just mark as needing normalization
      result.warnings.push({
        record: { id: record.id },
        warning: `Currency conversion needed: ${record.currency} -> ${rule.config.targetCurrency}`,
      });
    }
    
    // Normalize amounts (ensure consistent format)
    if (typeof normalizedRecord.amount === 'string') {
      normalizedRecord.amount = parseFloat(normalizedRecord.amount.replace(/[^0-9.-]/g, ''));
      result.transformed++;
    }
    
    return normalizedRecord;
  });

  return normalized;
}

/**
 * Validate data
 */
async function validateData(
  rule: TransformationRule,
  records: any[],
  result: any
): Promise<any[]> {
  const validated: any[] = [];
  const minAmount = rule.config.minAmount || -Infinity;
  const maxAmount = rule.config.maxAmount || Infinity;

  records.forEach(record => {
    const amount = Math.abs(record.amount || 0);
    
    if (amount < minAmount || amount > maxAmount) {
      result.errors.push({
        record: { id: record.id, amount: record.amount },
        error: `Amount ${record.amount} is outside valid range [${minAmount}, ${maxAmount}]`,
      });
      result.failed++;
    } else {
      validated.push(record);
      result.transformed++;
    }
  });

  return validated;
}

/**
 * Enrich data
 */
async function enrichData(
  rule: TransformationRule,
  records: any[],
  orgId: string,
  result: any
): Promise<any[]> {
  // Enrichment would add additional data
  // For now, just return records as-is
  records.forEach(() => {
    result.transformed++;
  });
  
  return records;
}

/**
 * Aggregate data
 */
async function aggregateData(
  rule: TransformationRule,
  records: any[],
  result: any
): Promise<any[]> {
  // Aggregation would group and summarize data
  // For now, just return records as-is
  records.forEach(() => {
    result.transformed++;
  });
  
  return records;
}

/**
 * Infer category from description
 */
function inferCategory(description: string): string | null {
  const desc = description.toLowerCase();
  
  const categoryKeywords: Record<string, string[]> = {
    'Marketing': ['marketing', 'advertising', 'ads', 'promo', 'campaign'],
    'Sales': ['sales', 'commission', 'deal'],
    'Engineering': ['engineering', 'development', 'dev', 'software', 'tech'],
    'Operations': ['operations', 'ops', 'infrastructure', 'hosting', 'server'],
    'HR': ['hr', 'human resources', 'recruiting', 'hiring', 'payroll'],
    'Legal': ['legal', 'lawyer', 'attorney', 'compliance'],
    'Finance': ['finance', 'accounting', 'bookkeeping', 'tax'],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => desc.includes(keyword))) {
      return category;
    }
  }

  return null;
}

