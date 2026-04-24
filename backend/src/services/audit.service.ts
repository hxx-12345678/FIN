import prisma from '../config/database';
import { redact } from '../utils/redact';

export const auditService = {
  log: async (params: {
    actorUserId?: string;
    orgId?: string;
    action: string;
    objectType?: string;
    objectId?: string;
    metaJson?: any;
  }) => {
    // REDACT sensitive info before storing in audit logs (SOC 2 CC7.1)
    const redactedMeta = params.metaJson ? redact(params.metaJson) : undefined;

    const toUuid = (val?: string) => (val && val.trim() !== '' ? val : undefined);

    return await prisma.auditLog.create({
      data: {
        actorUserId: toUuid(params.actorUserId),
        orgId: toUuid(params.orgId),
        action: params.action,
        objectType: params.objectType,
        objectId: toUuid(params.objectId),
        metaJson: redactedMeta,
      },
    });
  },
};

