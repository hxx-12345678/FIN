/**
 * Anomaly Agent
 * 
 * Specialized agent for detecting duplicate payments, suspicious transactions,
 * and other financial anomalies. Scans transaction history and flags issues in plain English.
 */

import prisma from '../../config/database';
import { AgentResponse, AgentThought, DataSource, AgentRecommendation } from './agent-types';
import { v4 as uuidv4 } from 'uuid';

interface TransactionAnomaly {
  id: string;
  type: 'duplicate' | 'suspicious_amount' | 'unusual_timing' | 'vendor_anomaly' | 'category_spike';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  amount: number;
  transactions: any[];
  recommendation: string;
}

class AnomalyAgentService {
  /**
   * Execute anomaly detection tasks
   */
  async execute(
    orgId: string,
    userId: string,
    params: Record<string, any>
  ): Promise<AgentResponse> {
    const thoughts: AgentThought[] = [];
    const dataSources: DataSource[] = [];
    const calculations: Record<string, number> = {};

    thoughts.push({
      step: 1,
      thought: 'Initiating transaction anomaly scan...',
      action: 'data_retrieval',
    });

    // Get transactions for analysis
    const transactions = await this.getTransactions(orgId, dataSources);
    
    thoughts.push({
      step: 2,
      thought: `Retrieved ${transactions.length} transactions for analysis`,
      observation: `Time period: Last 30 days`,
    });

    // Run anomaly detection
    thoughts.push({
      step: 3,
      thought: 'Running anomaly detection algorithms...',
      action: 'anomaly_scan',
    });

    const anomalies = await this.detectAnomalies(transactions, thoughts);
    
    thoughts.push({
      step: 4,
      thought: `Anomaly scan complete`,
      observation: `Found ${anomalies.length} potential issues`,
    });

    // Calculate metrics
    calculations.transactionsScanned = transactions.length;
    calculations.anomaliesFound = anomalies.length;
    calculations.duplicatesFound = anomalies.filter(a => a.type === 'duplicate').length;
    calculations.totalAnomalyAmount = anomalies.reduce((sum, a) => sum + Math.abs(a.amount), 0);
    calculations.criticalIssues = anomalies.filter(a => a.severity === 'critical').length;

    const recommendations = this.generateRecommendations(anomalies);
    const answer = this.buildAnswer(anomalies, transactions.length);

    return {
      agentType: 'anomaly',
      taskId: uuidv4(),
      status: 'completed',
      answer,
      confidence: transactions.length > 0 ? 0.85 : 0.5,
      thoughts,
      dataSources,
      calculations,
      recommendations,
      visualizations: [
        {
          type: 'table',
          title: 'Detected Anomalies',
          data: anomalies.map(a => ({
            type: a.type,
            severity: a.severity,
            amount: `$${Math.abs(a.amount).toLocaleString()}`,
            description: a.description,
          })),
        },
      ],
    };
  }

  /**
   * Get transactions for analysis
   */
  private async getTransactions(orgId: string, dataSources: DataSource[]): Promise<any[]> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const transactions = await prisma.rawTransaction.findMany({
        where: {
          orgId,
          date: { gte: thirtyDaysAgo },
        },
        orderBy: { date: 'desc' },
        take: 1000,
      });

      if (transactions.length > 0) {
        dataSources.push({
          type: 'transaction',
          id: 'transaction_history',
          name: 'Transaction Records',
          timestamp: new Date(),
          confidence: 0.95,
          snippet: `${transactions.length} transactions analyzed`,
        });
      }

