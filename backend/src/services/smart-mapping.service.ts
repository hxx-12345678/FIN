/**
 * Smart Mapping Service — AI-Powered Column Mapping Intelligence
 * 
 * Provides enhanced mapping through:
 * 1. Rule-based matching (from csv-mapping.service.ts)
 * 2. Data-pattern analysis (date/number/currency/email detection)
 * 3. Contextual reasoning (financial domain knowledge)
 * 4. Confidence scoring with human-readable explanations
 * 
 * Does NOT require OpenAI/LLM — uses deterministic pattern analysis
 * for reliability and zero latency.
 */

import { csvMappingService, ColumnMapping, MappingResult } from './csv-mapping.service';
import {
  mappingRules,
  normalizeColumnName,
  calculateSimilarity,
} from '../config/column-mapping.config';
import { logger } from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmartMapping {
  csvColumn: string;
  internalField: string;
  confidence: number;              // 0 – 100
  method: 'exact' | 'synonym' | 'fuzzy' | 'pattern' | 'manual' | 'ai_semantic';
  explanation: string;             // Human-readable reason
  dataType: 'date' | 'number' | 'string' | 'percentage' | 'currency' | 'unknown';
  sampleValues: string[];          // First 3 non-empty values from that column
  category: string;
  alternatives?: SmartMapping[];   // Other possible mappings (top 2)
}

export interface SmartMappingResult {
  mappings: SmartMapping[];
  unmappedColumns: string[];
  skipSuggestions: string[];       // Columns AI recommends skipping
  overallConfidence: number;       // 0 – 100
  method: 'smart-hybrid';
  totalColumns: number;
  mappedCount: number;
  formatDetected: 'finapilot' | 'custom' | 'unknown';
}

// ─── Pattern Detectors ────────────────────────────────────────────────────────

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,                      // 2024-01-15
  /^\d{2}\/\d{2}\/\d{4}$/,                     // 01/15/2024 or 15/01/2024
  /^\d{2}-\d{2}-\d{4}$/,                       // 01-15-2024
  /^\d{4}\/\d{2}\/\d{2}$/,                     // 2024/01/15
  /^\d{1,2}\s+\w+\s+\d{4}$/,                   // 15 Jan 2024
  /^\w+\s+\d{1,2},?\s+\d{4}$/,                 // Jan 15, 2024
  /^\d{4}-\d{2}-\d{2}T/,                       // ISO datetime
  /^\d{4}-\d{2}$/,                              // 2024-01 (monthly)
];

const NUMBER_PATTERNS = [
  /^-?[\d,]+\.?\d*$/,                           // 1,234.56 or -500
  /^-?\$[\d,]+\.?\d*$/,                         // $1,234.56
  /^-?₹[\d,]+\.?\d*$/,                          // ₹1,234.56
  /^-?€[\d,]+\.?\d*$/,                          // €1,234.56
  /^-?£[\d,]+\.?\d*$/,                          // £1,234.56
  /^\([\d,]+\.?\d*\)$/,                         // (1,234.56) accounting format
];

const PERCENTAGE_PATTERNS = [
  /^-?\d+\.?\d*%$/,                              // 5.5%
  /^-?0\.\d+$/,                                  // 0.05 (decimal percentage)
];

const CURRENCY_PATTERNS = [
  /^[A-Z]{3}$/,                                  // USD, INR, EUR
  /^(USD|EUR|GBP|INR|JPY|CAD|AUD|CHF|CNY|SGD)$/i,
];

function detectDataType(values: string[]): 'date' | 'number' | 'string' | 'percentage' | 'currency' | 'unknown' {
  const nonEmpty = values.filter(v => v && v.trim() !== '' && v !== '-' && v !== 'N/A');
  if (nonEmpty.length === 0) return 'unknown';

  let dateCount = 0, numCount = 0, pctCount = 0, currCount = 0;

  for (const val of nonEmpty) {
    const trimmed = val.trim();
    if (DATE_PATTERNS.some(p => p.test(trimmed))) dateCount++;
    if (NUMBER_PATTERNS.some(p => p.test(trimmed))) numCount++;
    if (PERCENTAGE_PATTERNS.some(p => p.test(trimmed))) pctCount++;
    if (CURRENCY_PATTERNS.some(p => p.test(trimmed))) currCount++;
  }

  const threshold = nonEmpty.length * 0.6; // 60% of values must match
  if (dateCount >= threshold) return 'date';
  if (pctCount >= threshold) return 'percentage';
  if (currCount >= threshold) return 'currency';
  if (numCount >= threshold) return 'number';
  return 'string';
}

