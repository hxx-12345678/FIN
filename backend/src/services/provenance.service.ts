import { Response } from 'express';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import prisma from '../config/database';
import { provenanceRepository } from '../repositories/provenance.repository';
import { auditService } from './audit.service';
import { jobService } from './job.service';

export interface ProvenanceEntryResponse {
  id: string;
  sourceType: 'txn' | 'assumption' | 'prompt';
  sourceRef: any;
  promptId: string | null;
  confidenceScore?: number | null;
  createdAt: Date;
  summary?: {
    countTxns?: number;
    totalAmount?: number;
    firstTxnDate?: Date | null;
    lastTxnDate?: Date | null;
  };
  sampleTransactions?: Array<{
    id: string;
    date: Date;
    amount: number;
    currency: string;
    category: string;
    description?: string | null;
  }>;
  promptPreview?: {
    id: string;
    renderedPrompt?: string | null;
    responseText?: string | null;
    provider?: string | null;
    modelUsed?: string | null;
  };
  excelFormula?: {
    formula: string;
    fileHash: string;
    cellRef: string;
    calculatedValue?: number | null;
  };
  assumptionRef?: {
    assumption_id?: string;
    name?: string;
    value?: any;
    assumption_value?: any;
    growth_rate?: number;
    calculated_from?: string[];
    [key: string]: any;
  };
  links?: {
    downloadTransactionsUrl?: string;
    openPromptUrl?: string;
    downloadExcelUrl?: string;
  };
}

