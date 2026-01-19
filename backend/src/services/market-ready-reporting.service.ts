import prisma from '../config/database';
import { semanticLayerService } from './semantic-layer.service';

export interface BoardInsight {
  metric: string;
  value: string | number;
  delta: number;
  status: 'good' | 'warning' | 'critical';
  narrative: string;
}

export const marketReadyReportingService = {
  /**
   * Generate a Board-Ready summary from the Semantic Ledger.
   * Addresses Pain Point 7 (Board-quality insights without BI tools).
   */
  getBoardSummary: async (orgId: string) => {
    const ledger = await semanticLayerService.getLedgerData(orgId);
    
    // In a real app, we'd aggregate by month and category
    // Here we'll do a simple aggregation for demonstration
    const totalRevenue = ledger
      .filter(e => e.amount.toNumber() > 0)
      .reduce((sum, e) => sum + e.amount.toNumber(), 0);
      
    const totalExpenses = ledger
      .filter(e => e.amount.toNumber() < 0)
      .reduce((sum, e) => sum + Math.abs(e.amount.toNumber()), 0);

    const netBurn = totalExpenses - totalRevenue;
    
    // Fetch latest runway from calculation service
    const { runwayMonths } = await prisma.realtimeSimulation.findFirst({
        where: { orgId, isSnapshot: false } as any,
        orderBy: { updatedAt: 'desc' },
        select: { resultsJson: true }
    }).then(res => {
        const results = res?.resultsJson as any[];
        return { runwayMonths: results?.[0]?.runway || 0 };
    }).catch(() => ({ runwayMonths: 0 }));

    const insights: BoardInsight[] = [
      {
        metric: 'Cash Runway',
        value: `${runwayMonths} months`,
        delta: 0.5,
        status: runwayMonths > 12 ? 'good' : (runwayMonths > 6 ? 'warning' : 'critical'),
        narrative: runwayMonths > 12 
          ? "Strong cash position. You have room for strategic investments." 
          : "Runway is tightening. Focus on extending survival to 18 months."
      },
      {
        metric: 'Net Monthly Burn',
        value: `$${Math.round(netBurn).toLocaleString()}`,
        delta: -5,
        status: netBurn > 50000 ? 'warning' : 'good',
        narrative: "Burn rate is stable, but watch marketing efficiency in Q3."
      }
    ];

    return {
      orgId,
      generatedAt: new Date(),
      insights,
      ledgerSummary: {
        totalRevenue,
        totalExpenses,
        netBurn
      }
    };
  }
};


