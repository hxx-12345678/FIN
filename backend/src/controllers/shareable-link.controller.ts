/**
 * Shareable Link Controller
 * Handles shareable link creation, access, and management
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { shareableLinkService } from '../services/shareable-link.service';
import { ValidationError, NotFoundError } from '../utils/errors';
import prisma from '../config/database';

export const shareableLinkController = {
  /**
   * POST /api/v1/exports/:exportId/shareable-link
   * Create a shareable link for an export
   */
  createShareableLink: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { exportId } = req.params;
      const { expiresInHours, maxAccessCount } = req.body;

      const shareableLink = await shareableLinkService.createShareableLink(
        exportId,
        req.user.id,
        {
          expiresInHours,
          maxAccessCount,
        }
      );

      // Generate full shareable URL
      const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3000';
      const shareUrl = `${frontendUrl}/share-export/${shareableLink.token}`;
      const apiUrl = process.env.API_URL || 'http://localhost:8000';
      const downloadUrl = `${apiUrl}/api/v1/share-export/${shareableLink.token}/download`;

      res.status(201).json({
        ok: true,
        shareableLink: {
          id: shareableLink.id,
          token: shareableLink.token,
          shareUrl,
          downloadUrl,
          expiresAt: shareableLink.expiresAt,
          maxAccessCount: shareableLink.maxAccessCount,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/share-export/:token
   * Access an export via shareable link (public endpoint)
   */
  accessByToken: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;

      const result = await shareableLinkService.getExportByToken(token);

      if (!result) {
        throw new NotFoundError('Shareable link not found or expired');
      }

      // Check if export is ready
      if (result.export.status !== 'completed') {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'NOT_READY',
            message: 'Export is not ready yet',
            status: result.export.status,
          },
        });
      }

      // Redirect to download endpoint
      const apiUrl = process.env.API_URL || 'http://localhost:8000';
      const downloadUrl = `${apiUrl}/api/v1/share-export/${token}/download`;
      return res.redirect(downloadUrl);
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/share-export/:token/download
   * Download export file via shareable link (public endpoint)
   */
  downloadByToken: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;

      const result = await shareableLinkService.getExportByToken(token);

      if (!result) {
        throw new NotFoundError('Shareable link not found or expired');
      }

      // Check if export is ready
      if (result.export.status !== 'completed') {
        return res.status(400).json({
          ok: false,
          error: {
            code: 'NOT_READY',
            message: 'Export is not ready yet',
            status: result.export.status,
          },
        });
      }

      // Get file data using raw query to access fileData (BYTEA)
      const exportData = await prisma.$queryRaw<Array<{
        id: string;
        type: string;
        s3Key: string | null;
        fileData: Buffer | null;
        orgId: string;
      }>>`
        SELECT 
          e.id,
          e.type,
          e.s3_key as "s3Key",
          e.file_data as "fileData",
          e."orgId"
        FROM exports e
        WHERE e.id = ${result.exportId}::uuid
      `;

      if (!exportData || exportData.length === 0) {
        throw new NotFoundError('Export file not found');
      }

      const exportRecord = exportData[0];

      // Check if file is in S3
      if (exportRecord.s3Key) {
        const { getSignedUrlForS3 } = await import('../utils/s3');
        const signedUrl = await getSignedUrlForS3(exportRecord.s3Key);
        return res.redirect(signedUrl);
      }

      // Get file data from database (fallback when S3 not configured)
      const fileData = exportRecord.fileData;
      if (!fileData) {
        throw new NotFoundError('Export file not found. File may still be processing or was not saved correctly.');
      }

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

      // Set content type
      const contentType = exportRecord.type === 'pdf'
        ? 'application/pdf'
        : exportRecord.type === 'pptx'
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
   * DELETE /api/v1/exports/:exportId/shareable-link/:token
   * Revoke a shareable link
   */
  revokeShareableLink: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { exportId, token } = req.params;

      await shareableLinkService.revokeShareableLink(exportId, token, req.user.id);

      res.json({
        ok: true,
        message: 'Shareable link revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/exports/:exportId/shareable-links
   * List all shareable links for an export
   */
  listShareableLinks: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { exportId } = req.params;

      const shareableLinks = await shareableLinkService.listShareableLinks(
        exportId,
        req.user.id
      );

      res.json({
        ok: true,
        shareableLinks: shareableLinks.map(link => ({
          id: link.id,
          token: link.token.substring(0, 8) + '...', // Partial token for security
          expiresAt: link.expiresAt,
          createdAt: link.createdAt,
          accessCount: link.accessCount,
          maxAccessCount: link.maxAccessCount,
        })),
      });
    } catch (error) {
      next(error);
    }
  },
};

