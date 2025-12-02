/**
 * Shareable Link Service
 * Generates secure, time-limited shareable links for exports
 */

import prisma from '../config/database';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export interface ShareableLink {
  id: string;
  exportId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  accessCount: number;
  maxAccessCount?: number;
}

const TOKEN_LENGTH = 32;
const DEFAULT_EXPIRY_HOURS = 168; // 7 days
const DEFAULT_MAX_ACCESS = 100;

export const shareableLinkService = {
  /**
   * Generate a secure random token
   */
  generateToken: (): string => {
    return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
  },

  /**
   * Create a shareable link for an export
   */
  createShareableLink: async (
    exportId: string,
    userId: string,
    options?: {
      expiresInHours?: number;
      maxAccessCount?: number;
    }
  ): Promise<ShareableLink> => {
    try {
      // Verify export exists and user has access
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
        throw new Error('Export not found');
      }

      // Verify user has access
      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId,
            orgId: exportRecord.orgId,
          },
        },
      });

      if (!role) {
        throw new Error('No access to this export');
      }

      // Check if export is ready
      if (exportRecord.status !== 'completed') {
        throw new Error('Export is not ready yet');
      }

      // Generate token
      const token = shareableLinkService.generateToken();

      // Calculate expiry
      const expiresInHours = options?.expiresInHours || DEFAULT_EXPIRY_HOURS;
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

      // Create shareable link record
      // Note: We'll store this in a new table or use exports table metadata
      // For now, we'll use a simple approach with a shareable_links table
      // If table doesn't exist, we'll store in exports table metadata
      
      const shareableLink = {
        id: crypto.randomUUID(),
        exportId,
        token,
        expiresAt,
        createdAt: new Date(),
        accessCount: 0,
        maxAccessCount: options?.maxAccessCount || DEFAULT_MAX_ACCESS,
      };

      // Store shareable link using raw SQL (meta_json field exists in DB but not in Prisma schema yet)
      // In production, add metaJson field to Prisma schema or create dedicated shareable_links table
      await prisma.$executeRaw`
        UPDATE exports
        SET meta_json = jsonb_set(
          COALESCE(meta_json, '{}'::jsonb),
          '{shareableLinks}',
          COALESCE(meta_json->'shareableLinks', '[]'::jsonb) || 
          jsonb_build_array(jsonb_build_object(
            'id', ${shareableLink.id}::text,
            'token', ${token}::text,
            'expiresAt', ${expiresAt.toISOString()}::text,
            'createdAt', ${new Date().toISOString()}::text,
            'accessCount', 0,
            'maxAccessCount', ${options?.maxAccessCount || DEFAULT_MAX_ACCESS}
          ))
        )
        WHERE id = ${exportId}::uuid
      `;

      logger.info(`Shareable link created for export ${exportId}: ${token.substring(0, 8)}...`);

      return shareableLink;
    } catch (error: any) {
      logger.error(`Failed to create shareable link: ${error.message}`, error);
      throw error;
    }
  },

  /**
   * Get export by shareable token
   */
  getExportByToken: async (token: string): Promise<{ exportId: string; export: any } | null> => {
    try {
      // Find export with matching token using raw SQL
      // Search for token in shareableLinks array
      const exports = await prisma.$queryRaw`
        SELECT 
          e.id,
          e.type,
          e.status,
          e.created_at,
          e."modelRunId",
          e."orgId",
          e.meta_json
        FROM exports e
        WHERE e.status = 'completed'
        AND e.meta_json IS NOT NULL
        AND EXISTS (
          SELECT 1 
          FROM jsonb_array_elements(e.meta_json->'shareableLinks') AS link
          WHERE link->>'token' = ${token}::text
        )
      ` as any[];

      if (exports.length === 0) {
        return null;
      }

      // Find the specific link
      for (const exportRecord of exports) {
        let metadata: any = {};
        try {
          metadata = typeof exportRecord.meta_json === 'string' 
            ? JSON.parse(exportRecord.meta_json) 
            : (exportRecord.meta_json || {});
        } catch {
          metadata = {};
        }
        const shareableLinks = (metadata.shareableLinks || []) as any[];
        
        for (const link of shareableLinks) {
          if (link.token === token) {
            // Check expiry
            const expiresAt = new Date(link.expiresAt);
            if (new Date() > expiresAt) {
              logger.warn(`Shareable link expired: ${token.substring(0, 8)}...`);
              return null;
            }

            // Check access count
            if (link.maxAccessCount && link.accessCount >= link.maxAccessCount) {
              logger.warn(`Shareable link max access reached: ${token.substring(0, 8)}...`);
              return null;
            }

            // Increment access count
            link.accessCount = (link.accessCount || 0) + 1;
            await prisma.$executeRaw`
              UPDATE exports
              SET meta_json = jsonb_set(
                meta_json,
                '{shareableLinks}',
                (
                  SELECT jsonb_agg(
                    CASE 
                      WHEN link->>'token' = ${token}::text
                      THEN jsonb_set(link, '{accessCount}', to_jsonb(${link.accessCount}::int))
                      ELSE link
                    END
                  )
                  FROM jsonb_array_elements(meta_json->'shareableLinks') AS link
                )
              )
              WHERE id = ${exportRecord.id}::uuid
            `;

            // Get full export record
            const fullExport = await prisma.export.findUnique({
              where: { id: exportRecord.id },
              include: {
                modelRun: {
                  select: {
                    orgId: true,
                    summaryJson: true,
                  },
                },
              },
            }) as any;

            return {
              exportId: exportRecord.id,
              export: fullExport || exportRecord,
            };
          }
        }
      }

      return null;
    } catch (error: any) {
      logger.error(`Failed to get export by token: ${error.message}`, error);
      return null;
    }
  },

  /**
   * Revoke a shareable link
   */
  revokeShareableLink: async (exportId: string, token: string, userId: string): Promise<void> => {
    try {
      // Verify user has access
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
        throw new Error('Export not found');
      }

      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId,
            orgId: exportRecord.orgId,
          },
        },
      });

      if (!role) {
        throw new Error('No access to this export');
      }

      // Remove token from shareable links using raw SQL
      await prisma.$executeRaw`
        UPDATE exports
        SET meta_json = jsonb_set(
          meta_json,
          '{shareableLinks}',
          (
            SELECT jsonb_agg(link)
            FROM jsonb_array_elements(meta_json->'shareableLinks') AS link
            WHERE link->>'token' != ${token}::text
          )
        )
        WHERE id = ${exportId}::uuid
      `;

      logger.info(`Shareable link revoked: ${token.substring(0, 8)}...`);
    } catch (error: any) {
      logger.error(`Failed to revoke shareable link: ${error.message}`, error);
      throw error;
    }
  },

  /**
   * List all shareable links for an export
   */
  listShareableLinks: async (
    exportId: string,
    userId: string
  ): Promise<ShareableLink[]> => {
    try {
      // Verify user has access
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
        throw new Error('Export not found');
      }

      const role = await prisma.userOrgRole.findUnique({
        where: {
          userId_orgId: {
            userId,
            orgId: exportRecord.orgId,
          },
        },
      });

      if (!role) {
        throw new Error('No access to this export');
      }

      // Get shareable links from meta_json using raw query
      const result = await prisma.$queryRaw`
        SELECT meta_json->'shareableLinks' as shareable_links
        FROM exports
        WHERE id = ${exportId}::uuid
      ` as any[];
      
      if (result.length === 0 || !result[0].shareable_links) {
        return [];
      }
      
      let shareableLinks = result[0].shareable_links;
      if (typeof shareableLinks === 'string') {
        try {
          shareableLinks = JSON.parse(shareableLinks);
        } catch {
          shareableLinks = [];
        }
      }
      
      if (!Array.isArray(shareableLinks)) {
        shareableLinks = [];
      }

      return shareableLinks.map((link: any) => ({
        id: link.id || crypto.randomUUID(),
        exportId,
        token: link.token,
        expiresAt: new Date(link.expiresAt),
        createdAt: new Date(link.createdAt),
        accessCount: link.accessCount || 0,
        maxAccessCount: link.maxAccessCount,
      }));
    } catch (error: any) {
      logger.error(`Failed to list shareable links: ${error.message}`, error);
      throw error;
    }
  },
};

