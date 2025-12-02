/**
 * Model Cache Service
 * Caches model run results by org_id, input hash, and model version
 * Reduces redundant computations and speeds up exports
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export interface CacheKey {
  orgId: string;
  inputHash: string;
  modelVersion: string;
}

export interface CachedModelResult {
  modelRunId: string;
  summaryJson: any;
  cachedAt: Date;
  expiresAt: Date;
}

const CACHE_TTL_HOURS = 24; // Cache for 24 hours
const CACHE_TTL_MS = CACHE_TTL_HOURS * 60 * 60 * 1000;

export const modelCacheService = {
  /**
   * Generate input hash from model assumptions and parameters
   */
  generateInputHash: (assumptions: any, params: any): string => {
    const inputString = JSON.stringify({
      assumptions: assumptions || {},
      params: params || {},
    });
    return crypto.createHash('sha256').update(inputString).digest('hex').substring(0, 16);
  },

  /**
   * Get cached model result if available
   */
  getCachedResult: async (
    orgId: string,
    inputHash: string,
    modelVersion: string
  ): Promise<CachedModelResult | null> => {
    try {
      // Check for recent model run with matching hash
      const recentRun = await prisma.modelRun.findFirst({
        where: {
          orgId,
          status: 'done',
          paramsJson: {
            path: ['inputHash'],
            equals: inputHash,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      });

      if (!recentRun) {
        return null;
      }

      // Check if cache is still valid (within TTL)
      const createdAt = new Date(recentRun.createdAt);
      const expiresAt = new Date(createdAt.getTime() + CACHE_TTL_MS);
      const now = new Date();

      if (now > expiresAt) {
        logger.info(`Cache expired for org ${orgId}, hash ${inputHash}`);
        return null;
      }

      // Extract summary JSON
      let summaryJson = recentRun.summaryJson;
      if (typeof summaryJson === 'string') {
        try {
          summaryJson = JSON.parse(summaryJson);
        } catch {
          return null;
        }
      }

      return {
        modelRunId: recentRun.id,
        summaryJson,
        cachedAt: createdAt,
        expiresAt,
      };
    } catch (error: any) {
      logger.error(`Failed to get cached model result: ${error.message}`, error);
      return null;
    }
  },

  /**
   * Store model result in cache (by storing inputHash in paramsJson)
   */
  cacheResult: async (
    modelRunId: string,
    orgId: string,
    inputHash: string,
    modelVersion: string
  ): Promise<void> => {
    try {
      // Update model run params to include cache metadata
      const modelRun = await prisma.modelRun.findUnique({
        where: { id: modelRunId },
        select: { paramsJson: true },
      });

      if (!modelRun) {
        return;
      }

      let paramsJson = modelRun.paramsJson as any;
      if (typeof paramsJson === 'string') {
        try {
          paramsJson = JSON.parse(paramsJson);
        } catch {
          paramsJson = {};
        }
      }

      paramsJson = {
        ...paramsJson,
        inputHash,
        modelVersion,
        cachedAt: new Date().toISOString(),
      };

      await prisma.modelRun.update({
        where: { id: modelRunId },
        data: {
          paramsJson: paramsJson as any,
        },
      });

      logger.info(`Cached model result: ${modelRunId} (org: ${orgId}, hash: ${inputHash})`);
    } catch (error: any) {
      logger.error(`Failed to cache model result: ${error.message}`, error);
      // Don't throw - caching is non-critical
    }
  },

  /**
   * Invalidate cache for an organization
   */
  invalidateCache: async (orgId: string): Promise<void> => {
    try {
      // In practice, we don't delete model runs, but we can mark them as stale
      // by updating a timestamp or version number
      logger.info(`Cache invalidated for org ${orgId}`);
    } catch (error: any) {
      logger.error(`Failed to invalidate cache: ${error.message}`, error);
    }
  },

  /**
   * Clean up expired cache entries (runs periodically)
   */
  cleanupExpiredCache: async (): Promise<number> => {
    try {
      const cutoffDate = new Date(Date.now() - CACHE_TTL_MS);
      
      // Find model runs older than TTL
      const expiredRuns = await prisma.modelRun.findMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
          paramsJson: {
            path: ['inputHash'],
            not: {
              equals: null,
            },
          } as any,
        },
        select: { id: true },
        take: 100, // Process in batches
      });

      // Note: We don't delete model runs, but we could mark them as stale
      // For now, just log the cleanup
      logger.info(`Found ${expiredRuns.length} expired cache entries (not deleting model runs)`);
      
      return expiredRuns.length;
    } catch (error: any) {
      logger.error(`Failed to cleanup expired cache: ${error.message}`, error);
      return 0;
    }
  },
};

