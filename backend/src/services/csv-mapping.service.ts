/**
 * CSV Column Mapping Service
 * Intelligent automated mapping of CSV columns to internal data model fields
 * 
 * Architecture:
 * - Rule-based matching using synonym dictionaries
 * - Fuzzy matching for unknown columns
 * - Confidence scoring
 * - ML-ready keyword matching
 */

import {
  mappingRules,
  normalizeColumnName,
  calculateSimilarity,
  getMappingRule,
} from '../config/column-mapping.config';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface ColumnMapping {
  csvField: string;
  internalField: string;
  confidence: number;
  method: 'exact' | 'synonym' | 'fuzzy' | 'manual';
  category: string;
}

export interface MappingResult {
  mappings: ColumnMapping[];
  unmappedColumns: string[];
  overallConfidence: number;
  method: 'rule-based' | 'hybrid';
}

/**
 * Find best match for a CSV column using multiple strategies
 */
const findBestMatch = (csvColumn: string): { internalField: string; confidence: number; method: ColumnMapping['method']; category: string } | null => {
  const normalizedCsv = normalizeColumnName(csvColumn);

  // Strategy 1: Exact match against synonyms
  for (const rule of mappingRules) {
    for (const synonym of rule.synonyms) {
      const normalizedSynonym = normalizeColumnName(synonym);
      if (normalizedCsv === normalizedSynonym) {
        return {
          internalField: rule.internalField,
          confidence: rule.confidence,
          method: 'exact',
          category: rule.category,
        };
      }
    }
  }

  // Strategy 2: Partial match (contains)
  let bestPartialMatch: { internalField: string; confidence: number; method: ColumnMapping['method']; category: string } | null = null;
  let bestPartialScore = 0.5; // Minimum threshold for partial matches

  for (const rule of mappingRules) {
    for (const synonym of rule.synonyms) {
      const normalizedSynonym = normalizeColumnName(synonym);
      if (normalizedCsv.includes(normalizedSynonym) || normalizedSynonym.includes(normalizedCsv)) {
        const score = Math.min(normalizedCsv.length, normalizedSynonym.length) / Math.max(normalizedCsv.length, normalizedSynonym.length);
        if (score > bestPartialScore) {
          bestPartialScore = score;
          bestPartialMatch = {
            internalField: rule.internalField,
            confidence: rule.confidence * score, // Reduce confidence for partial matches
            method: 'synonym',
            category: rule.category,
          };
        }
      }
    }
  }

  if (bestPartialMatch) {
    return bestPartialMatch;
  }

  // Strategy 3: Fuzzy matching (Levenshtein distance)
  let bestFuzzyMatch: { internalField: string; confidence: number; method: ColumnMapping['method']; category: string } | null = null;
  let bestFuzzyScore = 0.6; // Minimum threshold for fuzzy matches

  for (const rule of mappingRules) {
    for (const synonym of rule.synonyms) {
      const similarity = calculateSimilarity(csvColumn, synonym);
      if (similarity > bestFuzzyScore) {
        bestFuzzyScore = similarity;
        bestFuzzyMatch = {
          internalField: rule.internalField,
          confidence: rule.confidence * similarity * 0.8, // Further reduce confidence for fuzzy matches
          method: 'fuzzy',
          category: rule.category,
        };
      }
    }
  }

  return bestFuzzyMatch;
};

/**
 * Detect conflicting mappings (same internal field mapped to multiple CSV columns)
 */
const detectConflicts = (mappings: ColumnMapping[]): ColumnMapping[] => {
  const fieldCounts = new Map<string, ColumnMapping[]>();
  
  // Group mappings by internal field
  for (const mapping of mappings) {
    if (!fieldCounts.has(mapping.internalField)) {
      fieldCounts.set(mapping.internalField, []);
    }
    fieldCounts.get(mapping.internalField)!.push(mapping);
  }

  // Find conflicts (multiple CSV columns mapping to same internal field)
  const conflicts: ColumnMapping[] = [];
  for (const [internalField, maps] of fieldCounts.entries()) {
    if (maps.length > 1) {
      // Keep the one with highest confidence, mark others as conflicts
      maps.sort((a, b) => b.confidence - a.confidence);
      for (let i = 1; i < maps.length; i++) {
        conflicts.push(maps[i]);
      }
    }
  }

  return conflicts;
};

/**
 * Automatically map CSV columns to internal fields
 */
