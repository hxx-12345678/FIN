/**
 * Investor Export Controller
 * One-click investor memo + PPTX generation
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { investorExportService } from '../services/investor-export.service';
import { ValidationError, NotFoundError } from '../utils/errors';
import prisma from '../config/database';

export const investorExportController = {
  /**
   * POST /api/v1/orgs/:orgId/investor-export
   * Create one-click investor export (PDF, PPTX, or Memo)
   */
  createExport: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.params;
      const { format, modelRunId, includeMonteCarlo, includeRecommendations } = req.body;

      if (!['pdf', 'pptx', 'memo'].includes(format)) {
        throw new ValidationError('Invalid format. Must be pdf, pptx, or memo');
      }

      const result = await investorExportService.createInvestorExport(req.user.id, {
        orgId,
        modelRunId,
        format,
        includeMonteCarlo: includeMonteCarlo ?? true,
        includeRecommendations: includeRecommendations ?? true,
      });

      res.status(201).json({
        ok: true,
        export: result,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/exports/:id/status
   * Get export status and download info
   */
  getExportStatus: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { id } = req.params;
      
      const exportRecord = await prisma.export.findUnique({
        where: { id },
        include: {
          modelRun: {
            select: {
              orgId: true,
            },
          },
        },
      }) as any;

      if (!exportRecord) {
        throw new ValidationError('Export not found');
      }

      // Verify access
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId: req.user.id,
            orgId: exportRecord.orgId,
          },
        },
      });

      if (!role) {
        throw new ValidationError('No access to this export');
      }

      // Get download info if ready
      let downloadInfo = null;
      if (exportRecord.status === 'completed') {
        try {
          downloadInfo = await investorExportService.getExportDownload(req.user.id, id);
        } catch (e) {
          // Export might not be ready yet
        }
      }

      // Always include filename even if export is not ready yet
      let filename = null;
      if (exportRecord.status === 'completed' && downloadInfo) {
        filename = downloadInfo.filename;
      } else {
        // Generate filename based on org name even if not ready
        const org = await prisma.org.findUnique({
          where: { id: exportRecord.orgId },
          select: { name: true },
        });
        const orgName = org?.name || 'Financial-Report';
        const dateStr = new Date().toISOString().split('T')[0];
        const sanitizedOrgName = orgName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        const fileExtension = exportRecord.type === 'pdf' ? 'pdf' : exportRecord.type === 'pptx' ? 'pptx' : 'txt';
        filename = `${sanitizedOrgName}-${exportRecord.type}-report-${dateStr}.${fileExtension}`;
      }

      res.json({
        ok: true,
        status: exportRecord.status,
        export: {
          id: exportRecord.id,
          status: exportRecord.status,
          type: exportRecord.type,
          downloadUrl: downloadInfo?.downloadUrl || null,
          filename: filename,
          contentType: downloadInfo?.contentType || null,
          createdAt: exportRecord.createdAt,
          updatedAt: exportRecord.updatedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};