function isLikelyJunkColumn(header: string, values: string[]): boolean {
  const h = header.toLowerCase().trim();
  // Columns that are typically useless for FP&A
  const junkHeaders = [
    'id', 'row_id', 'index', 'serial_no', 'sr_no', 'sno', 's.no', 'sr.no',
    'row_number', 'record_id', 'uuid', 'blank', 'empty', 'unnamed',
    'column1', 'column2', 'col1', 'col2', 'field1', 'field2',
  ];
  if (junkHeaders.some(j => h === j || h.startsWith('unnamed'))) return true;

  // Check if all values are empty
  const nonEmpty = values.filter(v => v && v.trim() !== '');
  if (nonEmpty.length === 0) return true;

  // Check if all values are the same (non-informative)
  const unique = new Set(nonEmpty);
  if (unique.size === 1 && nonEmpty.length > 2) return true;

  return false;
}

// ─── Financial Domain Knowledge ───────────────────────────────────────────────

interface FinancialHint {
  field: string;
  keywords: string[];
  dataType: 'date' | 'number' | 'string' | 'percentage';
  category: string;
  explanation: string;
}

const FINANCIAL_HINTS: FinancialHint[] = [
  // Revenue
  { field: 'revenue', keywords: ['turnover', 'gross_sales', 'net_sales', 'total_income', 'top_line', 'sales_amount', 'revenue_total', 'actual_sales', 'realized_revenue'], dataType: 'number', category: 'revenue', explanation: 'Financial domain: this column likely represents revenue/sales' },
  { field: 'mrr', keywords: ['monthly_recurring', 'subscription_revenue', 'recurring_monthly'], dataType: 'number', category: 'revenue', explanation: 'Detected SaaS metric: Monthly Recurring Revenue' },
  { field: 'arr', keywords: ['annual_recurring', 'yearly_recurring'], dataType: 'number', category: 'revenue', explanation: 'Detected SaaS metric: Annual Recurring Revenue' },

  // Costs
  { field: 'cogs', keywords: ['cost_of_goods', 'cost_of_revenue', 'direct_cost', 'material_cost', 'purchase_cost'], dataType: 'number', category: 'costs', explanation: 'Financial domain: cost of goods sold / direct costs' },
  { field: 'payroll', keywords: ['salary', 'wage', 'compensation', 'employee_cost', 'staff_cost', 'people_cost', 'labor'], dataType: 'number', category: 'costs', explanation: 'Financial domain: payroll / employee compensation' },
  { field: 'marketing', keywords: ['ad_spend', 'advertising_cost', 'campaign_cost', 'promo_spend', 'growth_spend'], dataType: 'number', category: 'costs', explanation: 'Financial domain: marketing / advertising expenditure' },

  // Unit economics
  { field: 'cac', keywords: ['acquisition_cost', 'cost_per_acquisition', 'cpa', 'cost_per_customer'], dataType: 'number', category: 'economics', explanation: 'Detected unit economics metric: Customer Acquisition Cost' },
  { field: 'ltv', keywords: ['lifetime_value', 'customer_value', 'clv'], dataType: 'number', category: 'economics', explanation: 'Detected unit economics metric: Customer Lifetime Value' },
  { field: 'churn_rate', keywords: ['churn_pct', 'attrition', 'cancellation_rate', 'retention_inverse'], dataType: 'percentage', category: 'economics', explanation: 'Detected SaaS metric: Churn Rate' },

  // Metadata
  { field: 'date', keywords: ['period', 'month_end', 'reporting_date', 'fiscal_date', 'report_date', 'accounting_date', 'posting_date', 'value_date', 'trade_date', 'settlement_date'], dataType: 'date', category: 'metadata', explanation: 'Temporal dimension detected' },
  { field: 'description', keywords: ['remarks', 'comment', 'note', 'particular', 'detail', 'narrative', 'text', 'label_text'], dataType: 'string', category: 'metadata', explanation: 'Free-text description field detected' },
  { field: 'category', keywords: ['department', 'division', 'cost_center', 'profit_center', 'gl_code', 'account_code', 'ledger', 'head', 'segment', 'business_unit'], dataType: 'string', category: 'metadata', explanation: 'Classification / categorization field detected' },

  // Amounts (generic)
  { field: 'amount', keywords: ['amount', 'amt', 'value', 'total', 'sum', 'net_amount', 'gross_amount', 'debit', 'credit', 'balance_amount', 'actual_amount', 'actuals'], dataType: 'number', category: 'metadata', explanation: 'Monetary amount column detected' },
];

function findFinancialHint(header: string): FinancialHint | null {
  const normalized = normalizeColumnName(header);
  for (const hint of FINANCIAL_HINTS) {
    for (const keyword of hint.keywords) {
      const normKeyword = normalizeColumnName(keyword);
      if (normalized === normKeyword || normalized.includes(normKeyword) || normKeyword.includes(normalized)) {
        return hint;
      }
    }
  }
  return null;
}

