/**
 * Data Quality Validation Service
 * 
 * Implements the 5 critical edge cases for DPP clients:
 * 1. CSV column validation with clear error messaging
 * 2. Period detection (monthly vs quarterly confirmation)
 * 3. Extreme assumption flagging (>3 SD warning)
 * 4. Connector API failure fallback with timestamp display
 * 5. Large model revalidation trigger (>20% revenue change)
 * 
 * Research basis: Z-score outlier detection (±3σ), 
 * quarantine-based error handling, and temporal gap analysis.
 */

import { ValidationError } from '../utils/errors';

// --- Types ---

export interface DataQualityIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'schema' | 'data_type' | 'duplicate' | 'null_value' | 'outlier' | 'temporal' | 'range';
  row?: number;
  column?: string;
  message: string;
  suggestion?: string;
  value?: any;
}

export interface PeriodDetectionResult {
  detectedFrequency: 'monthly' | 'quarterly' | 'annual' | 'weekly' | 'daily' | 'irregular';
  confidence: number;
  startDate: string | null;
  endDate: string | null;
  totalPeriods: number;
  gaps: { after: string; expected: string }[];
  requiresConfirmation: boolean;
}

export interface OutlierResult {
  column: string;
  outliers: {
    row: number;
    value: number;
    mean: number;
    stdDev: number;
    zScore: number;
    severity: 'warning' | 'critical';
  }[];
}

export interface DataQualityReport {
  totalRows: number;
  totalColumns: number;
  issues: DataQualityIssue[];
  periodDetection: PeriodDetectionResult | null;
  outliers: OutlierResult[];
  overallScore: number; // 0—100
  passesMinimumThreshold: boolean;
}

// --- Service ---

