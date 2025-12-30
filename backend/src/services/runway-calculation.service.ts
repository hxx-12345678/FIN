/**
 * Standardized Runway Calculation Service
 * Ensures all components use the same formula: Runway = Cash Balance / Monthly Burn Rate
 */
import prisma from '../config/database';
import { logger } from '../utils/logger';

export interface RunwayCalculationResult {
  runwayMonths: number;
  cashBalance: number;
  monthlyBurnRate: number;
  source: 'model_run' | 'transactions' | 'calculated';
  confidence: 'high' | 'medium' | 'low';
}

export const runwayCalculationService = {
  /**
   * Calculate runway using standard formula: Runway = Cash Balance / Monthly Burn Rate
   * This is the industry-standard formula used by all financial teams
   * 
   * Priority:
   * 1. Use model run summary (most accurate)
   * 2. Calculate from transactions (fallback)
   * 3. Return 0 if no data
   */
  calculateRunway: async (orgId: string): Promise<RunwayCalculationResult> => {
    // Priority 1: Get from latest model run (most accurate)
    const latestRun = await prisma.modelRun.findFirst({
      where: {
        orgId,
        status: 'done',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (latestRun?.summaryJson) {
      const summary = typeof latestRun.summaryJson === 'string' 
        ? JSON.parse(latestRun.summaryJson) 
        : latestRun.summaryJson;
      
      const cashBalance = Number(summary.cashBalance || 0);
      // Try multiple field names for monthly burn rate
      const monthlyBurnRate = Number(
        summary.monthlyBurn || 
        summary.monthlyBurnRate || 
        summary.burnRate || 
        (summary.expenses && summary.revenue ? summary.expenses - summary.revenue : 0) ||
        0
      );
      
      const modelRunway = Number(summary.runwayMonths || summary.runway || 0);
      
      // If we have cash balance and burn rate, calculate runway
      if (cashBalance > 0 && monthlyBurnRate > 0) {
        const calculatedRunway = cashBalance / monthlyBurnRate;
        
        // If model runway is 999 but we have burn rate, it's wrong - use calculated
        if (modelRunway >= 999 && monthlyBurnRate > 0) {
          logger.warn(`[Runway] Model runway is 999 but burn rate exists (${monthlyBurnRate}), using calculated: ${calculatedRunway.toFixed(2)}`);
          return {
            runwayMonths: calculatedRunway,
            cashBalance,
            monthlyBurnRate,
            source: 'calculated',
            confidence: 'high',
          };
        }
        
        // If model runway is close to calculated (within 5%), use model
        if (modelRunway > 0) {
          const diff = Math.abs(modelRunway - calculatedRunway);
          const percentDiff = (diff / calculatedRunway) * 100;
          
          if (percentDiff < 5) {
            return {
              runwayMonths: modelRunway,
              cashBalance,
              monthlyBurnRate,
              source: 'model_run',
              confidence: 'high',
            };
          } else {
            // Model runway is off, use calculated
            logger.warn(`[Runway] Model runway (${modelRunway}) differs from calculated (${calculatedRunway.toFixed(2)}), using calculated`);
            return {
              runwayMonths: calculatedRunway,
              cashBalance,
              monthlyBurnRate,
              source: 'calculated',
              confidence: 'high',
            };
          }
        }
        
        // Use calculated if model runway not available
        return {
          runwayMonths: calculatedRunway,
          cashBalance,
          monthlyBurnRate,
          source: 'calculated',
          confidence: 'high',
        };
      }
      
      // If no burn rate but we have cash, runway is infinite (999)
      if (cashBalance > 0 && monthlyBurnRate === 0) {
        return {
          runwayMonths: 999,
          cashBalance,
          monthlyBurnRate: 0,
          source: 'model_run',
          confidence: 'medium',
        };
      }
    }
    
    // Priority 2: Check Financial Ledger for cash balance (most accurate for promoted data)
    // Look for cash-related account codes (case-insensitive approach)
    const allLedgerEntries = await prisma.financialLedger.findMany({
      where: {
        orgId,
      },
      orderBy: { transactionDate: 'desc' },
      take: 1000
    });

    let cashBalance = 0;
    // Filter for cash-related entries (case-insensitive)
    const cashEntries = allLedgerEntries.filter(entry => {
      const code = (entry.accountCode || '').toUpperCase();
      return code === 'CASH' || code === 'BANK' || code.startsWith('CASH') || code.startsWith('BANK');
    });
    
    if (cashEntries.length > 0) {
      // Sum all cash entries
      cashBalance = cashEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
    }

    // Priority 3: Calculate from transactions if no ledger cash balance
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
      // Calculate average monthly burn rate from last 6 months
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      const recentTransactions = transactions.filter(tx => tx.date >= sixMonthsAgo);
      
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
      
      const months = Math.max(1, Math.ceil((now.getTime() - sixMonthsAgo.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const monthlyRevenue = totalRevenue / months;
      const monthlyExpenses = totalExpenses / months;
      const monthlyBurnRate = monthlyExpenses - monthlyRevenue;
      
      // If no cash balance from ledger, estimate from transactions
      if (cashBalance === 0) {
        cashBalance = transactions
          .filter(t => Number(t.amount) > 0)
          .reduce((sum, t) => sum + Number(t.amount), 0);
      }
      
      if (monthlyBurnRate > 0 && cashBalance > 0) {
        const calculatedRunway = cashBalance / monthlyBurnRate;
        return {
          runwayMonths: calculatedRunway,
          cashBalance,
          monthlyBurnRate,
          source: cashBalance > 0 ? 'transactions' : 'calculated',
          confidence: 'medium',
        };
      }
    }
    
    // Fallback: 0 if no data
    return {
      runwayMonths: 0,
      cashBalance: 0,
      monthlyBurnRate: 0,
      source: 'calculated',
      confidence: 'low',
    };
  },
};