// ─── FinaPilot Format Detection ───────────────────────────────────────────────

// These are the exact headers used in our CSV templates
const FINAPILOT_HEADERS = new Set([
  'date', 'mrr', 'arr', 'customer_count', 'new_customers', 'churned_customers',
  'churn_rate', 'arpa', 'cac', 'ltv', 'revenue', 'cogs', 'payroll',
  'infrastructure', 'marketing', 'operating_expenses', 'cash_balance',
  'orders', 'aov', 'conversion_rate', 'traffic', 'units_sold',
  'inventory_value', 'shipping_costs', 'payment_processing',
  'orders_per_day', 'average_delivery_time_minutes', 'active_customers',
  'inventory_turnover', 'delivery_costs', 'warehouse_costs',
  // Also accept the transaction-level headers
  'amount', 'description', 'category', 'account', 'reference', 'type', 'currency',
]);

function detectFinaPilotFormat(headers: string[]): { isFinaPilot: boolean; matchPercentage: number } {
  const normalizedHeaders = headers.map(h => normalizeColumnName(h));
  const matches = normalizedHeaders.filter(h => FINAPILOT_HEADERS.has(h));
  const matchPercentage = (matches.length / headers.length) * 100;
  return {
    isFinaPilot: matchPercentage >= 70, // 70%+ match = our format
    matchPercentage,
  };
}

// ─── Main Service ─────────────────────────────────────────────────────────────

