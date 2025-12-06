/**
 * DRILL-DOWN SERVICE
 * Provides hierarchical data navigation for reports and dashboards
 * Similar to Abacum's drill-down capability
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';

export interface DrillDownRequest {
  orgId: string;
  metricType: 'revenue' | 'expense' | 'cash' | 'custom';
  metricValue: number;
  period?: string;
  category?: string;
  level: number; // Current drill-down level (0 = top level)
  parentPath?: string[]; // Path to current level
}

export interface DrillDownResult {
  level: number;
  path: string[];
  data: Array<{
    label: string;
    value: number;
    percentage: number;
    children?: number; // Number of child items available
    drillable: boolean;
  }>;
  summary: {
    total: number;
    itemCount: number;
    hasMore: boolean;
  };
  nextLevel?: {
    available: boolean;
    maxDepth: number;
  };
}

export const drillDownService = {
  /**
   * Drill down into a metric
   */
  drillDown: async (
    request: DrillDownRequest,
    userId: string
  ): Promise<DrillDownResult> => {
    try {
      // Validate org access
      const userRole = await prisma.userOrgRole.findUnique({
        where: { userId_orgId: { userId, orgId: request.orgId } },
      });

      if (!userRole) {
        throw new ForbiddenError('User does not have access to this organization');
      }

      // Validate level (max depth = 5)
      if (request.level < 0 || request.level > 5) {
        throw new ValidationError('Drill-down level must be between 0 and 5');
      }

      // Validate path
      if (request.parentPath && request.parentPath.length !== request.level) {
        throw new ValidationError('Parent path length must match level');
      }

      // Get data based on metric type and level
      let result: DrillDownResult;

      switch (request.metricType) {
        case 'revenue':
          result = await drillDownRevenue(request);
          break;
        case 'expense':
          result = await drillDownExpense(request);
          break;
        case 'cash':
          result = await drillDownCash(request);
          break;
        default:
          throw new ValidationError(`Unsupported metric type: ${request.metricType}`);
      }

      logger.info(`Drill-down performed`, {
        orgId: request.orgId,
        metricType: request.metricType,
        level: request.level,
        itemCount: result.summary.itemCount,
      });

      return result;
    } catch (error: any) {
      logger.error('Error performing drill-down', error);
      throw error;
    }
  },

  /**
   * Get available drill-down paths for a metric
   */
  getAvailablePaths: async (
    orgId: string,
    metricType: string,
    userId: string
  ): Promise<Array<{ path: string[]; label: string; available: boolean }>> => {
    try {
      // This would return available drill-down paths
      // For now, return default paths based on metric type
      const paths: Array<{ path: string[]; label: string; available: boolean }> = [];

      if (metricType === 'revenue') {
        paths.push(
          { path: ['by_category'], label: 'By Category', available: true },
          { path: ['by_month'], label: 'By Month', available: true },
          { path: ['by_customer'], label: 'By Customer', available: true },
        );
      } else if (metricType === 'expense') {
        paths.push(
          { path: ['by_category'], label: 'By Category', available: true },
          { path: ['by_month'], label: 'By Month', available: true },
          { path: ['by_vendor'], label: 'By Vendor', available: true },
        );
      }

      return paths;
    } catch (error: any) {
      logger.error('Error getting available paths', error);
      return [];
    }
  },
};

/**
 * Drill down into revenue
 */
async function drillDownRevenue(request: DrillDownRequest): Promise<DrillDownResult> {
  const { orgId, level, parentPath, period, category } = request;

  // Level 0: Top level - by category
  if (level === 0) {
    const transactions = await prisma.rawTransaction.findMany({
      where: {
        orgId,
        amount: { gt: 0 }, // Revenue (positive amounts)
        ...(period ? {
          date: {
            gte: new Date(`${period}-01`),
            lt: new Date(`${period}-32`),
          },
        } : {}),
      },
    });

    const byCategory = new Map<string, number>();
    transactions.forEach(tx => {
      const cat = tx.category || 'Uncategorized';
      let amount: number;
      if (typeof tx.amount === 'object' && tx.amount !== null && 'toNumber' in tx.amount) {
        amount = (tx.amount as any).toNumber();
      } else if (typeof tx.amount === 'object' && tx.amount !== null) {
        amount = Number(String(tx.amount));
      } else {
        amount = Number(tx.amount);
      }
      byCategory.set(cat, (byCategory.get(cat) || 0) + amount);
    });

    const total = Array.from(byCategory.values()).reduce((sum, val) => sum + val, 0);
    const data = Array.from(byCategory.entries()).map(([label, value]) => ({
      label,
      value: Number(value),
      percentage: total > 0 ? (Number(value) / total) * 100 : 0,
      children: 1, // Can drill down to transactions
      drillable: true,
    })).sort((a, b) => b.value - a.value);

    return {
      level: 0,
      path: [],
      data,
      summary: {
        total,
        itemCount: data.length,
        hasMore: data.length > 0,
      },
      nextLevel: {
        available: true,
        maxDepth: 2,
      },
    };
  }

  // Level 1: By category -> transactions
  if (level === 1 && parentPath && parentPath.length === 1) {
    const categoryName = parentPath[0];
    const transactions = await prisma.rawTransaction.findMany({
      where: {
        orgId,
        amount: { gt: 0 },
        category: categoryName,
        ...(period ? {
          date: {
            gte: new Date(`${period}-01`),
            lt: new Date(`${period}-32`),
          },
        } : {}),
      },
      orderBy: { date: 'desc' },
      take: 100, // Limit to 100 transactions
    });

    const total = transactions.reduce((sum, tx) => {
      const amount = typeof tx.amount === 'object' && 'toNumber' in tx.amount 
        ? (tx.amount as any).toNumber() 
        : typeof tx.amount === 'object' && tx.amount !== null
          ? Number(String(tx.amount))
          : Number(tx.amount);
      return sum + amount;
    }, 0);
    const data = transactions.map(tx => {
      let amount: number;
      if (typeof tx.amount === 'object' && tx.amount !== null && 'toNumber' in tx.amount) {
        amount = (tx.amount as any).toNumber();
      } else if (typeof tx.amount === 'object' && tx.amount !== null) {
        amount = Number(String(tx.amount));
      } else {
        amount = Number(tx.amount);
      }
      return {
        label: tx.description || `Transaction ${tx.id.substring(0, 8)}`,
        value: amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        drillable: false, // No further drill-down
      };
    });

    return {
      level: 1,
      path: parentPath,
      data,
      summary: {
        total,
        itemCount: data.length,
        hasMore: false, // Max depth reached
      },
    };
  }

  // Default: return empty
  return {
    level,
    path: parentPath || [],
    data: [],
    summary: {
      total: 0,
      itemCount: 0,
      hasMore: false,
    },
  };
}

