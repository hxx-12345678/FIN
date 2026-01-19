import prisma from '../config/database';
import { ForbiddenError, NotFoundError } from '../utils/errors';

// Type assertion for Prisma models that may not be in generated types yet
const prismaClient = prisma as any;

export const dataImportService = {
  listBatches: async (orgId: string, userId: string) => {
    const role = await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
      select: { role: true },
    });
    if (!role || !['admin', 'finance'].includes(role.role)) {
      throw new ForbiddenError('Only admins and finance users can view import batches');
    }

    return prismaClient.dataImportBatch.findMany({
      where: { orgId },
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

    return batch;
  },
};



