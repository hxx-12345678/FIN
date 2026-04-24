import prisma from '../config/database';
import { ForbiddenError, NotFoundError } from '../utils/errors';

// Type assertion for Prisma models that may not be in generated types yet
const prismaClient = prisma as any;

/**
 * Derive a human-readable file name from a sourceRef path.
 * sourceRef can be:
 *   - uploads/{orgId}/{uuid}.csv  → extract UUID basename
 *   - A connector name like 'quickbooks' or 'stripe'
 */
function deriveFileName(sourceRef: string | null, sourceType: string): string {
  if (!sourceRef) return `${sourceType || 'import'} import`;
  // If it looks like an S3/upload path, use the last segment  
  const parts = sourceRef.split('/');
  const last = parts[parts.length - 1];
  // If it has a known file extension, strip it for display
  const stripped = last.replace(/\.(csv|xlsx|xls|json)$/i, '');
  // If it looks like a UUID, label it nicely with source type
  const isUuid = /^[0-9a-f-]{32,36}$/i.test(stripped);
  if (isUuid) {
    return `${sourceType?.toUpperCase() || 'CSV'} Import – ${new Date().toLocaleDateString()}`;
  }
  return stripped || sourceRef;
}

export const dataImportService = {
  listBatches: async (orgId: string, userId: string) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
      select: { role: true },
    });
    if (!role || !['admin', 'finance', 'owner'].includes(role.role)) {
      throw new ForbiddenError('Only admins and finance users can view import batches');
    }

    const batches = await prismaClient.dataImportBatch.findMany({
      where: {
        orgId,
        // Exclude batches that have been explicitly deleted via Manage Files
        NOT: { status: 'deleted' },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        sourceType: true,
        sourceRef: true,
        fileHash: true,
        status: true,
        statsJson: true,
        createdByUserId: true,
        createdAt: true,
      },
    });

    // Add computed fileName so the frontend renders a human-readable label
    return batches.map((batch: any) => ({
      ...batch,
      fileName: deriveFileName(batch.sourceRef, batch.sourceType),
    }));
  },

  getBatch: async (orgId: string, batchId: string, userId: string) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
      select: { role: true },
    });
    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    const batch = await prismaClient.dataImportBatch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        orgId: true,
        sourceType: true,
        sourceRef: true,
        fileHash: true,
        mappingJson: true,
        statsJson: true,
        status: true,
        createdByUserId: true,
        createdAt: true,
      },
    });

    if (!batch || batch.orgId !== orgId) {
      throw new NotFoundError('Import batch not found');
    }

    return {
      ...batch,
      fileName: deriveFileName(batch.sourceRef, batch.sourceType),
    };
  },
};