/**
 * Drill down into expenses
 */
async function drillDownExpense(request: DrillDownRequest): Promise<DrillDownResult> {
  const { orgId, level, parentPath, period, category } = request;

  // Similar structure to revenue but for expenses (negative amounts)
  if (level === 0) {
    const transactions = await prisma.rawTransaction.findMany({
      where: {
        orgId,
        amount: { lt: 0 }, // Expenses (negative amounts)
        ...(period ? {
          date: {
            gte: new Date(`${period}-01`),
            lt: new Date(`${period}-32`),
          },
        } : {}),
      },
    });

    const byCategory = new Map<string, number>();
    transactions.forEach(tx => {
      const cat = tx.category || 'Uncategorized';
      let amount: number;
      if (typeof tx.amount === 'object' && tx.amount !== null && 'toNumber' in tx.amount) {
        amount = (tx.amount as any).toNumber();
      } else if (typeof tx.amount === 'object' && tx.amount !== null) {
        amount = Number(String(tx.amount));
      } else {
        amount = Number(tx.amount);
      }
      byCategory.set(cat, (byCategory.get(cat) || 0) + Math.abs(amount));
    });

    const total = Array.from(byCategory.values()).reduce((sum, val) => sum + val, 0);
    const data = Array.from(byCategory.entries()).map(([label, value]) => ({
      label,
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
      children: 1,
      drillable: true,
    })).sort((a, b) => b.value - a.value);

    return {
      level: 0,
      path: [],
      data,
      summary: {
        total,
        itemCount: data.length,
        hasMore: data.length > 0,
      },
      nextLevel: {
        available: true,
        maxDepth: 2,
      },
    };
  }

  if (level === 1 && parentPath && parentPath.length === 1) {
    const categoryName = parentPath[0];
    const transactions = await prisma.rawTransaction.findMany({
      where: {
        orgId,
        amount: { lt: 0 },
        category: categoryName,
        ...(period ? {
          date: {
            gte: new Date(`${period}-01`),
            lt: new Date(`${period}-32`),
          },
        } : {}),
      },
      orderBy: { date: 'desc' },
      take: 100,
    });

    const total = transactions.reduce((sum, tx) => {
      let amount: number;
      if (typeof tx.amount === 'object' && tx.amount !== null && 'toNumber' in tx.amount) {
        amount = (tx.amount as any).toNumber();
      } else if (typeof tx.amount === 'object' && tx.amount !== null) {
        amount = Number(String(tx.amount));
      } else {
        amount = Number(tx.amount);
      }
      return sum + Math.abs(amount);
    }, 0);
    const data = transactions.map(tx => {
      let amount: number;
      if (typeof tx.amount === 'object' && tx.amount !== null && 'toNumber' in tx.amount) {
        amount = (tx.amount as any).toNumber();
      } else if (typeof tx.amount === 'object' && tx.amount !== null) {
        amount = Number(String(tx.amount));
      } else {
        amount = Number(tx.amount);
      }
      return {
        label: tx.description || `Transaction ${tx.id.substring(0, 8)}`,
        value: Math.abs(amount),
        percentage: total > 0 ? (Math.abs(amount) / total) * 100 : 0,
        drillable: false,
      };
    });

    return {
      level: 1,
      path: parentPath,
      data,
      summary: {
        total,
        itemCount: data.length,
        hasMore: false,
      },
    };
  }

  return {
    level,
    path: parentPath || [],
    data: [],
    summary: {
      total: 0,
      itemCount: 0,
      hasMore: false,
    },
  };
}

/**
 * Drill down into cash
 */
async function drillDownCash(request: DrillDownRequest): Promise<DrillDownResult> {
  // Cash drill-down would show cash flow components
  // For now, return basic structure
  return {
    level: request.level,
    path: request.parentPath || [],
    data: [],
    summary: {
      total: 0,
      itemCount: 0,
      hasMore: false,
    },
  };
}

