/**
 * CSV Template Service
 * Generates downloadable CSV templates for different industries
 * 
 * Architecture:
 * - Configuration-driven (templates defined in config)
 * - In-memory caching for performance
 * - No database dependencies
 * - Clean separation of concerns
 */

import { getTemplateConfig, isValidIndustry, IndustryType } from '../config/csv-templates.config';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

interface CachedTemplate {
  csvContent: string;
  contentType: string;
  filename: string;
  cachedAt: number;
}

// In-memory cache for generated templates
const templateCache = new Map<string, CachedTemplate>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache TTL

/**
 * Generate CSV content from template configuration
 */
const generateCSVContent = (headers: string[], exampleRows: Record<string, string | number>[]): string => {
  // Create CSV content with headers
  const csvLines: string[] = [];
  
  // Add header row
  csvLines.push(headers.join(','));
  
  // Add example rows
  for (const row of exampleRows) {
    const values = headers.map(header => {
      const value = row[header];
      // Format numbers without quotes, strings/dates with quotes if they contain commas
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvLines.push(values.join(','));
  }
  
  return csvLines.join('\n');
};

/**
 * Get or generate CSV template for an industry
 */
export const csvTemplateService = {
  /**
   * Get CSV template for an industry
   * Returns cached version if available, otherwise generates and caches
   */
  getTemplate: (industry: IndustryType): { csvContent: string; contentType: string; filename: string } => {
    // Validate industry
    if (!isValidIndustry(industry)) {
      throw new ValidationError(`Invalid industry: ${industry}. Must be one of: saas, ecommerce, quickcommerce`);
    }

    // Check cache
    const cacheKey = `template_${industry}`;
    const cached = templateCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.cachedAt) < CACHE_TTL_MS) {
      logger.debug(`Returning cached template for industry: ${industry}`);
      return {
        csvContent: cached.csvContent,
        contentType: cached.contentType,
        filename: cached.filename,
      };
    }

    // Get template configuration
    const templateConfig = getTemplateConfig(industry);
    if (!templateConfig) {
      throw new ValidationError(`Template not found for industry: ${industry}`);
    }

    // Generate CSV content
    const csvContent = generateCSVContent(templateConfig.headers, templateConfig.exampleRows);
    const filename = `finapilot-${industry}-template.csv`;
    const contentType = 'text/csv; charset=utf-8';

    // Cache the generated template
    const cachedTemplate: CachedTemplate = {
      csvContent,
      contentType,
      filename,
      cachedAt: now,
    };
    templateCache.set(cacheKey, cachedTemplate);

    logger.info(`Generated and cached CSV template for industry: ${industry}`);
    
    return {
      csvContent,
      contentType,
      filename,
    };
  },

  /**
   * Clear template cache (useful for testing or cache invalidation)
   */
  clearCache: (industry?: IndustryType): void => {
    if (industry) {
      const cacheKey = `template_${industry}`;
      templateCache.delete(cacheKey);
      logger.debug(`Cleared cache for industry: ${industry}`);
    } else {
      templateCache.clear();
      logger.debug('Cleared all template caches');
    }
  },

  /**
   * Get cache statistics (for monitoring/debugging)
   */
  getCacheStats: (): { size: number; keys: string[] } => {
    return {
      size: templateCache.size,
      keys: Array.from(templateCache.keys()),
    };
  },
};