export const provenanceService = {
  /**
   * Get provenance for a specific cell
   */
  getProvenance: async (
    modelRunId: string,
    cellKey: string,
    userId: string | null,
    limit: number = 50,
    offset: number = 0,
    full: boolean = false
  ): Promise<{
    ok: boolean;
    modelRunId: string;
    cellKey: string;
    entries: ProvenanceEntryResponse[];
    total: number;
    limit: number;
    offset: number;
  }> => {
    // Verify model run exists and user has access
    const modelRun = await prisma.modelRun.findUnique({
      where: { id: modelRunId },
      include: {
        model: {
          select: {
            orgId: true,
          },
        },
      },
    });

    if (!modelRun) {
      throw new NotFoundError('Model run not found');
    }

    // Check user access
    if (!userId) {
      throw new ForbiddenError('User ID is required');
    }
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId: modelRun.orgId,
        },
      },
    });

    if (!role) {
      throw new ForbiddenError('No access to this model run');
    }

    // Log access (only if user is authenticated, not for share tokens)
    if (userId) {
      await auditService.log({
        actorUserId: userId,
        orgId: modelRun.orgId,
        action: 'view_provenance',
        objectType: 'provenance_entry',
        objectId: undefined,
        metaJson: {
          modelRunId,
          cellKey,
          ip: null, // Could extract from request if available
          userAgent: null,
        },
      });
    }

    // Get provenance entries
    const entries = await provenanceRepository.findByModelRunAndCell(
      modelRunId,
      cellKey,
      limit,
      offset
    );

    const total = await provenanceRepository.countByModelRunAndCell(
      modelRunId,
      cellKey
    );

    // Get aggregations
    const aggregations = await provenanceRepository.getCellAggregations(
      modelRunId,
      cellKey
    );

    // Transform entries to response format
    const responseEntries: ProvenanceEntryResponse[] = await Promise.all(
      entries.map(async (entry) => {
        const response: ProvenanceEntryResponse = {
          id: entry.id,
          sourceType: entry.sourceType as 'txn' | 'assumption' | 'prompt',
          sourceRef: entry.sourceRef,
          promptId: entry.promptId,
          confidenceScore: entry.confidenceScore
            ? Number(entry.confidenceScore)
            : null,
          createdAt: entry.createdAt,
        };

        // Add transaction details if sourceType is 'txn'
        if (entry.sourceType === 'txn' && entry.sourceRef) {
          const ref = entry.sourceRef as any;
          // Handle both formats: direct array or object with transaction_ids
          let txnIds: string[] = [];
          if (Array.isArray(ref)) {
            txnIds = ref.filter((id: any) => typeof id === 'string');
          } else if (ref.transaction_ids && Array.isArray(ref.transaction_ids)) {
            txnIds = ref.transaction_ids.filter((id: any) => typeof id === 'string');
          } else if (typeof ref === 'string') {
            txnIds = [ref];
          }

          if (txnIds.length > 0) {
            const transactions = await prisma.rawTransaction.findMany({
              where: { id: { in: txnIds } },
              take: full ? undefined : 10, // Limit to 10 for preview
              orderBy: { date: 'desc' },
            });

            response.sampleTransactions = transactions.map((txn) => ({
              id: txn.id,
              date: txn.date,
              amount: Number(txn.amount),
              currency: txn.currency,
              category: txn.category || 'Uncategorized',
              description: txn.description,
            }));

            const txnAmounts = transactions.map((t) => Number(t.amount));
            response.summary = {
              countTxns: txnIds.length,
              totalAmount: txnAmounts.reduce((sum, amt) => sum + amt, 0),
              firstTxnDate:
                transactions.length > 0
                  ? transactions[transactions.length - 1].date
                  : null,
              lastTxnDate:
                transactions.length > 0 ? transactions[0].date : null,
            };

            if (full) {
              // For now, we'll return a placeholder
              response.links = {
                downloadTransactionsUrl: `/api/v1/provenance/${entry.id}/transactions?format=csv`,
              };
            }
          }
        }

        // Add assumption details if sourceType is 'assumption'
        if (entry.sourceType === 'assumption' && entry.sourceRef) {
          const ref = entry.sourceRef as any;
          // Ensure assumption data is properly structured in the response
          response.assumptionRef = {
            assumption_id: ref.assumption_id || ref.name || 'Assumption',
            value: ref.value !== undefined ? ref.value : (ref.assumption_value !== undefined ? ref.assumption_value : null),
            growth_rate: ref.growth_rate,
            calculated_from: ref.calculated_from,
            ...ref, // Include all other fields
          };
        }

        // Add Excel formula details if sourceType is 'excel'
        if (entry.sourceType === 'excel' && entry.sourceRef) {
          const ref = entry.sourceRef as any;
          response.excelFormula = {
            formula: ref.formula,
            fileHash: ref.fileHash,
            cellRef: ref.cellRef,
            calculatedValue: ref.calculatedValue,
          };
          response.links = {
            ...response.links,
            downloadExcelUrl: `/api/v1/provenance/export-excel?fileHash=${ref.fileHash}&cellRef=${ref.cellRef}`,
          };
        }

        // Add prompt details if available
        if (entry.prompt) {
          response.promptPreview = {
            id: entry.prompt.id,
            renderedPrompt: entry.prompt.renderedPrompt,
            responseText: entry.prompt.responseText,
            provider: entry.prompt.provider,
            modelUsed: entry.prompt.modelUsed,
          };
          response.links = {
            ...response.links,
            openPromptUrl: `/api/v1/prompts/${entry.prompt.id}`,
          };
        }

        return response;
      })
    );

    return {
      ok: true,
      modelRunId,
      cellKey,
      entries: responseEntries,
      total,
      limit,
      offset,
    };
  },

  /**
   * Get provenance for multiple cells (bulk)
   */
  getBulkProvenance: async (
    modelRunId: string,
    cellKeys: string[],
    userId: string | null
  ): Promise<{
    ok: boolean;
    modelRunId: string;
    data: Record<string, ProvenanceEntryResponse[]>;
  }> => {
    // Verify model run exists and user has access
    const modelRun = await prisma.modelRun.findUnique({
      where: { id: modelRunId },
    });

    if (!modelRun) {
      throw new NotFoundError('Model run not found');
    }

    if (userId) {
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId,
            orgId: modelRun.orgId,
          },
        },
      });

      if (!role) {
        throw new ForbiddenError('No access to this model run');
      }
    }

    // Get all entries for these cells
    const entries = await provenanceRepository.findByModelRunAndCells(
      modelRunId,
      cellKeys
    );

    // Group by cellKey
    const grouped: Record<string, ProvenanceEntryResponse[]> = {};
    for (const cellKey of cellKeys) {
      grouped[cellKey] = [];
    }

    // Transform and group entries
    for (const entry of entries) {
      const response: ProvenanceEntryResponse = {
        id: entry.id,
        sourceType: entry.sourceType as 'txn' | 'assumption' | 'prompt',
        sourceRef: entry.sourceRef,
        promptId: entry.promptId,
        confidenceScore: entry.confidenceScore
          ? Number(entry.confidenceScore)
          : null,
        createdAt: entry.createdAt,
      };

      if (entry.prompt) {
        response.promptPreview = {
          id: entry.prompt.id,
          renderedPrompt: entry.prompt.renderedPrompt,
          responseText: entry.prompt.responseText,
          provider: entry.prompt.provider,
          modelUsed: entry.prompt.modelUsed,
        };
      }

      if (grouped[entry.cellKey]) {
        grouped[entry.cellKey].push(response);
      }
    }

    return {
      ok: true,
      modelRunId,
      data: grouped,
    };
  },

  /**
   * Search provenance entries
   */
  searchProvenance: async (
    orgId: string,
    query: string,
    userId: string | null,
    limit: number = 20
  ): Promise<{
    ok: boolean;
    query: string;
    entries: ProvenanceEntryResponse[];
    total: number;
  }> => {
    // Verify user access
    if (userId) {
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId,
            orgId,
          },
        },
      });

      if (!role) {
        throw new ForbiddenError('No access to this organization');
      }
    }

    // Search entries
    const entries = await provenanceRepository.search(orgId, query, limit);

    // Transform to response format
    const responseEntries: ProvenanceEntryResponse[] = entries.map((entry: any) => {
      const response: ProvenanceEntryResponse = {
        id: entry.id,
        sourceType: entry.sourceType as 'txn' | 'assumption' | 'prompt',
        sourceRef: entry.sourceRef,
        promptId: entry.promptId,
        confidenceScore: entry.confidenceScore
          ? Number(entry.confidenceScore)
          : null,
        createdAt: entry.createdAt,
      };

      if (entry.prompt) {
        response.promptPreview = {
          id: entry.prompt.id,
          renderedPrompt: entry.prompt.renderedPrompt,
          responseText: entry.prompt.responseText,
          provider: entry.prompt.provider,
          modelUsed: entry.prompt.modelUsed,
        };
      }

      return response;
    });

    return {
      ok: true,
      query,
      entries: responseEntries,
      total: responseEntries.length,
    };
  },

  /**
   * Get bulk provenance by metric IDs
   */
  getBulkProvenanceByMetrics: async (
    orgId: string,
    metricIds: string[],
    userId: string
  ): Promise<{
    ok: boolean;
    results: Array<{
      metricId: string;
      source: string;
      transactions: any[];
      promptUsed: string;
      llmConfidence: number;
      lastUpdated: string;
    }>;
  }> => {
    // Verify user access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    // Search for provenance entries matching the metricIds
    // We'll search by cellKey (which often contains metric names)
    const results: Array<{
      metricId: string;
      source: string;
      transactions: any[];
      promptUsed: string;
      llmConfidence: number;
      lastUpdated: string;
    }> = [];

    for (const metricId of metricIds) {
      try {
        // Search for entries where cellKey or sourceRef contains the metricId
        const entries = await prisma.provenanceEntry.findMany({
          where: {
            orgId,
            OR: [
              { cellKey: { contains: metricId, mode: 'insensitive' } },
              { sourceRef: { path: ['metricId'], equals: metricId } },
              { sourceRef: { path: ['metric'], equals: metricId } },
            ],
          },
          include: {
            prompt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 100, // Limit per metric
        });

        if (entries.length > 0) {
          const latestEntry = entries[0];
          const sourceRef = latestEntry.sourceRef as any;

          // Extract transactions
          const transactions: any[] = [];
          if (sourceRef && sourceRef.transactionId) {
            const txn = await prisma.rawTransaction.findUnique({
              where: { id: sourceRef.transactionId },
            });
            if (txn) {
              transactions.push({
                id: txn.id,
                date: txn.date,
                amount: txn.amount,
                category: txn.category,
              });
            }
          } else if (Array.isArray(sourceRef)) {
            const txnIds = sourceRef.filter((id: any) => typeof id === 'string');
            if (txnIds.length > 0) {
              const txns = await prisma.rawTransaction.findMany({
                where: { id: { in: txnIds.slice(0, 10) } }, // Limit to 10
                select: {
                  id: true,
                  date: true,
                  amount: true,
                  category: true,
                },
              });
              transactions.push(...txns);
            }
          }

          results.push({
            metricId,
            source: latestEntry.sourceType,
            transactions,
            promptUsed: latestEntry.prompt?.renderedPrompt || '',
            llmConfidence: latestEntry.confidenceScore
              ? Number(latestEntry.confidenceScore)
              : 0,
            lastUpdated: latestEntry.createdAt.toISOString(),
          });
        }
      } catch (error) {
        // Skip this metric if there's an error
        console.error(`Error processing metric ${metricId}:`, error);
      }
    }

    return {
      ok: true,
      results,
    };
  },

  /**
   * Stream transactions for a provenance entry (SSE)
   */
  streamTransactions: async (
    modelRunId: string,
    cellKey: string,
    userId: string,
    res: any // Express Response object
  ): Promise<void> => {
    // Verify access
    const modelRun = await prisma.modelRun.findUnique({
      where: { id: modelRunId },
    });

    if (!modelRun) {
      throw new NotFoundError('Model run not found');
    }

    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId: modelRun.orgId,
        },
      },
    });

    if (!role) {
      throw new ForbiddenError('No access to this model run');
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Get provenance entry to find transaction IDs
    const entry = await prisma.provenanceEntry.findFirst({
      where: {
        modelRunId,
        cellKey,
        sourceType: 'txn',
      },
    });

    if (!entry || !entry.sourceRef) {
      res.write('data: ' + JSON.stringify({ done: true, count: 0 }) + '\n\n');
      res.end();
      return;
    }

    const ref = entry.sourceRef as any;
    const txnIds: string[] = Array.isArray(ref)
      ? ref.filter((id: any) => typeof id === 'string')
      : [];

    if (txnIds.length === 0) {
      res.write('data: ' + JSON.stringify({ done: true, count: 0 }) + '\n\n');
      res.end();
      return;
    }

    // Stream transactions in batches
    const batchSize = 100;
    let sent = 0;

    for (let i = 0; i < txnIds.length; i += batchSize) {
      const batchIds = txnIds.slice(i, i + batchSize);
      const transactions = await prisma.rawTransaction.findMany({
        where: { id: { in: batchIds } },
        select: {
          id: true,
          date: true,
          amount: true,
          currency: true,
          category: true,
          description: true,
          sourceId: true,
        },
      });

      res.write('data: ' + JSON.stringify({ batch: transactions }) + '\n\n');
      sent += transactions.length;
    }

    res.write('data: ' + JSON.stringify({ done: true, count: sent }) + '\n\n');
    res.end();
  },

  /**
   * Generate Excel export with highlighted cell
   */
  generateExcelExport: async (
    fileHash: string,
    cellRef: string,
    userId: string
  ): Promise<{ s3Key?: string; downloadUrl: string }> => {
    // Find the sync record to verify access and get S3 key (if stored)
    // Note: In a real implementation, we'd fetch the file from S3, 
    // modify it to highlight the cell, and return a new URL.
    // For this MVP, we'll redirect to the original file or return a placeholder.
    
    const sync = await prisma.excelSync.findFirst({
      where: { fileHash },
      include: {
        org: true, // Check org access via relation or implicit context
      },
    });

    if (!sync) {
      throw new NotFoundError('Excel file not found');
    }

    // Verify user access to org
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId: sync.orgId,
        },
      },
    });

    if (!role) {
      throw new ForbiddenError('No access to this file');
    }

    // In production: trigger a worker job to generate highlighted Excel
    // For now, we will mock this behavior by returning a signed URL to the original file 
    // (assuming we stored it, which we might not have in the MVP if only hash is kept).
    // If we don't have the file, we can't return it.
    
    // Let's check if we have an associated job that might have the S3 key
    // Note: params is JSONB, so we can't easily filter by it. For now, we'll skip this lookup.
    // In production, you might want to store fileHash in a separate column or use a different approach.
    const job = null; // Placeholder - would need to query differently if needed

    let downloadUrl = '';
    /* 
       If we had the S3 key in the sync table, we would use it.
       For now, we'll return a dummy URL or the one from the job if available.
    */
    
    return {
      downloadUrl: `https://example.com/download/${fileHash}?cell=${cellRef}` // Placeholder
    };
  },

  /**
   * Create provenance export job
   */
  createExportJob: async (
    modelRunId: string,
    userId: string,
    format: 'pdf' | 'json' = 'json',
    includeTransactions: boolean = true
  ): Promise<{
    ok: boolean;
    jobId: string;
  }> => {
    // Verify model run exists and user has access
    const modelRun = await prisma.modelRun.findUnique({
      where: { id: modelRunId },
    });

    if (!modelRun) {
      throw new NotFoundError('Model run not found');
    }

    // Check user access (finance or admin required for export)
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId: modelRun.orgId,
        },
      },
    });

    if (!role || !['admin', 'finance'].includes(role.role)) {
      throw new ForbiddenError('Only admins and finance users can export provenance');
    }

    // Create export job
    const job = await jobService.createJob({
      jobType: 'provenance_export' as any,
      orgId: modelRun.orgId,
      objectId: modelRunId,
      params: {
        modelRunId,
        format,
        includeTransactions,
        requestedBy: userId,
      },
    });

    return {
      ok: true,
      jobId: job.id,
    };
  },
};
