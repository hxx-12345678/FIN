import prisma from '../config/database';
import { auditService } from './audit.service';
import { ValidationError, NotFoundError } from '../utils/errors';

// Type assertion for Prisma models that may not be in generated types yet
const prismaClient = prisma as any;

export const semanticLayerService = {
  /**
   * Promote raw transactions to the financial ledger.
   * This is where validation and cleaning happen before data becomes "official".
   */
  promoteToLedger: async (orgId: string, importBatchId: string) => {
    // 1. Fetch raw transactions for this batch that aren't duplicates
    const rawTxns = await prisma.rawTransaction.findMany({
      where: {
        orgId,
        importBatchId,
        isDuplicate: false,
      } as any,
    });

    if (rawTxns.length === 0) {
      throw new ValidationError('No valid transactions found in this batch to promote');
    }

    // 2. Map raw transactions to ledger entries
    // In a real industrial app, this would use the Chart of Accounts mapping.
    const ledgerEntries = rawTxns.map(txn => ({
      orgId: txn.orgId,
      transactionDate: txn.date,
      amount: txn.amount,
      currency: txn.currency,
      accountCode: txn.category, // Simplification: using category as account code
      accountName: txn.category,
      category: txn.category,
      description: txn.description,
      sourceType: 'raw_transaction',
      sourceId: txn.id,
    }));

    // 3. Insert into ledger (bulk with chunking for large datasets)
    // For large batches (100K+ entries), chunk the inserts to avoid transaction timeout
    const CHUNK_SIZE = 10000; // Insert 10K entries per transaction
    const result: any[] = [];
    
    if (ledgerEntries.length > CHUNK_SIZE) {
      // Chunk large batches
      for (let i = 0; i < ledgerEntries.length; i += CHUNK_SIZE) {
        const chunk = ledgerEntries.slice(i, i + CHUNK_SIZE);
        const chunkResult = await prisma.$transaction(
          chunk.map(entry =>
            prismaClient.financialLedger.create({ data: entry })
          )
        );
        result.push(...chunkResult);
      }
    } else {
      // Small batches: single transaction
      const transactionResult = await prisma.$transaction(
        ledgerEntries.map(entry =>
          prisma.financialLedger.create({ data: entry })
        )
      );
      result.push(...transactionResult);
    }

    await auditService.log({
      orgId,
      action: 'transactions_promoted_to_ledger',
      objectType: 'import_batch',
      objectId: importBatchId,
      metaJson: {
        count: result.length,
      },
    });

    return {
      count: result.length,
    };
  },

  /**
   * Add a manual adjustment to the ledger.
   * Typically requires an approval request, but here we provide the low-level method.
   */
  addAdjustment: async (params: {
    orgId: string;
    transactionDate: Date;
    amount: number;
    currency: string;
    accountCode: string;
    description: string;
    reason: string;
  }) => {
    const entry = await prismaClient.financialLedger.create({
      data: {
        orgId: params.orgId,
        transactionDate: params.transactionDate,
        amount: params.amount,
        currency: params.currency,
        accountCode: params.accountCode,
        description: params.description,
        sourceType: 'adjustment',
        isAdjustment: true,
        adjustmentReason: params.reason,
      },
    });

    await auditService.log({
      orgId: params.orgId,
      action: 'ledger_adjustment_added',
      objectType: 'financial_ledger',
      objectId: entry.id,
      metaJson: {
        amount: params.amount,
        reason: params.reason,
      },
    });

    return entry;
  },

  /**
   * Get clean ledger data for reporting.
   */
  getLedgerData: async (orgId: string, startDate?: Date, endDate?: Date) => {
    return await prismaClient.financialLedger.findMany({
      where: {
        orgId,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { transactionDate: 'desc' },
    });
  },
};


