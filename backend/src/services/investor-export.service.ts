/**
 * Investor Export Service
 * Generates one-click investor memo + PPTX without S3 (direct download)
 */

import prisma from '../config/database';
import { jobService } from './job.service';
import { auditService } from './audit.service';
import { ValidationError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface InvestorExportParams {
  orgId: string;
  modelRunId?: string;
  format: 'pdf' | 'pptx' | 'memo';
  includeMonteCarlo?: boolean;
  includeRecommendations?: boolean;
  template?: string;
  metadata?: any;
}

export interface InvestorExportResult {
  exportId: string;
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
}

export const investorExportService = {
  /**
   * Create investor export (PDF, PPTX, or Memo)
   * Returns job ID and export ID - file will be available via download endpoint
   */
  createInvestorExport: async (
    userId: string,
    params: InvestorExportParams
  ): Promise<InvestorExportResult> => {
    try {
      // Verify user has access to org
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId,
            orgId: params.orgId,
          },
        },
      });

      if (!role) {
        throw new NotFoundError('No access to this organization');
      }

      // Get model run (use latest if not specified)
      let modelRun;
      if (params.modelRunId) {
        modelRun = await prisma.modelRun.findFirst({
          where: {
            id: params.modelRunId,
            orgId: params.orgId,
          },
        });
      } else {
        modelRun = await prisma.modelRun.findFirst({
          where: {
            orgId: params.orgId,
            status: 'done',
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
      }

      if (!modelRun) {
        throw new NotFoundError('No model run found for this organization');
      }

      // Get org details
      const org = await prisma.org.findUnique({
        where: { id: params.orgId },
        select: { name: true },
      });

      // Create export record (don't include updatedAt - it's auto-managed by Prisma)
      const exportRecord = await prisma.export.create({
        data: {
          modelRunId: modelRun.id,
          orgId: params.orgId,
          type: params.format === 'memo' ? 'pdf' : params.format,
          createdById: userId,
          // updatedAt is auto-managed by Prisma @updatedAt, don't include it
        },
      });

      // Create job for Python worker (use investor-specific handlers)
      const jobType = params.format === 'memo' 
        ? 'investor_export_pdf' 
        : `investor_export_${params.format}` as any;
      const job = await jobService.createJob({
        jobType,
        orgId: params.orgId,
        objectId: exportRecord.id,
        params: {
          exportId: exportRecord.id,
          modelRunId: modelRun.id,
          type: params.format,
          orgName: org?.name,
          includeMonteCarlo: params.includeMonteCarlo ?? true,
          includeRecommendations: params.includeRecommendations ?? true,
          template: params.template,
          metadata: params.metadata,
          directDownload: true, // Flag to skip S3, store in DB instead
        },
        priority: 70, // High priority for exports
      });

      // Create audit log
      await auditService.log({
        actorUserId: userId,
        orgId: params.orgId,
        action: 'investor_export_created',
        objectType: 'export',
        objectId: exportRecord.id,
        metaJson: {
          format: params.format,
          modelRunId: modelRun.id,
          jobId: job.id,
        },
      });

      logger.info(`Investor export created: ${exportRecord.id} (${params.format}) for org ${params.orgId}`);

      return {
        exportId: exportRecord.id,
        jobId: job.id,
        status: 'queued',
      };
    } catch (error: any) {
      logger.error(`Failed to create investor export: ${error.message}`, error);
      throw error;
    }
  },

  /**
   * Get export download URL (direct from database, no S3)
   */
  getExportDownload: async (
    userId: string,
    exportId: string
  ): Promise<{ downloadUrl: string; filename: string; contentType: string }> => {
    try {
      const exportRecord = await prisma.export.findUnique({
        where: { id: exportId },
        include: {
          modelRun: {
            select: {
              orgId: true,
            },
          },
        },
      }) as any;

      if (!exportRecord) {
        throw new NotFoundError('Export not found');
      }

      // Verify access
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId,
            orgId: exportRecord.orgId,
          },
        },
      });

      if (!role) {
        throw new NotFoundError('No access to this export');
      }

      // Check if export is ready
      if (exportRecord.status !== 'completed') {
        throw new ValidationError('Export is not ready yet');
      }

      // Get file from database (stored as base64 or binary)
      // For now, return API endpoint that serves the file
      const downloadUrl = `/api/v1/exports/${exportId}/download`;
      
      // Generate proper filename with org name and date
      const org = await prisma.org.findUnique({
        where: { id: exportRecord.orgId },
        select: { name: true },
      });
      
      const orgName = org?.name || 'Financial-Report';
      const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const sanitizedOrgName = orgName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const fileExtension = exportRecord.type === 'pdf' ? 'pdf' : exportRecord.type === 'pptx' ? 'pptx' : 'txt';
      const filename = `${sanitizedOrgName}-${exportRecord.type}-report-${dateStr}.${fileExtension}`;
      
      const contentType = exportRecord.type === 'pdf' 
        ? 'application/pdf'
        : exportRecord.type === 'pptx'
        ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        : 'text/plain';

      return {
        downloadUrl,
        filename,
        contentType,
      };
    } catch (error: any) {
      logger.error(`Failed to get export download: ${error.message}`, error);
      throw error;
    }
  },
};

