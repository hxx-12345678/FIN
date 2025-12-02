import prisma from '../config/database';

export const auditService = {
  log: async (params: {
    actorUserId?: string;
    orgId?: string;
    action: string;
    objectType?: string;
    objectId?: string;
    metaJson?: any;
  }) => {
    return await prisma.auditLog.create({
      data: {
        actorUserId: params.actorUserId,
        orgId: params.orgId,
        action: params.action,
        objectType: params.objectType,
        objectId: params.objectId,
        metaJson: params.metaJson,
      },
    });
  },
};

