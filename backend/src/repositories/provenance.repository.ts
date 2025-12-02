import prisma from '../config/database';
import { ProvenanceEntry, Prompt, RawTransaction } from '@prisma/client';

export interface ProvenanceEntryWithRelations extends ProvenanceEntry {
  prompt?: Prompt | null;
}

export const provenanceRepository = {
  /**
   * Find provenance entries for a specific model run and cell
   */
  findByModelRunAndCell: async (
    modelRunId: string,
    cellKey: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ProvenanceEntryWithRelations[]> => {
    return await prisma.provenanceEntry.findMany({
      where: {
        modelRunId,
        cellKey,
      },
      include: {
        prompt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });
  },

  /**
   * Find provenance entries for multiple cells (bulk query)
   */
  findByModelRunAndCells: async (
    modelRunId: string,
    cellKeys: string[]
  ): Promise<ProvenanceEntryWithRelations[]> => {
    return await prisma.provenanceEntry.findMany({
      where: {
        modelRunId,
        cellKey: {
          in: cellKeys,
        },
      },
      include: {
        prompt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  /**
   * Count total entries for a model run and cell
   */
  countByModelRunAndCell: async (
    modelRunId: string,
    cellKey: string
  ): Promise<number> => {
    return await prisma.provenanceEntry.count({
      where: {
        modelRunId,
        cellKey,
      },
    });
  },

  /**
   * Search provenance entries by query (searches in source_ref and prompts)
   */
  search: async (
    orgId: string,
    query: string,
    limit: number = 50
  ): Promise<ProvenanceEntryWithRelations[]> => {
    // Use raw query for JSONB and text search
    const results = await prisma.$queryRaw<ProvenanceEntryWithRelations[]>`
      SELECT DISTINCT pe.*
      FROM provenance_entries pe
      LEFT JOIN prompts p ON pe."promptId" = p.id
      WHERE pe."orgId" = ${orgId}::uuid
        AND (
          pe."source_ref"::text ILIKE ${`%${query}%`}
          OR p."rendered_prompt" ILIKE ${`%${query}%`}
          OR p."response_text" ILIKE ${`%${query}%`}
        )
      ORDER BY pe."created_at" DESC
      LIMIT ${limit}
    `;

    // Fetch with relations
    const ids = results.map((r: any) => r.id);
    if (ids.length === 0) {
      return [];
    }

    return await prisma.provenanceEntry.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include: {
        prompt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  /**
   * Get transactions referenced in provenance entries
   */
  getReferencedTransactions: async (
    transactionIds: string[]
  ): Promise<RawTransaction[]> => {
    if (transactionIds.length === 0) {
      return [];
    }

    return await prisma.rawTransaction.findMany({
      where: {
        id: {
          in: transactionIds,
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
  },

  /**
   * Create provenance entries in bulk (for Python worker)
   */
  createMany: async (
    entries: Array<{
      modelRunId: string;
      orgId: string;
      cellKey: string;
      sourceType: 'txn' | 'assumption' | 'prompt';
      sourceRef: any;
      promptId?: string | null;
      confidenceScore?: number | null;
    }>
  ): Promise<{ count: number }> => {
    return await prisma.provenanceEntry.createMany({
      data: entries,
      skipDuplicates: true, // Use idempotency via unique constraints if needed
    });
  },

  /**
   * Get aggregation stats for a cell (transaction count, sum, etc.)
   */
  getCellAggregations: async (
    modelRunId: string,
    cellKey: string
  ): Promise<{
    countTxns: number;
    totalAmount: number;
    firstTxnDate: Date | null;
    lastTxnDate: Date | null;
    avgConfidence: number | null;
  }> => {
    // Get all entries for this cell
    const entries = await prisma.provenanceEntry.findMany({
      where: {
        modelRunId,
        cellKey,
        sourceType: 'txn',
      },
      select: {
        sourceRef: true,
        confidenceScore: true,
      },
    });

    // Extract transaction IDs from sourceRef
    const transactionIds: string[] = [];
    entries.forEach((entry) => {
      if (entry.sourceRef) {
        const ref = entry.sourceRef as any;
        if (Array.isArray(ref)) {
          ref.forEach((item: any) => {
            if (typeof item === 'string') {
              transactionIds.push(item);
            } else if (item.id) {
              transactionIds.push(item.id);
            }
          });
        }
      }
    });

    // Get transaction aggregations
    let countTxns = 0;
    let totalAmount = 0;
    let firstTxnDate: Date | null = null;
    let lastTxnDate: Date | null = null;

    if (transactionIds.length > 0) {
      const transactions = await prisma.rawTransaction.findMany({
        where: {
          id: {
            in: transactionIds,
          },
        },
        select: {
          date: true,
          amount: true,
        },
        orderBy: {
          date: 'asc',
        },
      });

      countTxns = transactions.length;
      totalAmount = transactions.reduce(
        (sum, txn) => sum + Number(txn.amount),
        0
      );
      if (transactions.length > 0) {
        firstTxnDate = transactions[0].date;
        lastTxnDate = transactions[transactions.length - 1].date;
      }
    }

    // Calculate average confidence
    const confidences = entries
      .map((e) => e.confidenceScore)
      .filter((c) => c !== null)
      .map((c) => Number(c));
    const avgConfidence =
      confidences.length > 0
        ? confidences.reduce((sum, c) => sum + Number(c), 0) /
          confidences.length
        : null;

    return {
      countTxns,
      totalAmount,
      firstTxnDate,
      lastTxnDate,
      avgConfidence,
    };
  },
};