export const csvMappingService = {
  /**
   * Generate column mappings from CSV headers
   */
  autoMap: (csvHeaders: string[]): MappingResult => {
    if (!Array.isArray(csvHeaders) || csvHeaders.length === 0) {
      throw new ValidationError('csvHeaders must be a non-empty array');
    }

    logger.info(`Auto-mapping ${csvHeaders.length} CSV columns`);

    const mappings: ColumnMapping[] = [];
    const unmappedColumns: string[] = [];
    const usedInternalFields = new Set<string>();

    // Process each CSV header
    for (const csvColumn of csvHeaders) {
      if (!csvColumn || typeof csvColumn !== 'string') {
        logger.warn(`Skipping invalid CSV column: ${csvColumn}`);
        continue;
      }

      const match = findBestMatch(csvColumn);

      if (match && match.confidence >= 0.5) {
        // Check if this internal field is already mapped
        if (usedInternalFields.has(match.internalField)) {
          // Conflict: same internal field mapped twice
          // Keep the one with higher confidence (already in mappings)
          const existingMapping = mappings.find(m => m.internalField === match.internalField);
          if (existingMapping && existingMapping.confidence < match.confidence) {
            // Replace with better match
            const index = mappings.indexOf(existingMapping);
            mappings[index] = {
              csvField: csvColumn,
              internalField: match.internalField,
              confidence: match.confidence,
              method: match.method,
              category: match.category,
            };
          } else {
            // Keep existing, add to unmapped
            unmappedColumns.push(csvColumn);
          }
        } else {
          // Valid mapping
          mappings.push({
            csvField: csvColumn,
            internalField: match.internalField,
            confidence: match.confidence,
            method: match.method,
            category: match.category,
          });
          usedInternalFields.add(match.internalField);
        }
      } else {
        // No good match found
        unmappedColumns.push(csvColumn);
      }
    }

    // Calculate overall confidence
    const overallConfidence = mappings.length > 0
      ? mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length
      : 0;

    // Detect and handle conflicts
    const conflicts = detectConflicts(mappings);
    if (conflicts.length > 0) {
      logger.warn(`Detected ${conflicts.length} mapping conflicts`);
      // Remove conflicting mappings with lower confidence
      for (const conflict of conflicts) {
        const index = mappings.findIndex(m => m.csvField === conflict.csvField);
        if (index >= 0) {
          mappings.splice(index, 1);
          unmappedColumns.push(conflict.csvField);
        }
      }
    }

    logger.info(`Mapped ${mappings.length} columns, ${unmappedColumns.length} unmapped`);

    return {
      mappings,
      unmappedColumns,
      overallConfidence,
      method: 'rule-based',
    };
  },

  /**
   * Get mapping suggestions for a single column
   */
  suggestMapping: (csvColumn: string): ColumnMapping[] => {
    const normalizedCsv = normalizeColumnName(csvColumn);
    const suggestions: ColumnMapping[] = [];

    // Get all potential matches with scores
    for (const rule of mappingRules) {
      let bestScore = 0;
      let bestSynonym = '';

      for (const synonym of rule.synonyms) {
        const normalizedSynonym = normalizeColumnName(synonym);
        let score = 0;

        // Exact match
        if (normalizedCsv === normalizedSynonym) {
          score = 1.0;
        }
        // Contains match
        else if (normalizedCsv.includes(normalizedSynonym) || normalizedSynonym.includes(normalizedCsv)) {
          score = 0.7;
        }
        // Fuzzy match
        else {
          score = calculateSimilarity(csvColumn, synonym);
        }

        if (score > bestScore) {
          bestScore = score;
          bestSynonym = synonym;
        }
      }

      if (bestScore >= 0.4) { // Lower threshold for suggestions
        suggestions.push({
          csvField: csvColumn,
          internalField: rule.internalField,
          confidence: rule.confidence * bestScore,
          method: bestScore >= 0.9 ? 'exact' : bestScore >= 0.7 ? 'synonym' : 'fuzzy',
          category: rule.category,
        });
      }
    }

    // Sort by confidence descending
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return suggestions.slice(0, 5); // Return top 5 suggestions
  },

  /**
   * Validate a manual mapping
   */
  validateMapping: (csvField: string, internalField: string): { valid: boolean; confidence: number; category?: string } => {
    const rule = getMappingRule(internalField);
    if (!rule) {
      return {
        valid: false,
        confidence: 0,
      };
    }

    const normalizedCsv = normalizeColumnName(csvField);
    const normalizedInternal = normalizeColumnName(internalField);

    // Check if CSV field matches any synonym
    let confidence = 0;
    for (const synonym of rule.synonyms) {
      const normalizedSynonym = normalizeColumnName(synonym);
      if (normalizedCsv === normalizedSynonym) {
        confidence = 1.0;
        break;
      } else if (normalizedCsv.includes(normalizedSynonym) || normalizedSynonym.includes(normalizedCsv)) {
        confidence = Math.max(confidence, 0.8);
      } else {
        const similarity = calculateSimilarity(csvField, synonym);
        confidence = Math.max(confidence, similarity * 0.7);
      }
    }

    return {
      valid: confidence >= 0.3,
      confidence,
      category: rule.category,
    };
  },
};


