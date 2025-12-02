import prisma from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import * as crypto from 'crypto';
import { auditService } from './audit.service';

export interface CreateShareTokenParams {
  expiresInDays?: number;
  scope?: string;
}

export const shareTokenService = {
  createShareToken: async (
    orgId: string,
    userId: string,
    params: CreateShareTokenParams
  ) => {
    // Verify user access (admin only)
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!role || role.role !== 'admin') {
      throw new ForbiddenError('Only admins can create share tokens');
    }

    // Generate unique token
    const token = `st_${crypto.randomBytes(32).toString('hex')}`;

    // Calculate expiration
    const expiresAt = params.expiresInDays
      ? new Date(Date.now() + params.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Create share token
    const shareToken = await prisma.shareToken.create({
      data: {
        orgId,
        token,
        expiresAt,
        scope: params.scope || 'read-only',
        createdById: userId,
      },
    });

    // Log audit event
    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'share_token_created',
      objectType: 'share_token',
      objectId: shareToken.id,
      metaJson: {
        scope: params.scope,
        expiresInDays: params.expiresInDays,
      },
    });

    return shareToken;
  },

  listShareTokens: async (orgId: string, userId: string) => {
    // Verify user access
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!role || !['admin', 'finance'].includes(role.role)) {
      throw new ForbiddenError('Only admins and finance users can list share tokens');
    }

    const tokens = await prisma.shareToken.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return tokens;
  },

  revokeShareToken: async (tokenId: string, userId: string) => {
    const token = await prisma.shareToken.findUnique({
      where: { id: tokenId },
    });

    if (!token) {
      throw new NotFoundError('Share token not found');
    }

    // Verify user access (admin only)
    const role = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId: token.orgId,
        },
      },
    });

    if (!role || role.role !== 'admin') {
      throw new ForbiddenError('Only admins can revoke share tokens');
    }

    await prisma.shareToken.delete({
      where: { id: tokenId },
    });

    // Log audit event
    await auditService.log({
      actorUserId: userId,
      orgId: token.orgId,
      action: 'share_token_revoked',
      objectType: 'share_token',
      objectId: tokenId,
    });
  },

  getSharedData: async (token: string, type?: string) => {
    // Find share token
    const shareToken = await prisma.shareToken.findUnique({
      where: { token },
    });

    if (!shareToken) {
      throw new NotFoundError('Share token not found');
    }

    // Check expiration
    if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
      throw new ForbiddenError('Share token has expired');
    }

    // Get org data based on type
    const org = await prisma.org.findUnique({
      where: { id: shareToken.orgId },
      select: {
        id: true,
        name: true,
        currency: true,
      },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    // Return read-only data based on type
    if (type === 'models') {
      const models = await prisma.model.findMany({
        where: { orgId: shareToken.orgId },
        select: {
          id: true,
          name: true,
          version: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return {
        org: {
          id: org.id,
          name: org.name,
          currency: org.currency,
        },
        models,
      };
    }

    if (type === 'modelRuns') {
      const runs = await prisma.modelRun.findMany({
        where: {
          orgId: shareToken.orgId,
          status: 'done',
        },
        select: {
          id: true,
          runType: true,
          summaryJson: true,
          createdAt: true,
          finishedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return {
        org: {
          id: org.id,
          name: org.name,
          currency: org.currency,
        },
        modelRuns: runs,
      };
    }

    // Default: return org summary
    return {
      org: {
        id: org.id,
        name: org.name,
        currency: org.currency,
      },
      message: 'Use ?type=models or ?type=modelRuns to get specific data',
    };
  },
};

