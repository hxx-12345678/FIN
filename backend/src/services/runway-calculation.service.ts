/**
 * Standardized Runway Calculation Service
 * Ensures all components use the same formula: Runway = Cash Balance / Monthly Burn Rate
 */
import prisma from '../config/database';
import { logger } from '../utils/logger';

// Type assertion for Prisma models that may not be in generated types yet
const prismaClient = prisma as any;

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
      
      // Handle profitable scenarios (negative or zero burn rate) - infinite runway
      if (monthlyBurnRate <= 0 && cashBalance > 0) {
        return {
          runwayMonths: 999, // Infinite runway for profitable companies
          cashBalance,
          monthlyBurnRate: monthlyBurnRate < 0 ? monthlyBurnRate : 0, // Preserve negative if it was negative
          source: 'model_run',
          confidence: 'high',
        };
      }
      
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
    const allLedgerEntries = await prismaClient.financialLedger.findMany({
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
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1); // Last 12 months
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    let transactions = await prisma.rawTransaction.findMany({
      where: {
        orgId,
        isDuplicate: false,
        date: {
          gte: startDate,
          lte: endDate,
        },
      } as any,
      orderBy: {
        date: 'desc',
      },
    });
    
    // If no recent transactions, get all transactions
    if (transactions.length === 0) {
      transactions = await prisma.rawTransaction.findMany({
        where: {
          orgId,
          isDuplicate: false,
        } as any,
        orderBy: {
          date: 'desc',
        },
        take: 1000,
      });
    }
    
    if (transactions.length > 0) {
      // Calculate monthly revenue and expenses from all transactions
      const monthlyRevenueMap = new Map<string, number>();
      const monthlyExpenseMap = new Map<string, number>();
      
      for (const tx of transactions) {
        const month = String(tx.date.getMonth() + 1).padStart(2, '0');
        const period = `${tx.date.getFullYear()}-${month}`;
        const amount = Number(tx.amount) || 0;
        
        if (amount > 0) {
          monthlyRevenueMap.set(period, (monthlyRevenueMap.get(period) || 0) + amount);
        } else {
          monthlyExpenseMap.set(period, (monthlyExpenseMap.get(period) || 0) + Math.abs(amount));
        }
      }
      
      // Get all periods and calculate averages
      const allPeriods = Array.from(new Set([
        ...monthlyRevenueMap.keys(),
        ...monthlyExpenseMap.keys()
      ])).sort();
      
      if (allPeriods.length > 0) {
        // Use last 3 months for average (or all if less than 3)
        const periodsForAvg = allPeriods.slice(-3);
        let totalRevenue = 0;
        let totalExpenses = 0;
        
        for (const period of periodsForAvg) {
          totalRevenue += monthlyRevenueMap.get(period) || 0;
          totalExpenses += monthlyExpenseMap.get(period) || 0;
        }
        
        const monthlyRevenue = totalRevenue / periodsForAvg.length;
        const monthlyExpenses = totalExpenses / periodsForAvg.length;
        // Burn rate is monthly expenses (cash going out)
        const monthlyBurnRate = monthlyExpenses;
        
        // If no cash balance from ledger, estimate from transactions (net: revenue - expenses)
        if (cashBalance === 0) {
          const netCash = transactions.reduce((sum, t) => {
            return sum + Number(t.amount) || 0;
          }, 0);
          // Use net cash as estimate (assumes starting cash was 0, or this is cumulative)
          cashBalance = Math.max(0, netCash);
        }
        
        // Calculate runway: cash balance / monthly burn rate
        // If burn rate is 0 or negative (profitable), runway is infinite (999)
        if (monthlyBurnRate <= 0) {
          return {
            runwayMonths: cashBalance > 0 ? 999 : 0,
            cashBalance,
            monthlyBurnRate: 0,
            source: 'transactions',
            confidence: 'medium',
          };
        }
        
        if (cashBalance > 0) {
          const calculatedRunway = cashBalance / monthlyBurnRate;
          return {
            runwayMonths: calculatedRunway,
            cashBalance,
            monthlyBurnRate,
            source: 'transactions',
            confidence: 'medium',
          };
        }
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