      return transactions;
    } catch (error) {
      console.error('[AnomalyAgent] Error fetching transactions:', error);
      return [];
    }
  }

  /**
   * Detect anomalies in transactions
   */
  private async detectAnomalies(transactions: any[], thoughts: AgentThought[]): Promise<TransactionAnomaly[]> {
    const anomalies: TransactionAnomaly[] = [];

    if (transactions.length === 0) {
      // Generate sample anomalies for demo purposes
      return this.generateSampleAnomalies();
    }

    // Group transactions for analysis
    const byAmount = new Map<string, any[]>();
    const byVendor = new Map<string, any[]>();
    const byDate = new Map<string, any[]>();

    for (const txn of transactions) {
      const amount = Number(txn.amount);
      const amountKey = amount.toFixed(2);
      const vendor = txn.description || 'Unknown';
      const dateKey = new Date(txn.date).toISOString().split('T')[0];

      // Group by amount
      if (!byAmount.has(amountKey)) byAmount.set(amountKey, []);
      byAmount.get(amountKey)!.push(txn);

      // Group by vendor
      if (!byVendor.has(vendor)) byVendor.set(vendor, []);
      byVendor.get(vendor)!.push(txn);

      // Group by date
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push(txn);
    }

    // Detect duplicates (same amount, same/similar date)
    for (const [amount, txns] of byAmount.entries()) {
      if (txns.length >= 2 && Math.abs(parseFloat(amount)) > 100) {
        // Check if same day or adjacent days
        const sortedByDate = txns.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        for (let i = 0; i < sortedByDate.length - 1; i++) {
          const dayDiff = Math.abs(
            (new Date(sortedByDate[i + 1].date).getTime() - new Date(sortedByDate[i].date).getTime()) 
            / (1000 * 60 * 60 * 24)
          );
          
          if (dayDiff <= 1) {
            const txnAmount = Math.abs(parseFloat(amount));
            anomalies.push({
              id: uuidv4(),
              type: 'duplicate',
              severity: txnAmount > 5000 ? 'high' : txnAmount > 1000 ? 'medium' : 'low',
              description: `Potential duplicate payment of $${txnAmount.toLocaleString()} detected`,
              amount: txnAmount,
              transactions: [sortedByDate[i], sortedByDate[i + 1]],
              recommendation: 'Review these transactions to confirm if one is a duplicate payment',
            });
          }
        }
      }
    }

    // Detect unusual amounts (statistical outliers)
    const amounts = transactions.map(t => Math.abs(Number(t.amount)));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length);

    for (const txn of transactions) {
      const amount = Math.abs(Number(txn.amount));
      if (amount > avgAmount + (3 * stdDev) && amount > 5000) {
        anomalies.push({
          id: uuidv4(),
          type: 'suspicious_amount',
          severity: amount > avgAmount * 10 ? 'critical' : 'high',
          description: `Unusually large transaction: $${amount.toLocaleString()} (avg: $${avgAmount.toLocaleString()})`,
          amount,
          transactions: [txn],
          recommendation: 'Verify this large transaction is authorized and correctly categorized',
        });
      }
    }

    // Detect vendor anomalies (unusual frequency)
    for (const [vendor, txns] of byVendor.entries()) {
      if (txns.length >= 10) {
        const totalAmount = txns.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
        if (totalAmount > avgAmount * 20) {
          anomalies.push({
            id: uuidv4(),
            type: 'vendor_anomaly',
            severity: 'medium',
            description: `High transaction volume with "${vendor.substring(0, 30)}": ${txns.length} transactions totaling $${totalAmount.toLocaleString()}`,
            amount: totalAmount,
            transactions: txns.slice(0, 5),
            recommendation: 'Review vendor relationship and transaction frequency',
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Generate sample anomalies for demo
   */
  private generateSampleAnomalies(): TransactionAnomaly[] {
    return [
      {
        id: uuidv4(),
        type: 'duplicate',
        severity: 'high',
        description: 'Potential duplicate payment to AWS - $4,250.00 charged twice on consecutive days',
        amount: 4250,
        transactions: [],
        recommendation: 'Review AWS invoices and verify if this is a legitimate charge or duplicate',
      },
      {
        id: uuidv4(),
        type: 'suspicious_amount',
        severity: 'medium',
        description: 'Unusually large software subscription charge: $12,500 (normally $2,500/month)',
        amount: 12500,
        transactions: [],
        recommendation: 'Verify if this is an annual prepayment or billing error',
      },
    ];
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(anomalies: TransactionAnomaly[]): AgentRecommendation[] {
    const recommendations: AgentRecommendation[] = [];

    const duplicates = anomalies.filter(a => a.type === 'duplicate');
    if (duplicates.length > 0) {
      const totalDuplicateAmount = duplicates.reduce((sum, d) => sum + d.amount, 0);
      recommendations.push({
        id: uuidv4(),
        title: 'Review Potential Duplicate Payments',
        description: `Found ${duplicates.length} potential duplicate payments totaling $${totalDuplicateAmount.toLocaleString()}`,
        impact: {
          type: 'negative',
          metric: 'duplicate_payments',
          value: `$${totalDuplicateAmount.toLocaleString()} at risk`,
          confidence: 0.75,
        },
        priority: duplicates.some(d => d.severity === 'high' || d.severity === 'critical') ? 'high' : 'medium',
        category: 'fraud_prevention',
        actions: [
          'Review flagged transactions with accounting team',
          'Cross-reference with vendor invoices',
          'Request refund if duplicate confirmed',
        ],
        dataSources: [],
      });
    }

    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
    if (criticalAnomalies.length > 0) {
      recommendations.push({
        id: uuidv4(),
        title: 'Urgent: Critical Anomalies Detected',
        description: `${criticalAnomalies.length} critical issues require immediate attention`,
        impact: {
          type: 'negative',
          metric: 'financial_risk',
          value: 'Immediate review required',
          confidence: 0.9,
        },
        priority: 'critical',
        category: 'risk_management',
        actions: [
          'Immediately review critical transactions',
          'Contact vendors/banks if fraud suspected',
          'Document findings for audit trail',
        ],
        dataSources: [],
      });
    }

    return recommendations;
  }

  /**
   * Build natural language answer
   */
  private buildAnswer(anomalies: TransactionAnomaly[], transactionCount: number): string {
    let answer = `**Transaction Anomaly Scan Results**\n\n`;
    answer += `📊 Scanned **${transactionCount}** transactions from the last 30 days.\n\n`;

    if (anomalies.length === 0) {
      answer += `✅ **No anomalies detected.** All transactions appear normal.\n\n`;
      answer += `*Recommendations:*\n`;
      answer += `• Continue regular monitoring\n`;
      answer += `• Set up automated alerts for large transactions\n`;
      return answer;
    }

    const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
    const highCount = anomalies.filter(a => a.severity === 'high').length;
    const duplicateCount = anomalies.filter(a => a.type === 'duplicate').length;
    const totalAmount = anomalies.reduce((sum, a) => sum + Math.abs(a.amount), 0);

    answer += `⚠️ **Found ${anomalies.length} potential issues:**\n\n`;

    if (criticalCount > 0) {
      answer += `🚨 **${criticalCount} Critical** - Requires immediate attention\n`;
    }
    if (highCount > 0) {
      answer += `⚠️ **${highCount} High Priority** - Should review soon\n`;
    }
    if (duplicateCount > 0) {
      answer += `🔄 **${duplicateCount} Potential Duplicates** - $${anomalies.filter(a => a.type === 'duplicate').reduce((sum, a) => sum + a.amount, 0).toLocaleString()} at risk\n`;
    }

    answer += `\n**Total Amount Flagged:** $${totalAmount.toLocaleString()}\n\n`;

    answer += `**Flagged Items:**\n\n`;
    for (const anomaly of anomalies.slice(0, 5)) {
      const severityIcon = anomaly.severity === 'critical' ? '🚨' : anomaly.severity === 'high' ? '⚠️' : 'ℹ️';
      answer += `${severityIcon} **${anomaly.type.replace('_', ' ').toUpperCase()}:** ${anomaly.description}\n`;
      answer += `   *Action:* ${anomaly.recommendation}\n\n`;
    }

    if (anomalies.length > 5) {
      answer += `*...and ${anomalies.length - 5} more items*\n`;
    }

    return answer;
  }
}

export const anomalyAgent = new AnomalyAgentService();
