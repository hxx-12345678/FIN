import prisma from '../config/database';
import { Connector } from '@prisma/client';

export const connectorRepository = {
  findById: async (id: string): Promise<Connector | null> => {
    return await prisma.connector.findUnique({
      where: { id },
    });
  },

  findByOrgId: async (orgId: string): Promise<Connector[]> => {
    return await prisma.connector.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });
  },

  findByOrgAndType: async (orgId: string, type: string): Promise<Connector | null> => {
    return await prisma.connector.findFirst({
      where: {
        orgId,
        type,
      },
    });
  },

  create: async (data: {
    orgId: string;
    type: string;
    status?: string;
    configJson?: any;
    encryptedConfig?: Buffer;
  }): Promise<Connector> => {
    return await prisma.connector.create({
      data: {
        orgId: data.orgId,
        type: data.type,
        status: data.status || 'disconnected',
        configJson: data.configJson,
        encryptedConfig: data.encryptedConfig,
      },
    });
  },

  update: async (
    id: string,
    data: {
      status?: string;
      configJson?: any;
      encryptedConfig?: Buffer;
      lastSyncedAt?: Date;
    }
  ): Promise<Connector> => {
    return await prisma.connector.update({
      where: { id },
      data,
    });
  },

  upsert: async (
    orgId: string,
    type: string,
    data: {
      status?: string;
      configJson?: any;
      encryptedConfig?: Buffer;
    }
  ): Promise<Connector> => {
    // Check if connector exists
    const existing = await prisma.connector.findFirst({
      where: {
        orgId,
        type,
      },
    });

    if (existing) {
      return await prisma.connector.update({
        where: { id: existing.id },
        data: {
          status: data.status || existing.status,
          configJson: data.configJson || existing.configJson,
          encryptedConfig: data.encryptedConfig || existing.encryptedConfig,
        },
      });
    }

    return await prisma.connector.create({
      data: {
        orgId,
        type,
        status: data.status || 'auth_pending',
        configJson: data.configJson,
        encryptedConfig: data.encryptedConfig,
      },
    });
  },
};

