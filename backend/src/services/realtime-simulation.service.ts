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
    // Log initial values for debugging
    console.log(`[RealtimeSim] Generating simulation with initial values:`, {
      customers: initialCustomers,
      revenue: initialRevenue,
      expenses: initialExpenses,
      cashBalance: cashBalance,
    });
    
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
      // Calculate runway: Cash Balance / Monthly Burn Rate
      // Only set to 999 if burn rate is 0 or negative (infinite runway - company is profitable)
      // If burn rate > 0, calculate actual runway
      let runway: number;
      if (burnRate <= 0) {
        // Company is profitable (no burn) or break-even - infinite runway
        runway = 999;
      } else if (cashBalance > 0) {
        // Calculate actual runway
        runway = Math.max(0, cashBalance / burnRate);
      } else {
        // No cash balance - runway is 0
        runway = 0;
      }

      data.push({
        month: `Month ${month + 1}`,
        customers,
        revenue: Math.round(revenue),
        expenses: Math.round(expenses),
        netIncome: Math.round(netIncome),
        burnRate: Math.max(0, Math.round(burnRate)),
        // Only cap runway at 999 if burn rate is 0 (infinite runway)
        // Otherwise, use calculated runway (which can be any positive number)
        runway: burnRate === 0 ? 999 : Math.max(0, Math.round(runway * 10) / 10),
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

    // Get initial values from actual user data (model run or transactions)
    const initialValues = await realtimeSimulationService.getInitialValuesFromModel(orgId);
    
    // Generate simulation using actual user data as starting point
    const results = realtimeSimulationService.generateSimulation(
      defaultParams,
      initialValues.customers,
      initialValues.revenue,
      initialValues.expenses,
      initialValues.cashBalance
    );

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

    let customers = 0;
    let revenue = 0;
    let expenses = 0;
    let cashBalance = 0;

    // Try to get from model run first
    if (latestRun && latestRun.summaryJson) {
      const summary = latestRun.summaryJson as any;
      customers = Number(summary.activeCustomers || summary.customerCount || summary.customers || 0);
      revenue = Number(summary.revenue || summary.mrr || 0);
      expenses = Number(summary.expenses || summary.burnRate || 0);
      cashBalance = Number(summary.cashBalance || 0);
    }

    // If no model data or missing values, calculate from actual transactions
    if (revenue === 0 || expenses === 0) {
      console.log(`[RealtimeSim] No model data, calculating from transactions`);
      
      // Get all transactions
      const transactions = await prisma.rawTransaction.findMany({
        where: {
          orgId,
          isDuplicate: false,
        },
        orderBy: {
          date: 'desc',
        },
        take: 1000,
      });

      if (transactions.length > 0) {
        // Calculate average monthly revenue and expenses from last 6 months
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        
        const recentTransactions = transactions.filter(tx => tx.date >= sixMonthsAgo);
        
        if (recentTransactions.length > 0) {
          let totalRevenue = 0;
          let totalExpenses = 0;
          
          for (const tx of recentTransactions) {
            const amount = Number(tx.amount) || 0;
            if (amount > 0) {
              totalRevenue += amount;
            } else {
              totalExpenses += Math.abs(amount);
            }
          }
          
          // Average per month (assuming 6 months of data)
          const months = Math.max(1, Math.ceil((now.getTime() - sixMonthsAgo.getTime()) / (1000 * 60 * 60 * 24 * 30)));
          revenue = revenue || Math.round(totalRevenue / months);
          expenses = expenses || Math.round(totalExpenses / months);
        } else {
          // Use all transactions if no recent data
          let totalRevenue = 0;
          let totalExpenses = 0;
          
          for (const tx of transactions) {
            const amount = Number(tx.amount) || 0;
            if (amount > 0) {
              totalRevenue += amount;
            } else {
              totalExpenses += Math.abs(amount);
            }
          }
          
          // Estimate monthly (divide by number of months in data range)
          if (transactions.length > 0) {
            const firstDate = transactions[transactions.length - 1].date;
            const lastDate = transactions[0].date;
            const months = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
            revenue = revenue || Math.round(totalRevenue / months);
            expenses = expenses || Math.round(totalExpenses / months);
          }
        }
      }
    }

    // If still no customers, check CSV import jobs for startingCustomers
    if (customers === 0) {
      const csvJob = await prisma.job.findFirst({
        where: {
          orgId,
          jobType: 'csv_import',
          status: { in: ['done', 'completed'] },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (csvJob && csvJob.logs) {
        const logs = typeof csvJob.logs === 'string' ? JSON.parse(csvJob.logs) : csvJob.logs;
        if (Array.isArray(logs)) {
          for (const entry of logs) {
            if (entry.meta?.params?.initialCustomers) {
              customers = Number(entry.meta.params.initialCustomers);
              console.log(`[RealtimeSim] Using initialCustomers from CSV import: ${customers}`);
              break;
            }
          }
        }
      }
    }

    // Use defaults only if absolutely no data available
    return {
      customers: customers || 248,
      revenue: revenue || 67000,
      expenses: expenses || 49000,
      cashBalance: cashBalance || 570000,
    };
  },

  /**
   * Sensitivity Analysis: Calculate how changes in key drivers impact runway.
   * Addresses Pain Point 6 (Probabilistic simulations without spreadsheets).
   */
  calculateSensitivity: async (orgId: string, params: SimulationParams): Promise<any> => {
    const initialValues = await realtimeSimulationService.getInitialValuesFromModel(orgId);
    
    const drivers = [
      { name: 'Growth Rate', key: 'monthlyGrowthRate' as keyof SimulationParams, variations: [-2, -1, 1, 2] },
      { name: 'Churn Rate', key: 'churnRate' as keyof SimulationParams, variations: [-1, -0.5, 0.5, 1] },
      { name: 'CAC', key: 'customerAcquisitionCost' as keyof SimulationParams, variations: [-20, -10, 10, 20] },
    ];

    const sensitivityResults: any = {};

    for (const driver of drivers) {
      const impacts = driver.variations.map(v => {
        const modifiedParams = { ...params, [driver.key]: (params as any)[driver.key] + v };
        const results = realtimeSimulationService.generateSimulation(
          modifiedParams,
          initialValues.customers,
          initialValues.revenue,
          initialValues.expenses,
          initialValues.cashBalance
        );
        
        // Final runway in 12 months
        const finalRunway = results[results.length - 1].runway;
        return {
          variation: v,
          runway: finalRunway,
          delta: finalRunway - (results[0].runway || 0)
        };
      });
      
      sensitivityResults[driver.name] = impacts;
    }

    return sensitivityResults;
  },
};