export const smartMappingService = {
  /**
   * Perform intelligent column mapping using headers + sample data
   * Calls the Python Worker LLM-powered Semantic API first, then falls back to heuristics.
   */
  analyzeAndMap: async (
    headers: string[],
    sampleRows: Record<string, string>[], // First 5-10 rows
  ): Promise<SmartMappingResult> => {
    logger.info(`[SmartMapping] Analyzing ${headers.length} columns with ${sampleRows.length} sample rows`);

    // Step 0: Detect if this is FinaPilot's own format
    const formatDetection = detectFinaPilotFormat(headers);
    const formatDetected = formatDetection.isFinaPilot ? 'finapilot' : 'custom';
    logger.info(`[SmartMapping] Format detection: ${formatDetected} (${formatDetection.matchPercentage.toFixed(0)}% match)`);

    // Step 0.5: Try OpenAI LLM semantic mapping via Python Worker
    let llmMappings: any[] = [];
    try {
      logger.info("[SmartMapping] Calling Python Worker LLM engine `/api/ai_map_columns`...");
      const workerUrl = process.env.WORKER_URL || 'http://127.0.0.1:5000';
      const workerSecret = process.env.WORKER_SECRET || '';
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout for large AI batches

      const response = await fetch(`${workerUrl}/api/ai_map_columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-secret': workerSecret
        },
        body: JSON.stringify({
          headers: headers,
          sampleRows: sampleRows
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (response.ok) {
        const result: any = await response.json();
        if (result.ok && result.data && result.data.mappings) {
          llmMappings = result.data.mappings;
          logger.info(`[SmartMapping] LLM mapping successful: mapped ${llmMappings.length} columns`);
        }
      } else {
        logger.warn(`[SmartMapping] Python Worker returned status ${response.status}`);
      }
    } catch (e) {
      logger.error(`[SmartMapping] Error calling LLM mapping engine: ${e}`);
    }

    // Step 1: Get rule-based mappings first (existing system)
    const ruleBased = csvMappingService.autoMap(headers);

    // Step 2: For each column, analyze data patterns
    const smartMappings: SmartMapping[] = [];
    const unmappedColumns: string[] = [];
    const skipSuggestions: string[] = [];
    const usedInternalFields = new Set<string>();

    for (const header of headers) {
      // Get sample values for this column
      const sampleValues = sampleRows
        .map(row => row[header] || '')
        .filter(v => v.trim() !== '')
        .slice(0, 5);

      // 1. Check if LLM successfully mapped this header (Case-insensitive match)
      const llmMatch = llmMappings.find(m => 
        (m.csvColumn || m.csv_field || '').toLowerCase().trim() === header.toLowerCase().trim()
      );

      if (llmMatch) {
        if (llmMatch.skip) {
          skipSuggestions.push(header);
          logger.info(`[SmartMapping] AI suggested skipping column: ${header}`);
          continue; // AI determined this is junk
        }
        
        const targetField = llmMatch.internalField || llmMatch.internal_field;
        if (targetField && !usedInternalFields.has(targetField)) {
          usedInternalFields.add(targetField);
          smartMappings.push({
            csvColumn: header, // Use ORIGINAL header casing from input
            internalField: targetField,
            confidence: Math.round(((llmMatch.confidence !== undefined ? llmMatch.confidence : 0.8)) * (llmMatch.confidence <= 1 ? 100 : 1)),
            method: 'ai_semantic',
            explanation: llmMatch.explanation || 'Mapped via AI Semantic Engine',
            dataType: detectDataType(sampleValues),
            sampleValues: sampleValues.slice(0, 3),
            category: 'ai_detected'
          });
          continue;
        }
      }

      // 2. Check if this column should be skipped (Heuristic JUNK Detection fallback)
      if (isLikelyJunkColumn(header, sampleValues)) {
        skipSuggestions.push(header);
        continue;
      }

      // Detect data type from values
      const detectedType = detectDataType(sampleValues);

      // Check rule-based mapping first
      const ruleMapping = ruleBased.mappings.find(m => m.csvField === header);

      // Check financial domain hints
      const financialHint = findFinancialHint(header);

      let bestMapping: SmartMapping | null = null;

      if (ruleMapping && !usedInternalFields.has(ruleMapping.internalField)) {
        // Rule-based mapping found — verify with data type
        let confidenceBoost = 0;
        let explanation = `Matched "${header}" to "${ruleMapping.internalField}" via ${ruleMapping.method}`;

        // Boost confidence if data type matches expectation
        const expectedRule = mappingRules.find(r => r.internalField === ruleMapping.internalField);
        if (expectedRule) {
          if (expectedRule.dataType === detectedType) {
            confidenceBoost = 5;
            explanation += `. Data type confirmed: ${detectedType}`;
          } else if (detectedType !== 'unknown' && detectedType !== 'string') {
            confidenceBoost = -5;
            explanation += `. Warning: expected ${expectedRule.dataType}, found ${detectedType}`;
          }
        }

        bestMapping = {
          csvColumn: header,
          internalField: ruleMapping.internalField,
          confidence: Math.min(100, Math.round(ruleMapping.confidence * 100) + confidenceBoost),
          method: ruleMapping.method,
          explanation,
          dataType: detectedType,
          sampleValues: sampleValues.slice(0, 3),
          category: ruleMapping.category,
        };
      } else if (financialHint && !usedInternalFields.has(financialHint.field)) {
        // Financial domain hint found
        let confidence = 75;
        if (financialHint.dataType === detectedType) confidence = 82;

        bestMapping = {
          csvColumn: header,
          internalField: financialHint.field,
          confidence,
          method: 'pattern',
          explanation: financialHint.explanation,
          dataType: detectedType,
          sampleValues: sampleValues.slice(0, 3),
          category: financialHint.category,
        };
      } else if (detectedType === 'date' && !usedInternalFields.has('date')) {
        // Data pattern says this is a date column
        bestMapping = {
          csvColumn: header,
          internalField: 'date',
          confidence: 88,
          method: 'pattern',
          explanation: `Data pattern analysis: values match date format (e.g., "${sampleValues[0]}")`,
          dataType: 'date',
          sampleValues: sampleValues.slice(0, 3),
          category: 'metadata',
        };
      } else if (detectedType === 'number' && !usedInternalFields.has('amount')) {
        // If we haven't mapped amount yet and this is a number column, suggest it
        const h = header.toLowerCase();
        // Only auto-suggest as amount if header contains financial keywords
        const amountKeywords = ['amount', 'value', 'total', 'price', 'cost', 'sum', 'balance', 'payment', 'charge', 'fee'];
        if (amountKeywords.some(k => h.includes(k))) {
          bestMapping = {
            csvColumn: header,
            internalField: 'amount',
            confidence: 72,
            method: 'pattern',
            explanation: `Header "${header}" + numeric data pattern suggests monetary amount`,
            dataType: 'number',
            sampleValues: sampleValues.slice(0, 3),
            category: 'metadata',
          };
        }
      }

      if (bestMapping) {
        usedInternalFields.add(bestMapping.internalField);
        smartMappings.push(bestMapping);
      } else {
        unmappedColumns.push(header);
      }
    }

    // Calculate overall confidence
    const overallConfidence = smartMappings.length > 0
      ? Math.round(smartMappings.reduce((sum, m) => sum + m.confidence, 0) / smartMappings.length)
      : 0;

    const result: SmartMappingResult = {
      mappings: smartMappings,
      unmappedColumns,
      skipSuggestions,
      overallConfidence,
      method: 'smart-hybrid',
      totalColumns: headers.length,
      mappedCount: smartMappings.length,
      formatDetected,
    };

    logger.info(`[SmartMapping] Result: ${smartMappings.length} mapped, ${unmappedColumns.length} unmapped, ${skipSuggestions.length} skip suggestions, format=${formatDetected}`);

    return result;
  },
};
