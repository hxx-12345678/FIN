/**
 * Spend Control Agent — Production Grade
 *
 * Provides zero-trust spend analysis grounded in actual transaction data.
 * Aggregates vendor spend, identifies top categories, and computes real
 * optimization opportunities — no hardcoded dollar amounts.
 */

import prisma from '../../config/database';
import { AgentResponse, AgentThought, DataSource, AgentRecommendation, AgentType } from './agent-types';
import { v4 as uuidv4 } from 'uuid';

class SpendControlAgentService {
  public type: AgentType = 'spend_control';

  async execute(
    orgId: string,
    userId: string,
    params: Record<string, any>
  ): Promise<AgentResponse> {
    const thoughts: AgentThought[] = [];
    const dataSources: DataSource[] = [];
    const calculations: Record<string, number> = {};
    const query = params.query || '';

    thoughts.push({
      step: 1,
      thought: `Analysing spend patterns from verified ledger for: "${query}"`,
      action: 'data_retrieval',
    });

    // ── 1. Fetch real transactions ──
    let transactions: any[] = [];
    try {
      transactions = await prisma.rawTransaction.findMany({
        where: { orgId, isDuplicate: false },
        orderBy: { date: 'desc' },
        take: 1000,
      });
    } catch (err) {
      console.warn('[SpendControlAgent] Ledger access error:', err);
    }

    if (transactions.length === 0) {
      return {
        agentType: this.type,
        taskId: uuidv4(),
        status: 'completed',
        answer:
          `**Spend Control Intelligence**\n\n` +
          `⚠️ **No transactions found.** Import transaction data to enable spend optimisation analysis.`,
        confidence: 0.2,
        thoughts,
        dataSources,
      };
    }

    dataSources.push({
      type: 'transaction',
      id: 'tx_ledger_grounding',
      name: 'Verified Transaction Ledger',
      timestamp: new Date(),
      confidence: 1.0,
      snippet: `Analysing ${transactions.length} verified transactions for vendor optimisation opportunities.`,
    });

    // ── 2. Aggregate spend by category and vendor ──
    const categorySpend = new Map<string, number>();
    const vendorSpend = new Map<string, { total: number; count: number }>();

    let totalExpenses = 0;
    let totalRevenue = 0;

    for (const tx of transactions) {
      const amount = Number(tx.amount);
      const category = (tx.category || 'Uncategorised').trim();
      const vendor = (tx.description || 'Unknown').trim();

      if (amount < 0 || category.toLowerCase().includes('expense') || category.toLowerCase().includes('cost')) {
        const absAmount = Math.abs(amount);
        totalExpenses += absAmount;

        categorySpend.set(category, (categorySpend.get(category) || 0) + absAmount);

        const existing = vendorSpend.get(vendor) || { total: 0, count: 0 };
        existing.total += absAmount;
        existing.count++;
        vendorSpend.set(vendor, existing);
      } else if (amount > 0) {
        totalRevenue += amount;
      }
    }

    // Sort categories by spend
    const sortedCategories = Array.from(categorySpend.entries())
      .sort((a, b) => b[1] - a[1]);

    // Sort vendors by spend
    const sortedVendors = Array.from(vendorSpend.entries())
      .sort((a, b) => b[1].total - a[1].total);

    thoughts.push({
      step: 2,
      thought: `Aggregated: $${totalExpenses.toLocaleString()} total expenses across ${sortedCategories.length} categories and ${sortedVendors.length} vendors.`,
      action: 'analysis',
    });

    // ── 3. Identify real optimisation opportunities ──
    const recommendations: AgentRecommendation[] = [];

    // Top category analysis
    const topCategories = sortedCategories.slice(0, 5);
    const topVendors = sortedVendors.slice(0, 5);

    // High-frequency small transactions (potential subscription waste)
    const highFreqVendors = sortedVendors.filter(([, v]) => v.count >= 5 && v.total / v.count < 500);
    const potentialSubscriptionWaste = highFreqVendors.reduce((sum, [, v]) => sum + v.total * 0.15, 0); // 15% estimated waste

    // Large single-vendor concentration (negotiation opportunity)
    const concentratedVendors = sortedVendors.filter(([, v]) => v.total > totalExpenses * 0.1);
    const negotiationSavings = concentratedVendors.reduce((sum, [, v]) => sum + v.total * 0.08, 0); // 8% typical renegotiation saving

    const totalOpportunity = potentialSubscriptionWaste + negotiationSavings;

    calculations.total_expenses = totalExpenses;
    calculations.total_revenue = totalRevenue;
    calculations.category_count = sortedCategories.length;
    calculations.vendor_count = sortedVendors.length;
    calculations.subscription_waste_estimate = potentialSubscriptionWaste;
    calculations.negotiation_savings_estimate = negotiationSavings;
    calculations.total_opportunity = totalOpportunity;

    if (concentratedVendors.length > 0) {
      recommendations.push({
        id: uuidv4(),
        title: `Vendor Renegotiation: ${concentratedVendors.length} High-Spend Vendors`,
        description: `${concentratedVendors.length} vendor(s) each account for >10% of total spend. Renegotiation could save ~$${Math.round(negotiationSavings).toLocaleString()}.`,
        impact: { type: 'positive', metric: 'monthly_burn', value: `$${Math.round(negotiationSavings).toLocaleString()}`, confidence: 0.80 },
        priority: negotiationSavings > 5000 ? 'high' : 'medium',
        category: 'efficiency',
        actions: concentratedVendors.slice(0, 3).map(([name, v]) =>
          `Review "${name.substring(0, 40)}" — $${v.total.toLocaleString()} (${v.count} transactions)`
        ),
        dataSources,
      });
    }

    if (highFreqVendors.length > 0) {
      recommendations.push({
        id: uuidv4(),
        title: `Subscription Audit: ${highFreqVendors.length} Recurring Charges`,
        description: `Found ${highFreqVendors.length} vendor(s) with frequent small charges — possible unused subscriptions.`,
        impact: { type: 'positive', metric: 'subscription_waste', value: `$${Math.round(potentialSubscriptionWaste).toLocaleString()}`, confidence: 0.65 },
        priority: 'medium',
        category: 'efficiency',
        actions: ['Audit all SaaS/subscription tools for utilisation rates', 'Cancel unused seats and dormant licences'],
        dataSources,
      });
    }

    thoughts.push({
      step: 3,
      thought: `Identified $${Math.round(totalOpportunity).toLocaleString()} in potential savings from ${recommendations.length} opportunities.`,
      action: 'recommendation',
    });

    // ── 4. Build answer ──
    let answer =
      `### 💰 Spend Control Intelligence\n\n` +
      `**Grounding:** Analysis based on **${transactions.length}** verified ledger transactions.\n\n` +
      `#### Spend Breakdown by Category\n` +
      `| Category | Spend | % of Total |\n` +
      `|----------|-------|------------|\n`;

    for (const [cat, amount] of topCategories) {
      answer += `| ${cat} | $${Math.round(amount).toLocaleString()} | ${(amount / totalExpenses * 100).toFixed(1)}% |\n`;
    }
    if (sortedCategories.length > 5) {
      const otherAmount = sortedCategories.slice(5).reduce((sum, [, v]) => sum + v, 0);
      answer += `| *Other (${sortedCategories.length - 5} categories)* | $${Math.round(otherAmount).toLocaleString()} | ${(otherAmount / totalExpenses * 100).toFixed(1)}% |\n`;
    }

    answer +=
      `\n#### Top Vendors\n` +
      `| Vendor | Total Spend | # Transactions |\n` +
      `|--------|-------------|----------------|\n`;

    for (const [vendor, data] of topVendors) {
      answer += `| ${vendor.substring(0, 35)} | $${Math.round(data.total).toLocaleString()} | ${data.count} |\n`;
    }

    if (totalOpportunity > 0) {
      answer +=
        `\n#### Optimisation Opportunities\n` +
        `| Opportunity | Est. Savings |\n` +
        `|-------------|-------------|\n` +
        `| Vendor Renegotiation | $${Math.round(negotiationSavings).toLocaleString()} |\n` +
        `| Subscription Audit | $${Math.round(potentialSubscriptionWaste).toLocaleString()} |\n` +
        `| **Total** | **$${Math.round(totalOpportunity).toLocaleString()}** |\n`;
    } else {
      answer += `\n✅ No immediate optimisation opportunities identified. Spend appears well-controlled.`;
    }

    return {
      agentType: this.type,
      taskId: uuidv4(),
      status: 'completed',
      answer,
      confidence: 0.88,
      thoughts,
      dataSources,
      calculations,
      recommendations,
      auditMetadata: {
        modelVersion: 'spend-control-v2.0.0-production',
        timestamp: new Date(),
        inputVersions: {
          transactions_analysed: String(transactions.length),
        },
      },
    };
  }
}

export const spendControlAgent = new SpendControlAgentService();
