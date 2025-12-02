import prisma from '../config/database';
import { InvitationToken } from '@prisma/client';
import crypto from 'crypto';

export const inviteRepository = {
  findByToken: async (token: string): Promise<InvitationToken | null> => {
    return await prisma.invitationToken.findUnique({
      where: { token },
      include: { org: true },
    });
  },

  create: async (data: {
    orgId: string;
    email: string;
    role: string;
    expiresAt: Date;
    createdById?: string;
  }): Promise<InvitationToken> => {
    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');

    return await prisma.invitationToken.create({
      data: {
        ...data,
        token,
      },
    });
  },

  markAsUsed: async (tokenId: string): Promise<void> => {
    await prisma.invitationToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  },

  findByEmail: async (email: string, orgId: string): Promise<InvitationToken | null> => {
    return await prisma.invitationToken.findFirst({
      where: {
        email,
        orgId,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },
};


