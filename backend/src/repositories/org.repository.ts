import prisma from '../config/database';
import { Org } from '@prisma/client';

export const orgRepository = {
  findById: async (id: string): Promise<Org | null> => {
    return await prisma.org.findUnique({ where: { id } });
  },

  create: async (data: { name: string; timezone?: string; currency?: string }) => {
    return await prisma.org.create({ data });
  },

  getUserRole: async (userId: string, orgId: string) => {
    return await prisma.userOrgRole.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
  },
};

