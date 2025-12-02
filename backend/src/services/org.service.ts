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
};


