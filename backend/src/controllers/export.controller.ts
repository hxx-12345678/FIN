import { Request, Response, NextFunction } from 'express';
import { NotFoundError, ValidationError } from '../utils/errors';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/auth';
import { jobService } from '../services/job.service';
import { getSignedUrlForS3 } from '../utils/s3';

export const exportController = {
  createExport: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { run_id } = req.params;
      const { type, template } = req.body;

      if (!['pdf', 'pptx', 'csv', 'memo'].includes(type)) {
        throw new ValidationError('Invalid export type');
      }

      const modelRun = await prisma.modelRun.findUnique({
        where: { id: run_id },
      });

      if (!modelRun) {
        throw new NotFoundError('Model run not found');
      }

      // Prepare meta_json with template information
      const metaJson = template ? { template } : null;

      // Create export record (don't include updatedAt - it's auto-managed by Prisma)
      const exportRecord = await prisma.export.create({
        data: {
          modelRunId: run_id,
          orgId: modelRun.orgId,
          type,
          createdById: req.user?.id,
          metaJson: metaJson as any,
          // updatedAt is auto-managed by Prisma @updatedAt, don't include it
        },
      });

      // Create job for Python worker
      const jobType = type === 'memo' ? 'export_pdf' : `export_${type}` as any;
      const job = await jobService.createJob({
        jobType,
        orgId: modelRun.orgId,
        objectId: exportRecord.id,
        params: {
          exportId: exportRecord.id,
          modelRunId: run_id,
          type,
          template: template || null, // Pass template to Python worker
        },
      });

      res.status(201).json({ export: exportRecord, jobId: job.id });
    } catch (error) {
      next(error);
    }
  },

  getExport: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const exportRecord = await prisma.export.findUnique({
        where: { id },
      });

      if (!exportRecord) {
        throw new NotFoundError('Export not found');
      }

      // Generate signed URL if S3 key exists
      let downloadUrl = null;
      if (exportRecord.s3Key) {
        downloadUrl = await getSignedUrlForS3(exportRecord.s3Key);
      } else {
        // If no S3 key, use download endpoint (file might be in S3 or being processed)
        downloadUrl = `/api/v1/exports/${id}/download`;
      }

      res.json({ ...exportRecord, downloadUrl });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/exports/:id/download
   * Download export file directly from database
   */
  downloadExport: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
        });
      }

      const { id } = req.params;
      // Use raw query to get fileData (BYTEA) which Prisma doesn't handle well
      const exportRecord = await prisma.$queryRaw<Array<{
        id: string;
        modelRunId: string | null;
        orgId: string;
        type: string;
        s3Key: string | null;
        fileData: Buffer | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
      }>>`
        SELECT 
          e.id,
          e."modelRunId",
          e."orgId",
          e.type,
          e.s3_key as "s3Key",
          e.file_data as "fileData",
          e.status,
          e.created_at as "createdAt",
          e.updated_at as "updatedAt"
        FROM exports e
        WHERE e.id = ${id}::uuid
      `;

      if (!exportRecord || exportRecord.length === 0) {
        throw new NotFoundError('Export not found');
      }

      const exportData = exportRecord[0];
      
      // Get orgId from modelRun if not directly available
      let orgId = exportData.orgId;
      if (!orgId && exportData.modelRunId) {
        const modelRun = await prisma.modelRun.findUnique({
          where: { id: exportData.modelRunId },
          select: { orgId: true },
        });
        orgId = modelRun?.orgId || '';
      }

      if (!exportRecord) {
        throw new NotFoundError('Export not found');
      }

      // Verify access
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId: req.user.id,
            orgId: orgId,
          },
        },
      });

      if (!role) {
        throw new NotFoundError('No access to this export');
      }

      // Check if export is ready
      if (exportData.status !== 'completed') {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'NOT_READY',
            message: 'Export is not ready yet',
            status: exportData.status,
          },
        });
      }

      // Check if file is in S3
      if (exportData.s3Key) {
        const signedUrl = await getSignedUrlForS3(exportData.s3Key);
        return res.redirect(signedUrl);
      }

      // Get file data from database (fallback when S3 not configured)
      const fileData = exportData.fileData;
      if (!fileData) {
        throw new NotFoundError('Export file not found. File may still be processing or was not saved correctly.');
      }

      // Generate proper filename with org name and date
      const org = await prisma.org.findUnique({
        where: { id: orgId },
        select: { name: true },
      });

      const orgName = org?.name || 'Financial-Report';
      const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const sanitizedOrgName = orgName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const fileExtension = exportData.type === 'pdf' ? 'pdf' : exportData.type === 'pptx' ? 'pptx' : 'txt';
      const filename = `${sanitizedOrgName}-${exportData.type}-report-${dateStr}.${fileExtension}`;

      // Set content type
      const contentType = exportData.type === 'pdf'
        ? 'application/pdf'
        : exportData.type === 'pptx'
        ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        : 'text/plain';

      // Set headers and send file
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', fileData.length);

      // Send file data (it's already binary in database)
      res.send(Buffer.from(fileData));
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/orgs/:orgId/exports
   * List exports for an organization
   */
  listExports: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { status, type, limit, offset } = req.query;

      // Verify access
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId: req.user.id,
            orgId,
          },
        },
      });

      if (!role) {
        throw new ValidationError('No access to this organization');
      }

      const where: any = { orgId };
      if (status) {
        where.status = status;
      }
      if (type) {
        where.type = type;
      }

      const [exports, total] = await Promise.all([
        prisma.export.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit ? parseInt(limit as string) : 50,
          skip: offset ? parseInt(offset as string) : 0,
          include: {
            createdBy: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        }),
        prisma.export.count({ where }),
      ]);

      res.json({
        ok: true,
        exports,
        total,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
    } catch (error) {
      next(error);
    }
  },
};

