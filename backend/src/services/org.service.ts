import { orgRepository } from '../repositories/org.repository';
import { inviteRepository } from '../repositories/invite.repository';
import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors';
import prisma from '../config/database';

export const orgService = {
  getOrg: async (orgId: string, userId: string) => {
    // Verify user has access to org
    const role = await orgRepository.getUserRole(userId, orgId);
    if (!role) {
      throw new ForbiddenError('No access to this organization');
    }

    const org = await orgRepository.findById(orgId);
    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    return org;
  },

  inviteUser: async (
    orgId: string,
    email: string,
    role: string,
    createdById: string
  ) => {
    // Validate role
    if (!['admin', 'finance', 'viewer'].includes(role)) {
      throw new ValidationError('Invalid role. Must be admin, finance, or viewer');
    }

    // Verify inviter has admin access
    const inviterRole = await orgRepository.getUserRole(createdById, orgId);
    if (!inviterRole || inviterRole.role !== 'admin') {
      throw new ForbiddenError('Only admins can invite users');
    }

    // Check if user already has access
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const existingRole = await orgRepository.getUserRole(existingUser.id, orgId);
      if (existingRole) {
        throw new ValidationError('User already has access to this organization');
      }
    }

    // Check for existing valid invitation
    const existingInvite = await inviteRepository.findByEmail(email, orgId);
    if (existingInvite) {
      throw new ValidationError('An active invitation already exists for this email');
    }

    // Create invitation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const invitation = await inviteRepository.create({
      orgId,
      email,
      role,
      expiresAt,
      createdById,
    });

    // Generate shareable link (frontend will construct the full URL)
    const inviteLink = `/auth/accept-invite?token=${invitation.token}`;

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
      token: invitation.token,
      inviteLink,
    };
  },

  updateUserRole: async (
    orgId: string,
    userId: string,
    newRole: string,
    updaterId: string
  ) => {
    // Validate role
    if (!['admin', 'finance', 'viewer'].includes(newRole)) {
      throw new ValidationError('Invalid role');
    }

    // Verify updater has admin access
    const updaterRole = await orgRepository.getUserRole(updaterId, orgId);
    if (!updaterRole || updaterRole.role !== 'admin') {
      throw new ForbiddenError('Only admins can update roles');
    }

    // Update role
    const updated = await prisma.userOrgRole.update({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
      data: { role: newRole },
    });

    return updated;
  },

  /**
   * List access requests for an organization (admin only)
   */
  listAccessRequests: async (orgId: string, userId: string, status?: string) => {
    // Verify user has admin access
    const userRole = await orgRepository.getUserRole(userId, orgId);
    if (!userRole || userRole.role !== 'admin') {
      throw new ForbiddenError('Only admins can view access requests');
    }

    const where: any = { orgId };
    if (status) {
      where.status = status;
    }

    // Check if accessRequest model exists in Prisma client
    if (!prisma.accessRequest) {
      // Fallback: return empty array if model doesn't exist (Prisma client not regenerated)
      console.warn('prisma.accessRequest not available - Prisma client may need regeneration');
      return [];
    }

    try {
      const requests = await prisma.accessRequest.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return requests;
    } catch (error: any) {
      // If model doesn't exist in database or Prisma client, return empty array
      if (error.message?.includes('accessRequest') || error.message?.includes('access_requests')) {
        console.warn('AccessRequest model not available:', error.message);
        return [];
      }
      throw error;
    }
  },

  /**
   * Approve access request and create user/role
   */
  approveAccessRequest: async (orgId: string, requestId: string, reviewerId: string, role: string = 'viewer') => {
    // Verify reviewer has admin access
    const reviewerRole = await orgRepository.getUserRole(reviewerId, orgId);
    if (!reviewerRole || reviewerRole.role !== 'admin') {
      throw new ForbiddenError('Only admins can approve access requests');
    }

    // Validate role
    if (!['admin', 'finance', 'viewer'].includes(role)) {
      throw new ValidationError('Invalid role. Must be admin, finance, or viewer');
    }

    // Check if accessRequest model exists
    if (!prisma.accessRequest) {
      throw new NotFoundError('Access request feature not available - Prisma client needs regeneration');
    }

    // Get access request
    const request = await prisma.accessRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundError('Access request not found');
    }

    if (request.orgId !== orgId) {
      throw new ForbiddenError('Access request does not belong to this organization');
    }

    if (request.status !== 'pending') {
      throw new ValidationError(`Access request is already ${request.status}`);
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: request.email },
    });

    if (!user) {
      // User doesn't exist yet - they need to sign up first
      // For now, mark request as approved but user must sign up
      await prisma.accessRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          reviewedAt: new Date(),
          reviewedBy: reviewerId,
          message: `Approved. User can now sign up with email ${request.email} and will be automatically added to the organization.`,
        },
      });

      return {
        message: 'Access request approved. User must sign up to complete the process.',
        email: request.email,
        role,
      };
    }

    // User exists - add them to org
    const existingRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId: user.id,
          orgId,
        },
      },
    });

    if (existingRole) {
      throw new ValidationError('User is already a member of this organization');
    }

    // Create role and update request
    await prisma.$transaction(async (tx) => {
      await tx.userOrgRole.create({
        data: {
          userId: user.id,
          orgId,
          role,
        },
      });

      await tx.accessRequest.update({
        where: { id: requestId },
        data: {
          status: 'approved',
          reviewedAt: new Date(),
          reviewedBy: reviewerId,
        },
      });
    });

    return {
      message: 'Access request approved. User has been added to the organization.',
      userId: user.id,
      email: user.email,
      role,
    };
  },

  /**
   * Reject access request
   */
  rejectAccessRequest: async (orgId: string, requestId: string, reviewerId: string, message?: string) => {
    // Verify reviewer has admin access
    const reviewerRole = await orgRepository.getUserRole(reviewerId, orgId);
    if (!reviewerRole || reviewerRole.role !== 'admin') {
      throw new ForbiddenError('Only admins can reject access requests');
    }

    // Check if accessRequest model exists
    if (!prisma.accessRequest) {
      throw new NotFoundError('Access request feature not available - Prisma client needs regeneration');
    }

    // Get access request
    const request = await prisma.accessRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundError('Access request not found');
    }

    if (request.orgId !== orgId) {
      throw new ForbiddenError('Access request does not belong to this organization');
    }

    if (request.status !== 'pending') {
      throw new ValidationError(`Access request is already ${request.status}`);
    }

    // Update request status
    await prisma.accessRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        message: message || 'Access request rejected by admin',
      },
    });
  },
};


