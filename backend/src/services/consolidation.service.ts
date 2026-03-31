/**
 * FINANCIAL CONSOLIDATION SERVICE
 * Enterprise-grade multi-entity consolidation with:
 * - Entity CRUD management
 * - Consolidation triggering via Python worker
 * - Intercompany transaction management
 * - FX translation support
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import { workerClient } from '../utils/worker-client';

// ============================================
// ENTITY MANAGEMENT
// ============================================

export const consolidationService = {
  /**
   * Create a consolidation entity (subsidiary, JV, etc.)
   */
  createEntity: async (
    orgId: string,
    userId: string,
    data: {
      name: string;
      code?: string;
      entityType?: string;
      currency?: string;
      ownershipPct?: number;
      country?: string;
      taxRate?: number;
    }
  ) => {
    // Validate org access
    const userRole = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!userRole || !['admin', 'finance'].includes(userRole.role)) {
      throw new ForbiddenError('Only admins and finance users can manage entities');
    }

    // Validate ownership
    const ownershipPct = data.ownershipPct ?? 100;
    if (ownershipPct < 0 || ownershipPct > 100) {
      throw new ValidationError('Ownership percentage must be between 0 and 100');
    }

    const entity = await prisma.consolidationEntity.create({
      data: {
        orgId,
        name: data.name,
        code: data.code || data.name.substring(0, 8).toUpperCase().replace(/\s/g, '-'),
        entityType: data.entityType || 'subsidiary',
        currency: data.currency || 'USD',
        ownershipPct,
        country: data.country,
        taxRate: data.taxRate,
      },
    });

    logger.info(`Consolidation entity created: ${entity.name}`, { orgId, entityId: entity.id });
    return entity;
  },

  /**
   * List all consolidation entities for an org
   */
  listEntities: async (orgId: string, userId: string) => {
    const userRole = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!userRole) {
      throw new ForbiddenError('No access to this organization');
    }

    return prisma.consolidationEntity.findMany({
      where: { orgId, isActive: true },
      orderBy: [{ entityType: 'asc' }, { name: 'asc' }],
    });
  },

  /**
   * Update an entity
   */
  updateEntity: async (
    orgId: string,
    entityId: string,
    userId: string,
    data: Partial<{
      name: string;
      code: string;
      entityType: string;
      currency: string;
      ownershipPct: number;
      country: string;
      taxRate: number;
      isActive: boolean;
      intercompanyMap: any;
      financialData: any;
    }>
  ) => {
    const userRole = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!userRole || !['admin', 'finance'].includes(userRole.role)) {
      throw new ForbiddenError('Only admins and finance users can manage entities');
    }

    const entity = await prisma.consolidationEntity.findFirst({
      where: { id: entityId, orgId },
    });
    if (!entity) throw new NotFoundError('Entity not found');

    return prisma.consolidationEntity.update({
      where: { id: entityId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.entityType !== undefined && { entityType: data.entityType }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.ownershipPct !== undefined && { ownershipPct: data.ownershipPct }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.intercompanyMap !== undefined && { intercompanyMap: data.intercompanyMap }),
        ...(data.financialData !== undefined && { financialData: data.financialData }),
      },
    });
  },

  /**
   * Delete an entity (soft delete)
   */
  deleteEntity: async (orgId: string, entityId: string, userId: string) => {
    const userRole = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!userRole || !['admin', 'finance'].includes(userRole.role)) {
      throw new ForbiddenError('Only admins and finance users can manage entities');
    }

    return prisma.consolidationEntity.update({
      where: { id: entityId },
      data: { isActive: false },
    });
  },

  // ============================================
  // CONSOLIDATION EXECUTION
  // ============================================

  /**
   * Run consolidation across all active entities
   */
  runConsolidation: async (
    orgId: string,
    userId: string,
    params: {
      startMonth?: string;
      horizonMonths?: number;
      accountingStandard?: 'IFRS' | 'GAAP';
    } = {}
  ) => {
    const userRole = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!userRole || !['admin', 'finance'].includes(userRole.role)) {
      throw new ForbiddenError('Only admins and finance users can run consolidations');
    }

    // Get all active entities
    const entities = await prisma.consolidationEntity.findMany({
      where: { orgId, isActive: true },
    });

    if (entities.length === 0) {
      throw new ValidationError('No entities found for consolidation. Create at least one entity first.');
    }

    // Get FX rates
    let fxRates: Record<string, number> = {};
    try {
      const localization = await prisma.localizationSettings.findUnique({
        where: { orgId },
      });
      if (localization?.fxRatesJson) {
        fxRates = localization.fxRatesJson as Record<string, number>;
      }
    } catch (e) {
      logger.warn('Could not fetch FX rates, using defaults');
    }

    const startMonth = params.startMonth || new Date().toISOString().slice(0, 7);
    const horizonMonths = params.horizonMonths || 12;

    // Build entity data for the worker
    const entityConfigs = entities.map((entity) => ({
      entityId: entity.code || entity.id,
      name: entity.name,
      currency: entity.currency,
      ownershipPct: Number(entity.ownershipPct),
      taxRate: entity.taxRate ? Number(entity.taxRate) : undefined,
      financialData: entity.financialData || {},
      intercompanyMap: entity.intercompanyMap || {},
    }));

    // Build FX rate maps
    const closingRates: Record<string, number> = {};
    const avgRates: Record<string, number> = {};
    entities.forEach((e) => {
      if (e.currency !== 'USD') {
        closingRates[e.currency] = fxRates[e.currency] ? 1 / fxRates[e.currency] : 1;
        avgRates[e.currency] = closingRates[e.currency]; // Simplified; use historical average in production
      }
    });

    // Build minority interests map and regional tax rates
    const minorityInterests: Record<string, number> = {};
    const regionalTaxRates: Record<string, number> = {};
    entities.forEach((e) => {
      const entityCode = e.code || e.id;
      const ownershipPct = Number(e.ownershipPct);
      if (ownershipPct < 100) {
        minorityInterests[entityCode] = (100 - ownershipPct) / 100;
      }
      if (e.taxRate) {
        regionalTaxRates[entityCode] = Number(e.taxRate);
      }
    });

    // Try to call Python worker for consolidation
    try {
      const workerResponse = await workerClient.post('/compute/consolidation', {
        entities: entityConfigs,
        fxRates: closingRates,
        avgFxRates: avgRates,
        regionalTaxRates,
        minorityInterests,
        startMonth,
        horizonMonths,
        accountingStandard: params.accountingStandard || 'IFRS',
      });

      logger.info(`Consolidation completed for org ${orgId}`, {
        entityCount: entities.length,
      });

      return {
        consolidated: workerResponse.data.result,
        entities: entityConfigs,
        metadata: {
          entitiesConsolidated: entities.length,
          startMonth,
          horizonMonths,
          accountingStandard: params.accountingStandard || 'IFRS',
          fxRates: closingRates,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (workerError: any) {
      // Fallback: Run consolidation logic inline (basic version)
      logger.warn('Worker consolidation failed, running inline fallback', {
        error: workerError.message,
      });

      // Return entity data with a note about manual consolidation
      return {
        consolidated: null,
        entities: entityConfigs,
        metadata: {
          entitiesConsolidated: entities.length,
          startMonth,
          horizonMonths,
          accountingStandard: params.accountingStandard || 'IFRS',
          fxRates: closingRates,
          generatedAt: new Date().toISOString(),
          note: 'Worker unavailable — entity data returned for manual review',
        },
      };
    }
  },

  /**
   * Get consolidation summary (latest cached or quick compute)
   */
  getSummary: async (orgId: string, userId: string) => {
    const userRole = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (!userRole) {
      throw new ForbiddenError('No access to this organization');
    }

    const entities = await prisma.consolidationEntity.findMany({
      where: { orgId, isActive: true },
    });

    // Calculate summary metrics
    const totalEntities = entities.length;
    const parentEntity = entities.find((e) => e.entityType === 'parent');
    const subsidiaries = entities.filter((e) => e.entityType === 'subsidiary');
    const jointVentures = entities.filter((e) => e.entityType === 'joint_venture');
    const currencies = [...new Set(entities.map((e) => e.currency))];

    return {
      totalEntities,
      parentEntity: parentEntity ? { name: parentEntity.name, code: parentEntity.code } : null,
      subsidiaryCount: subsidiaries.length,
      jointVentureCount: jointVentures.length,
      currencies,
      entities: entities.map((e) => ({
        id: e.id,
        name: e.name,
        code: e.code,
        entityType: e.entityType,
        currency: e.currency,
        ownershipPct: Number(e.ownershipPct),
        country: e.country,
        taxRate: e.taxRate ? Number(e.taxRate) : null,
        hasFinancialData: !!e.financialData,
      })),
    };
  },
};
