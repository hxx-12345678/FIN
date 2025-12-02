/**
 * Real-time Simulation Service
 * Handles saving, loading, and running financial simulations
 */

import prisma from '../config/database';
import { ValidationError, NotFoundError } from '../utils/errors';
import { randomUUID } from 'crypto';

export interface SimulationParams {
  monthlyGrowthRate: number;
  customerAcquisitionCost: number;
  customerLifetimeValue: number;
  churnRate: number;
  pricingTier: number;
  teamSize: number;
  marketingSpend: number;
}

export interface SimulationResult {
  month: string;
  customers: number;
  revenue: number;
  expenses: number;
  netIncome: number;
  burnRate: number;
  runway: number;
  newCustomers: number;
  churnedCustomers: number;
  ltv: number;
  cac: number;
}

export interface SimulationData {
  id: string;
  orgId: string;
  userId: string;
  name?: string;
  params: SimulationParams;
  results: SimulationResult[];
  currentMonth: number;
  isRunning: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const realtimeSimulationService = {
  /**
   * Generate simulation results based on parameters
   */
  generateSimulation: (params: SimulationParams, initialCustomers: number = 248, initialRevenue: number = 67000, initialExpenses: number = 49000, cashBalance: number = 570000): SimulationResult[] => {
    const data: SimulationResult[] = [];
    let customers = initialCustomers;
    let revenue = initialRevenue;
    let expenses = initialExpenses;

    for (let month = 0; month < 12; month++) {
      // Calculate growth
      const newCustomers = Math.floor(
        (params.marketingSpend / params.customerAcquisitionCost) * (1 + params.monthlyGrowthRate / 100),
      );
      const churnedCustomers = Math.floor(customers * (params.churnRate / 100));
      customers = customers + newCustomers - churnedCustomers;

      // Calculate revenue
      revenue = customers * params.pricingTier;

      // Calculate expenses (team cost + marketing + operations)
      const teamCost = params.teamSize * 7000; // Average $7k per employee
      const operationalCost = revenue * 0.15; // 15% of revenue
      expenses = teamCost + params.marketingSpend + operationalCost;

      const netIncome = revenue - expenses;
      const burnRate = expenses - revenue;
      const runway = burnRate > 0 ? Math.max(0, cashBalance / burnRate) : 999;

      data.push({
        month: `Month ${month + 1}`,
        customers,
        revenue: Math.round(revenue),
        expenses: Math.round(expenses),
        netIncome: Math.round(netIncome),
        burnRate: Math.max(0, Math.round(burnRate)),
        runway: Math.min(999, Math.round(runway * 10) / 10),
        newCustomers,
        churnedCustomers,
        ltv: params.customerLifetimeValue,
        cac: params.customerAcquisitionCost,
      });
    }

    return data;
  },

  /**
   * Get or create simulation for an organization
   */
  getOrCreateSimulation: async (userId: string, orgId: string, name?: string): Promise<SimulationData> => {
    // Verify user has access to org
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!role) {
      throw new ValidationError('No access to this organization');
    }

    // Try to get latest simulation for this org using Prisma
    const existing = await prisma.realtimeSimulation.findFirst({
      where: {
        orgId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    }).catch(() => null);

    if (existing) {
      return {
        id: existing.id,
        orgId: existing.orgId,
        userId: existing.userId,
        name: existing.name || undefined,
        params: existing.paramsJson as unknown as SimulationParams,
        results: existing.resultsJson as unknown as SimulationResult[],
        currentMonth: existing.currentMonth,
        isRunning: existing.isRunning,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      };
    }

    // Create new simulation with default params
    const defaultParams: SimulationParams = {
      monthlyGrowthRate: 8,
      customerAcquisitionCost: 125,
      customerLifetimeValue: 2400,
      churnRate: 2.5,
      pricingTier: 99,
      teamSize: 12,
      marketingSpend: 8000,
    };

    const results = realtimeSimulationService.generateSimulation(defaultParams);

    // Generate a proper UUID for new simulations
    const newId = randomUUID();
    
    return {
      id: newId,
      orgId,
      userId,
      name,
      params: defaultParams,
      results,
      currentMonth: 0,
      isRunning: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  /**
   * Update simulation parameters and regenerate results
   */
  updateSimulation: async (
    userId: string,
    orgId: string,
    simulationId: string,
    params: Partial<SimulationParams> | SimulationParams,
    name?: string,
    currentMonth?: number,
    isRunning?: boolean
  ): Promise<SimulationData> => {
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
      throw new ValidationError('No access to this organization');
    }

    // Get current simulation or create new
    const current = await realtimeSimulationService.getOrCreateSimulation(userId, orgId, name);
    
    // Merge params - handle both Partial and full SimulationParams
    const updatedParams: SimulationParams = {
      ...current.params,
      ...(params as Partial<SimulationParams>),
    };

    // Get initial values from model run for more accurate simulation
    const initialValues = await realtimeSimulationService.getInitialValuesFromModel(orgId);

    // Regenerate results with initial values from model
    const results = realtimeSimulationService.generateSimulation(
      updatedParams,
      initialValues.customers,
      initialValues.revenue,
      initialValues.expenses,
      initialValues.cashBalance
    );

    // Save to database using Prisma
    // Generate a proper UUID if simulationId is a temp ID or invalid
    let finalId = simulationId && simulationId !== 'new' && !simulationId.startsWith('temp-') ? simulationId : current.id;
    
    // If current.id is also a temp ID, generate a new UUID
    if (finalId && finalId.startsWith('temp-')) {
      finalId = randomUUID();
    }
    
    try {
      // Upsert simulation using Prisma
      await prisma.realtimeSimulation.upsert({
        where: {
          id: finalId,
        },
        create: {
          id: finalId,
          orgId,
          userId,
          name: name || null,
          paramsJson: updatedParams as any,
          resultsJson: results as any,
          currentMonth: currentMonth !== undefined ? currentMonth : current.currentMonth,
          isRunning: isRunning !== undefined ? isRunning : current.isRunning,
        },
        update: {
          paramsJson: updatedParams as any,
          resultsJson: results as any,
          currentMonth: currentMonth !== undefined ? currentMonth : current.currentMonth,
          isRunning: isRunning !== undefined ? isRunning : current.isRunning,
          name: name || undefined,
        },
      });
    } catch (error: any) {
      console.error('Failed to save simulation to database:', error.message);
      // Don't throw - allow simulation to continue even if save fails
    }

    return {
      ...current,
      id: finalId,
      params: updatedParams,
      results,
      name: name || current.name,
      currentMonth: currentMonth !== undefined ? currentMonth : current.currentMonth,
      isRunning: isRunning !== undefined ? isRunning : current.isRunning,
      updatedAt: new Date(),
    };
  },

  /**
   * Get simulation by ID
   */
  getSimulation: async (userId: string, orgId: string, simulationId: string): Promise<SimulationData> => {
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
      throw new ValidationError('No access to this organization');
    }

    // Fetch from database using Prisma
    const simulation = await prisma.realtimeSimulation.findUnique({
      where: {
        id: simulationId,
      },
    });

    if (!simulation || simulation.orgId !== orgId) {
      throw new NotFoundError('Simulation not found');
    }

    return {
      id: simulation.id,
      orgId: simulation.orgId,
      userId: simulation.userId,
      name: simulation.name || undefined,
      params: simulation.paramsJson as unknown as SimulationParams,
      results: simulation.resultsJson as unknown as SimulationResult[],
      currentMonth: simulation.currentMonth,
      isRunning: simulation.isRunning,
      createdAt: simulation.createdAt,
      updatedAt: simulation.updatedAt,
    };
  },

  /**
   * Get initial values from latest model run (if available)
   */
  getInitialValuesFromModel: async (orgId: string): Promise<{
    customers: number;
    revenue: number;
    expenses: number;
    cashBalance: number;
  }> => {
    // Get latest model run
    const latestRun = await prisma.modelRun.findFirst({
      where: {
        orgId,
        status: 'done',
        runType: 'baseline',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!latestRun || !latestRun.summaryJson) {
      return {
        customers: 248,
        revenue: 67000,
        expenses: 49000,
        cashBalance: 570000,
      };
    }

    const summary = latestRun.summaryJson as any;

    return {
      customers: Number(summary.activeCustomers || summary.customers || 248),
      revenue: Number(summary.revenue || summary.mrr || 67000),
      expenses: Number(summary.expenses || summary.burnRate || 49000),
      cashBalance: Number(summary.cashBalance || 570000),
    };
  },
};


