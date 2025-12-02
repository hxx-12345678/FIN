/**
 * TRANSACTION SERVICE
 * Handles transaction listing, filtering, duplicate detection, and statistics
 */

import prisma from '../config/database';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  vendor?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
}

export interface Transaction {
  id: string;
  date: string;
  vendor: string | null;
  category: string | null;
  amount: number;
  currency: string;
  connectorId: string | null;
  isDuplicate: boolean;
  description?: string | null;
}

export interface TransactionStats {
  total: number;
  byCategory: Array<{ category: string; count: number; total: number }>;
  byVendor: Array<{ vendor: string; count: number; total: number }>;
  byMonth: Array<{ month: string; count: number; revenue: number; expenses: number }>;
}

export interface ReconciliationPreview {
  matched: number;
  unmatched: number;
  duplicates: number;
  suggestions: Array<{
    transactionId: string;
    suggestedCategory: string;
    confidence: number;
  }>;
}

/**
 * Extract vendor name from transaction description or rawPayload
 */
function extractVendor(description: string | null, rawPayload: any): string | null {
  if (!description && !rawPayload) return null;
  
  // Try to extract from description (common patterns)
  if (description) {
    // Remove common prefixes/suffixes
    let vendor = description.trim();
    
    // Remove transaction IDs, reference numbers
    vendor = vendor.replace(/\b(REF|REF#|REFERENCE|TXN|ID|#)\s*:?\s*[A-Z0-9-]+\b/gi, '').trim();
    
    // Remove amounts
    vendor = vendor.replace(/\$[\d,]+\.?\d*/g, '').trim();
    
    // Remove dates
    vendor = vendor.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '').trim();
    
    // Take first meaningful words (usually vendor name is at the start)
    const words = vendor.split(/\s+/).filter(w => w.length > 2);
    if (words.length > 0) {
      // Take first 2-3 words as vendor name
      return words.slice(0, 3).join(' ').substring(0, 50);
    }
  }
  
  // Try to extract from rawPayload
  if (rawPayload && typeof rawPayload === 'object') {
    const vendorFields = ['vendor', 'merchant', 'payee', 'name', 'company', 'business'];
    for (const field of vendorFields) {
      if (rawPayload[field] && typeof rawPayload[field] === 'string') {
        return rawPayload[field].substring(0, 50);
      }
    }
  }
  
  return description ? description.substring(0, 50) : null;
}

// Duplicate detection is now inline in listTransactions for better performance

/**
 * Simple string similarity check (Levenshtein-like)
 */
function areSimilar(str1: string, str2: string, threshold: number = 3): boolean {
  if (Math.abs(str1.length - str2.length) > threshold) return false;
  
  let differences = 0;
  const minLen = Math.min(str1.length, str2.length);
  
  for (let i = 0; i < minLen; i++) {
    if (str1[i] !== str2[i]) differences++;
    if (differences > threshold) return false;
  }
  
  return differences <= threshold;
}

export const transactionService = {
  /**
   * List transactions with filtering, pagination, and search
   */
  listTransactions: async (
    userId: string,
    orgId: string,
    filters: TransactionFilters
  ): Promise<{ transactions: Transaction[]; total: number; limit: number; offset: number }> => {
    // Verify access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Build where clause
    const where: any = { orgId };

    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    // Category filter
    if (filters.category) {
      where.category = filters.category;
    }

    // Keyword search (in description)
    if (filters.keyword) {
      where.description = {
        contains: filters.keyword,
        mode: 'insensitive',
      };
    }

    // Apply pagination first to limit the dataset
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    
    // For duplicate detection, we need to check a reasonable window
    // Fetch enough for the current page plus a small buffer for duplicate detection
    const fetchLimit = Math.min(500, limit + offset + 100); // Cap at 500 for performance
    
    logger.info('Fetching transactions', { orgId, fetchLimit, where: Object.keys(where) });
    
    let allTransactions;
    try {
      allTransactions = await prisma.rawTransaction.findMany({
        where,
        orderBy: { date: 'desc' },
        take: fetchLimit, // Limit for performance
        select: {
          id: true,
          date: true,
          amount: true,
          currency: true,
          category: true,
          description: true,
          connectorId: true,
          rawPayload: true,
        },
      });
      logger.info('Transactions fetched', { count: allTransactions.length });
    } catch (error) {
      logger.error('Error fetching transactions', { error: (error as Error).message, orgId });
      throw error;
    }

    // Extract vendors and apply vendor filter
    const transactionsWithVendor = allTransactions.map(tx => ({
      ...tx,
      vendor: extractVendor(tx.description, tx.rawPayload as any),
    }));

    let filteredTransactions = transactionsWithVendor;
    if (filters.vendor) {
      filteredTransactions = transactionsWithVendor.filter(tx =>
        tx.vendor?.toLowerCase().includes(filters.vendor!.toLowerCase())
      );
    }

    // Detect duplicates on the filtered set (only on fetched transactions for performance)
    // Note: This is approximate but efficient
    const duplicateIds = new Set<string>();
    if (filteredTransactions.length > 0) {
      // Only check duplicates within the fetched set
      const groups = new Map<string, Array<{ id: string; vendor: string | null }>>();
      
      for (const tx of filteredTransactions) {
        const amountRounded = Math.round(Number(tx.amount) * 100) / 100;
        const key = `${tx.date.toISOString().split('T')[0]}_${amountRounded}`;
        
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push({ id: tx.id, vendor: tx.vendor });
      }
      
      // Mark duplicates
      for (const [key, group] of groups.entries()) {
        if (group.length > 1) {
          for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
              const vendor1 = group[i].vendor?.toLowerCase().trim() || '';
              const vendor2 = group[j].vendor?.toLowerCase().trim() || '';
              
              if (vendor1 && vendor2 && (vendor1 === vendor2 || areSimilar(vendor1, vendor2))) {
                duplicateIds.add(group[j].id);
              } else if (!vendor1 && !vendor2) {
                duplicateIds.add(group[j].id);
              }
            }
          }
        }
      }
    }

    // Apply pagination
    const paginatedTransactions = filteredTransactions.slice(offset, offset + limit);

    // Format response
    const transactions: Transaction[] = paginatedTransactions.map(tx => ({
      id: tx.id,
      date: tx.date.toISOString().split('T')[0],
      vendor: tx.vendor,
      category: tx.category,
      amount: Number(tx.amount),
      currency: tx.currency,
      connectorId: tx.connectorId,
      isDuplicate: duplicateIds.has(tx.id),
      description: tx.description,
    }));

    // Get total count efficiently
    // For performance, we'll use the filtered count as an approximation
    // If vendor filter is applied, we can't use simple count anyway
    // This avoids expensive full table scans on large datasets
    let totalCount: number = filteredTransactions.length;
    
    // Only do database count if no filters that require post-processing
    // Skip count query for now to avoid timeouts - use filtered count
    // In production, this could be optimized with a materialized view or cache
    if (false && !filters.vendor && !filters.keyword) {
      try {
        // Use a timeout to prevent hanging on large datasets
        const countPromise = prisma.rawTransaction.count({ where });
        const timeoutPromise = new Promise<number>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        );
        
        totalCount = await Promise.race([countPromise, timeoutPromise]) as number;
      } catch (error) {
        // Fallback to filtered count if count query fails or times out
        logger.warn('Count query failed, using filtered count', { 
          error: (error as Error).message,
          orgId 
        });
        totalCount = filteredTransactions.length;
      }
    }

    return {
      transactions,
      total: totalCount,
      limit,
      offset,
    };
  },

  /**
   * Get transaction statistics
   */
  getStats: async (
    userId: string,
    orgId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TransactionStats> => {
    // Verify access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Build where clause
    const where: any = { orgId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    // Get all transactions (limit to prevent timeout on large datasets)
    // For stats, we'll sample up to 10000 transactions for performance
    const transactions = await prisma.rawTransaction.findMany({
      where,
      take: 10000, // Limit for performance
      select: {
        id: true,
        date: true,
        amount: true,
        category: true,
        description: true,
        rawPayload: true,
      },
    });

    // Extract vendors
    const transactionsWithVendor = transactions.map(tx => ({
      ...tx,
      vendor: extractVendor(tx.description, tx.rawPayload as any),
      amount: Number(tx.amount),
    }));

    // Calculate statistics
    const total = transactionsWithVendor.length;

    // By category
    const byCategoryMap = new Map<string, { count: number; total: number }>();
    for (const tx of transactionsWithVendor) {
      const category = tx.category || 'Uncategorized';
      const existing = byCategoryMap.get(category) || { count: 0, total: 0 };
      byCategoryMap.set(category, {
        count: existing.count + 1,
        total: existing.total + Math.abs(tx.amount),
      });
    }
    const byCategory = Array.from(byCategoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.total - a.total);

    // By vendor
    const byVendorMap = new Map<string, { count: number; total: number }>();
    for (const tx of transactionsWithVendor) {
      const vendor = tx.vendor || 'Unknown';
      const existing = byVendorMap.get(vendor) || { count: 0, total: 0 };
      byVendorMap.set(vendor, {
        count: existing.count + 1,
        total: existing.total + Math.abs(tx.amount),
      });
    }
    const byVendor = Array.from(byVendorMap.entries())
      .map(([vendor, data]) => ({ vendor, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20); // Top 20 vendors

    // By month
    const byMonthMap = new Map<string, { count: number; revenue: number; expenses: number }>();
    for (const tx of transactionsWithVendor) {
      const month = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
      const existing = byMonthMap.get(month) || { count: 0, revenue: 0, expenses: 0 };
      byMonthMap.set(month, {
        count: existing.count + 1,
        revenue: existing.revenue + (tx.amount > 0 ? tx.amount : 0),
        expenses: existing.expenses + (tx.amount < 0 ? Math.abs(tx.amount) : 0),
      });
    }
    const byMonth = Array.from(byMonthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      total,
      byCategory,
      byVendor,
      byMonth,
    };
  },

  /**
   * Get reconciliation preview
   */
  getReconciliationPreview: async (
    userId: string,
    orgId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ReconciliationPreview> => {
    // Verify access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Build where clause
    const where: any = { orgId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    // Get transactions (limit to prevent timeout)
    const transactions = await prisma.rawTransaction.findMany({
      where,
      take: 5000, // Limit for performance
      select: {
        id: true,
        date: true,
        amount: true,
        category: true,
        description: true,
        rawPayload: true,
      },
    });

    // Extract vendors
    const transactionsWithVendor = transactions.map(tx => ({
      ...tx,
      vendor: extractVendor(tx.description, tx.rawPayload as any),
      amount: Number(tx.amount),
    }));

    // Detect duplicates inline (same logic as listTransactions)
    const duplicateIds = new Set<string>();
    if (transactionsWithVendor.length > 0) {
      const groups = new Map<string, Array<{ id: string; vendor: string | null }>>();
      
      for (const tx of transactionsWithVendor) {
        const amountRounded = Math.round(tx.amount * 100) / 100;
        const key = `${tx.date.toISOString().split('T')[0]}_${amountRounded}`;
        
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push({ id: tx.id, vendor: tx.vendor });
      }
      
      for (const [key, group] of groups.entries()) {
        if (group.length > 1) {
          for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
              const vendor1 = group[i].vendor?.toLowerCase().trim() || '';
              const vendor2 = group[j].vendor?.toLowerCase().trim() || '';
              
              if (vendor1 && vendor2 && (vendor1 === vendor2 || areSimilar(vendor1, vendor2))) {
                duplicateIds.add(group[j].id);
              } else if (!vendor1 && !vendor2) {
                duplicateIds.add(group[j].id);
              }
            }
          }
        }
      }
    }

    // Count matched (has category) vs unmatched
    let matched = 0;
    let unmatched = 0;
    const suggestions: Array<{ transactionId: string; suggestedCategory: string; confidence: number }> = [];

    for (const tx of transactionsWithVendor) {
      if (tx.category) {
        matched++;
      } else {
        unmatched++;
        // Simple suggestion: use most common category for similar vendors
        const similarTxs = transactionsWithVendor.filter(
          t => t.vendor && tx.vendor && t.vendor.toLowerCase() === tx.vendor.toLowerCase() && t.category
        );
        if (similarTxs.length > 0) {
          const categoryCounts = new Map<string, number>();
          for (const similarTx of similarTxs) {
            if (similarTx.category) {
              categoryCounts.set(similarTx.category, (categoryCounts.get(similarTx.category) || 0) + 1);
            }
          }
          const mostCommon = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0];
          if (mostCommon) {
            suggestions.push({
              transactionId: tx.id,
              suggestedCategory: mostCommon[0],
              confidence: Math.min(0.9, mostCommon[1] / similarTxs.length),
            });
          }
        }
      }
    }

    return {
      matched,
      unmatched,
      duplicates: duplicateIds.size,
      suggestions: suggestions.slice(0, 50), // Limit to 50 suggestions
    };
  },
};