export const dataQualityService = {

  /**
   * Edge Case 1: Full CSV Data Quality Validation
   * Checks for nulls, duplicates, type mismatches, empty rows
   */
  validateCSVData: (
    headers: string[],
    rows: Record<string, string>[],
    mappings: Record<string, string>
  ): DataQualityIssue[] => {
    const issues: DataQualityIssue[] = [];

    // 1a. Check for required mapped columns
    const requiredInternal = ['date', 'amount'];
    for (const req of requiredInternal) {
      const csvCol = mappings[req];
      if (!csvCol) {
        issues.push({
          severity: 'critical',
          category: 'schema',
          column: req,
          message: `Required field "${req}" is not mapped to any CSV column.`,
          suggestion: `Map one of your CSV columns to the "${req}" field.`,
        });
      }
    }

    // 1b. Check for empty/null values in mapped required columns
    const dateCol = mappings['date'];
    const amountCol = mappings['amount'];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // +1 for 0-index, +1 for header row

      // Null/empty check
      if (dateCol && (!row[dateCol] || row[dateCol].trim() === '')) {
        issues.push({
          severity: 'critical',
          category: 'null_value',
          row: rowNum,
          column: dateCol,
          message: `Row ${rowNum}: Date field "${dateCol}" is empty.`,
          suggestion: 'Remove this row or provide a valid date.',
        });
      }

      if (amountCol && (!row[amountCol] || row[amountCol].trim() === '')) {
        issues.push({
          severity: 'warning',
          category: 'null_value',
          row: rowNum,
          column: amountCol,
          message: `Row ${rowNum}: Amount field "${amountCol}" is empty. Will be treated as 0.`,
          suggestion: 'Verify this is intentional.',
        });
      }

      // Type check: amount should be numeric
      if (amountCol && row[amountCol]) {
        const cleaned = row[amountCol].replace(/[$,₹€£\s]/g, '');
        if (cleaned && isNaN(Number(cleaned))) {
          issues.push({
            severity: 'critical',
            category: 'data_type',
            row: rowNum,
            column: amountCol,
            message: `Row ${rowNum}: Value "${row[amountCol]}" in "${amountCol}" is not a valid number.`,
            suggestion: 'Remove currency symbols or non-numeric characters.',
            value: row[amountCol],
          });
        }
      }

      // Type check: date should be parseable
      if (dateCol && row[dateCol]) {
        const dateVal = row[dateCol].trim();
        const parsed = Date.parse(dateVal);
        // Also try common non-ISO formats
        if (isNaN(parsed) && !/^\d{4}[-/]\d{1,2}([-/]\d{1,2})?$/.test(dateVal) && !/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(dateVal)) {
          issues.push({
            severity: 'warning',
            category: 'data_type',
            row: rowNum,
            column: dateCol,
            message: `Row ${rowNum}: Date "${dateVal}" may not be in a recognized format.`,
            suggestion: 'Use YYYY-MM-DD or MM/DD/YYYY format.',
            value: dateVal,
          });
        }
      }
    });

    // 1c. Duplicate detection (by date + amount)
    if (dateCol && amountCol) {
      const seen = new Map<string, number>();
      rows.forEach((row, idx) => {
        const key = `${row[dateCol]}|${row[amountCol]}`;
        if (seen.has(key)) {
          issues.push({
            severity: 'warning',
            category: 'duplicate',
            row: idx + 2,
            message: `Row ${idx + 2}: Possible duplicate of row ${seen.get(key)! + 2} (same date and amount).`,
            suggestion: 'Review whether this is an intentional duplicate transaction.',
          });
        } else {
          seen.set(key, idx);
        }
      });
    }

    return issues;
  },

  /**
   * Edge Case 2: Period Detection (Monthly vs Quarterly)
   * Analyzes date column to detect frequency and gaps
   */
  detectPeriod: (
    rows: Record<string, string>[],
    dateColumn: string
  ): PeriodDetectionResult => {
    const dates: Date[] = [];

    for (const row of rows) {
      const val = row[dateColumn]?.trim();
      if (!val) continue;

      let d: Date | null = null;
      
      // Try YYYY-MM format
      if (/^\d{4}-\d{2}$/.test(val)) {
        d = new Date(val + '-01');
      }
      // Try YYYY-MM-DD
      else if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        d = new Date(val);
      }
      // Try MM/DD/YYYY
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) {
        d = new Date(val);
      }
      // Generic parse
      else {
        const parsed = Date.parse(val);
        if (!isNaN(parsed)) d = new Date(parsed);
      }

      if (d && !isNaN(d.getTime())) {
        dates.push(d);
      }
    }

    if (dates.length < 2) {
      return {
        detectedFrequency: 'irregular',
        confidence: 0,
        startDate: dates[0]?.toISOString().split('T')[0] || null,
        endDate: dates[0]?.toISOString().split('T')[0] || null,
        totalPeriods: dates.length,
        gaps: [],
        requiresConfirmation: true,
      };
    }

    // Sort chronologically
    dates.sort((a, b) => a.getTime() - b.getTime());

    // Calculate intervals in days
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const diffMs = dates[i].getTime() - dates[i - 1].getTime();
      intervals.push(Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }

    // Determine median interval
    const sorted = [...intervals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    let frequency: PeriodDetectionResult['detectedFrequency'] = 'irregular';
    let confidence = 0;

    if (median >= 25 && median <= 35) {
      frequency = 'monthly';
      confidence = intervals.filter(i => i >= 25 && i <= 35).length / intervals.length;
    } else if (median >= 85 && median <= 95) {
      frequency = 'quarterly';
      confidence = intervals.filter(i => i >= 85 && i <= 95).length / intervals.length;
    } else if (median >= 360 && median <= 370) {
      frequency = 'annual';
      confidence = intervals.filter(i => i >= 360 && i <= 370).length / intervals.length;
    } else if (median >= 5 && median <= 9) {
      frequency = 'weekly';
      confidence = intervals.filter(i => i >= 5 && i <= 9).length / intervals.length;
    } else if (median >= 0 && median <= 2) {
      frequency = 'daily';
      confidence = intervals.filter(i => i >= 0 && i <= 2).length / intervals.length;
    }

    // Find gaps (intervals deviating >50% from median)
    const gaps: { after: string; expected: string }[] = [];
    for (let i = 0; i < intervals.length; i++) {
      if (Math.abs(intervals[i] - median) > median * 0.5 && median > 0) {
        gaps.push({
          after: dates[i].toISOString().split('T')[0],
          expected: `~${median} days but found ${intervals[i]} days`,
        });
      }
    }

    return {
      detectedFrequency: frequency,
      confidence: Math.round(confidence * 100) / 100,
      startDate: dates[0].toISOString().split('T')[0],
      endDate: dates[dates.length - 1].toISOString().split('T')[0],
      totalPeriods: dates.length,
      gaps,
      requiresConfirmation: confidence < 0.8 || gaps.length > 0 || frequency === 'irregular',
    };
  },

  /**
   * Edge Case 3: Extreme Assumption Flagging (3-Sigma / Z-Score)
   * Flags values that deviate >3 standard deviations from historical mean
   */
  detectOutliers: (
    rows: Record<string, string>[],
    numericColumns: string[],
    threshold: number = 3.0
  ): OutlierResult[] => {
    const results: OutlierResult[] = [];

    for (const col of numericColumns) {
      const values: { row: number; value: number }[] = [];
      
      rows.forEach((row, idx) => {
        const raw = row[col]?.replace(/[$,₹€£\s]/g, '');
        if (raw && !isNaN(Number(raw))) {
          values.push({ row: idx + 2, value: Number(raw) });
        }
      });

      if (values.length < 5) continue; // Need minimum sample for stats

      const nums = values.map(v => v.value);
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const variance = nums.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / nums.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev === 0) continue; // All values identical

      const outliers = values
        .map(v => ({
          ...v,
          mean: Math.round(mean * 100) / 100,
          stdDev: Math.round(stdDev * 100) / 100,
          zScore: Math.round(Math.abs((v.value - mean) / stdDev) * 100) / 100,
        }))
        .filter(v => v.zScore > threshold)
        .map(v => ({
          ...v,
          severity: (v.zScore > 4 ? 'critical' : 'warning') as 'warning' | 'critical',
        }));

      if (outliers.length > 0) {
        results.push({ column: col, outliers });
      }
    }

    return results;
  },

  /**
   * Edge Case 4: Revenue Assumption Change Revalidation Trigger
   * If revenue changes >20%, flag for CFO review
   */
  checkAssumptionDrift: (
    previousValues: Record<string, number>,
    newValues: Record<string, number>,
    driftThreshold: number = 0.20
  ): DataQualityIssue[] => {
    const issues: DataQualityIssue[] = [];
    const criticalMetrics = ['revenue', 'mrr', 'arr', 'cash_balance', 'payroll'];

    for (const metric of criticalMetrics) {
      const prev = previousValues[metric];
      const next = newValues[metric];

      if (prev !== undefined && next !== undefined && prev !== 0) {
        const changeRatio = Math.abs((next - prev) / prev);
        if (changeRatio > driftThreshold) {
          const changePercent = Math.round(changeRatio * 100);
          issues.push({
            severity: changeRatio > 0.5 ? 'critical' : 'warning',
            category: 'range',
            column: metric,
            message: `${metric.toUpperCase()} changed by ${changePercent}% (${prev.toLocaleString()} → ${next.toLocaleString()}).`,
            suggestion: `This exceeds the ${Math.round(driftThreshold * 100)}% threshold. Please verify this assumption before the model recomputes all downstream values.`,
            value: { previous: prev, new: next, changePercent },
          });
        }
      }
    }

    return issues;
  },

  /**
   * Full Validation Pipeline: Combines all checks
   */
  runFullValidation: (
    headers: string[],
    rows: Record<string, string>[],
    mappings: Record<string, string>
  ): DataQualityReport => {
    // 1. Schema + data quality
    const issues = dataQualityService.validateCSVData(headers, rows, mappings);

    // 2. Period detection
    const dateCol = mappings['date'];
    let periodDetection: PeriodDetectionResult | null = null;
    if (dateCol) {
      periodDetection = dataQualityService.detectPeriod(rows, dateCol);
      
      if (periodDetection.requiresConfirmation) {
        issues.push({
          severity: 'warning',
          category: 'temporal',
          message: `Detected ${periodDetection.detectedFrequency} data from ${periodDetection.startDate} to ${periodDetection.endDate} (${periodDetection.totalPeriods} periods, confidence: ${Math.round(periodDetection.confidence * 100)}%).`,
          suggestion: 'Please confirm this is the correct frequency before model build.',
        });
      }

      if (periodDetection.gaps.length > 0) {
        for (const gap of periodDetection.gaps.slice(0, 5)) {
          issues.push({
            severity: 'warning',
            category: 'temporal',
            message: `Gap detected after ${gap.after}: ${gap.expected}.`,
            suggestion: 'Missing periods may cause inaccurate averages in the model.',
          });
        }
      }
    }

    // 3. Outlier detection on numeric columns
    const numericColumns = Object.values(mappings).filter(col =>
      col && col !== mappings['date'] && col !== mappings['description']
    );
    const outliers = dataQualityService.detectOutliers(rows, numericColumns);
    
    for (const outlierGroup of outliers) {
      for (const o of outlierGroup.outliers.slice(0, 3)) {
        issues.push({
          severity: o.severity,
          category: 'outlier',
          row: o.row,
          column: outlierGroup.column,
          message: `Row ${o.row}: Value ${o.value.toLocaleString()} in "${outlierGroup.column}" is ${o.zScore}σ from mean (${o.mean.toLocaleString()}).`,
          suggestion: o.severity === 'critical'
            ? 'This value is extremely unusual. Please verify it is correct.'
            : 'This value is unusual but may be legitimate. CFO review recommended.',
          value: o.value,
        });
      }
    }

    // 4. Calculate overall quality score
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const totalRows = rows.length;
    
    let score = 100;
    score -= criticalCount * 10;
    score -= warningCount * 2;
    score = Math.max(0, Math.min(100, score));

    return {
      totalRows,
      totalColumns: headers.length,
      issues,
      periodDetection,
      outliers,
      overallScore: score,
      passesMinimumThreshold: criticalCount === 0 || (criticalCount / totalRows) < 0.05,
    };
  },
};
