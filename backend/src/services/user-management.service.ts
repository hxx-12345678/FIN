/**
 * User Management Service
 * Handles team members, invitations, roles, permissions, and activity logs
 */

import prisma from '../config/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { inviteRepository } from '../repositories/invite.repository';
import { auditService } from './audit.service';
import { logger } from '../utils/logger';

export interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  lastActive: Date | null;
  joinDate: Date;
  avatar?: string | null;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  invitedBy: string | null;
  invitedAt: Date;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Date;
}

export interface ActivityLogEntry {
  id: string;
  user: string;
  action: string;
  timestamp: Date;
  type: 'permission' | 'invite' | 'role' | 'login' | 'system' | 'user';
  metadata?: any;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isDefault: boolean;
  userCount: number;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export const userManagementService = {
  /**
   * Get all team members for an organization
   */
  getTeamMembers: async (orgId: string, userId: string): Promise<TeamMember[]> => {
    // Verify user has access
    const userRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!userRole) {
      throw new ForbiddenError('No access to this organization');
    }

    // Get all users in the organization
    const userRoles = await prisma.userOrgRole.findMany({
      where: { orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Get pending invitations to determine status
    const pendingInvitations = await prisma.invitationToken.findMany({
      where: {
        orgId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { email: true },
    });
    const pendingEmails = new Set(pendingInvitations.map((inv) => inv.email));

    return userRoles.map((ur) => {
      const isPending = pendingEmails.has(ur.user.email);
      const status: 'active' | 'inactive' | 'pending' = isPending
        ? 'pending'
        : ur.user.isActive
          ? 'active'
          : 'inactive';

      return {
        id: ur.user.id,
        name: ur.user.name,
        email: ur.user.email,
        role: ur.role,
        status,
        lastActive: ur.user.lastLogin,
        joinDate: ur.createdAt,
      };
    });
  },

  /**
   * Invite a user to the organization
   */
  inviteUser: async (
    orgId: string,
    email: string,
    role: string,
    invitedBy: string,
    message?: string
  ): Promise<Invitation> => {
    // Verify inviter has admin access
    const inviterRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId: invitedBy,
          orgId,
        },
      },
    });

    if (!inviterRole || !['admin', 'finance'].includes(inviterRole.role)) {
      throw new ForbiddenError('Only admins and finance users can invite members');
    }

    // Validate role
    const validRoles = ['admin', 'finance', 'viewer'];
    if (!validRoles.includes(role)) {
      throw new ValidationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    // Check if user already exists in org
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          where: { orgId },
        },
      },
    });

    if (existingUser && existingUser.roles.length > 0) {
      throw new ValidationError('User is already a member of this organization');
    }

    // Check for existing pending invitation
    const existingInvite = await inviteRepository.findByEmail(email, orgId);
    if (existingInvite) {
      throw new ValidationError('An invitation has already been sent to this email');
    }

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await inviteRepository.create({
      orgId,
      email,
      role,
      expiresAt,
      createdById: invitedBy,
    });

    // Send invitation email
    try {
      const { emailService } = await import('./email.service');
      const org = await prisma.org.findUnique({ where: { id: orgId }, select: { name: true } });
      const inviter = await prisma.user.findUnique({ 
        where: { id: invitedBy }, 
        select: { name: true, email: true } 
      });
      
      const inviterName = inviter?.name || inviter?.email || 'A team member';
      const orgName = org?.name || 'the organization';
      
      await emailService.sendInvitationEmail(
        email,
        inviterName,
        orgName,
        role,
        invitation.token,
        message // Include custom message if provided
      );
      
      logger.info(`[UserManagement] Invitation email sent to ${email}`);
    } catch (emailError) {
      // Log error but don't fail invitation creation
      logger.error(`[UserManagement] Failed to send invitation email to ${email}:`, emailError);
    }

    // Log audit event
    await auditService.log({
      actorUserId: invitedBy,
      orgId,
      action: 'user_invited',
      objectType: 'invitation',
      objectId: invitation.id,
      metaJson: { email, role },
    });

    // Get inviter name for response
    const inviter = await prisma.user.findUnique({
      where: { id: invitedBy },
      select: { name: true },
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      invitedBy: inviter?.name || null,
      invitedAt: invitation.createdAt,
      status: 'pending',
      expiresAt: invitation.expiresAt,
    };
  },

  /**
   * Get all invitations for an organization
   */
  getInvitations: async (orgId: string, userId: string): Promise<Invitation[]> => {
    // Verify user has access
    const userRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!userRole) {
      throw new ForbiddenError('No access to this organization');
    }

    const invitations = await prisma.invitationToken.findMany({
      where: { orgId },
      include: {
        createdBy: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    return invitations.map((inv) => {
      let status: 'pending' | 'accepted' | 'expired';
      if (inv.usedAt) {
        status = 'accepted';
      } else if (inv.expiresAt < now) {
        status = 'expired';
      } else {
        status = 'pending';
      }

      return {
        id: inv.id,
        email: inv.email,
        role: inv.role,
        invitedBy: inv.createdBy?.name || null,
        invitedAt: inv.createdAt,
        status,
        expiresAt: inv.expiresAt,
      };
    });
  },

  /**
   * Resend an invitation (sends email again)
   */
  resendInvitation: async (orgId: string, invitationId: string, userId: string): Promise<Invitation> => {
    // Verify user has admin access
    const userRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!userRole || !['admin', 'finance'].includes(userRole.role)) {
      throw new ForbiddenError('Only admins and finance users can resend invitations');
    }

    const invitation = await prisma.invitationToken.findUnique({
      where: { id: invitationId },
      include: {
        createdBy: {
          select: { name: true },
        },
      },
    });

    if (!invitation || invitation.orgId !== orgId) {
      throw new NotFoundError('Invitation not found');
    }

    // Create new invitation with extended expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const newInvitation = await inviteRepository.create({
      orgId,
      email: invitation.email,
      role: invitation.role,
      expiresAt,
      createdById: userId,
    });

    // Send invitation email
    try {
      const { emailService } = await import('./email.service');
      const org = await prisma.org.findUnique({ where: { id: orgId }, select: { name: true } });
      const inviter = await prisma.user.findUnique({ 
        where: { id: userId }, 
        select: { name: true, email: true } 
      });
      
      const inviterName = inviter?.name || inviter?.email || invitation.createdBy?.name || 'A team member';
      const orgName = org?.name || 'the organization';
      
      await emailService.sendInvitationEmail(
        invitation.email,
        inviterName,
        orgName,
        invitation.role,
        newInvitation.token,
        undefined // No custom message for resend
      );
      
      logger.info(`[UserManagement] Resent invitation email to ${invitation.email}`);
    } catch (emailError) {
      // Log error but don't fail resend
      logger.error(`[UserManagement] Failed to send resend invitation email to ${invitation.email}:`, emailError);
    }

    // Log audit event
    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'invitation_resent',
      objectType: 'invitation',
      objectId: newInvitation.id,
      metaJson: { email: invitation.email, originalInvitationId: invitationId },
    });

    return {
      id: newInvitation.id,
      email: newInvitation.email,
      role: newInvitation.role,
      invitedBy: invitation.createdBy?.name || null,
      invitedAt: newInvitation.createdAt,
      status: 'pending',
      expiresAt: newInvitation.expiresAt,
    };
  },

  /**
   * Cancel an invitation
   */
  cancelInvitation: async (orgId: string, invitationId: string, userId: string): Promise<void> => {
    // Verify user has admin access
    const userRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!userRole || !['admin', 'finance'].includes(userRole.role)) {
      throw new ForbiddenError('Only admins and finance users can cancel invitations');
    }

    const invitation = await prisma.invitationToken.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.orgId !== orgId) {
      throw new NotFoundError('Invitation not found');
    }

    if (invitation.usedAt) {
      throw new ValidationError('Cannot cancel an accepted invitation');
    }

    // Delete the invitation
    await prisma.invitationToken.delete({
      where: { id: invitationId },
    });

    // Log audit event
    await auditService.log({
      actorUserId: userId,
      orgId,
      action: 'invitation_cancelled',
      objectType: 'invitation',
      objectId: invitationId,
      metaJson: { email: invitation.email },
    });
  },

  /**
   * Update user role
   */
  updateUserRole: async (orgId: string, targetUserId: string, newRole: string, actorUserId: string): Promise<TeamMember> => {
    // Verify actor has admin access
    const actorRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId: actorUserId,
          orgId,
        },
      },
    });

    if (!actorRole || !['admin', 'finance'].includes(actorRole.role)) {
      throw new ForbiddenError('Only admins and finance users can update roles');
    }

    // Validate role
    const validRoles = ['admin', 'finance', 'viewer'];
    if (!validRoles.includes(newRole)) {
      throw new ValidationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    // Prevent self-demotion if only admin
    if (targetUserId === actorUserId && newRole !== 'admin') {
      const adminCount = await prisma.userOrgRole.count({
        where: {
          orgId,
          role: 'admin',
        },
      });

      if (adminCount === 1) {
        throw new ValidationError('Cannot remove the last admin from the organization');
      }
    }

    // Update role
    const updated = await prisma.userOrgRole.update({
      where: {
        userId_orgId: {
          userId: targetUserId,
          orgId,
        },
      },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
          },
        },
      },
    });

    // Log audit event
    await auditService.log({
      actorUserId,
      orgId,
      action: 'user_role_updated',
      objectType: 'user_org_role',
      objectId: updated.id,
      metaJson: { userId: targetUserId, newRole, previousRole: actorRole.role },
    });

    return {
      id: updated.user.id,
      name: updated.user.name,
      email: updated.user.email,
      role: updated.role,
      status: updated.user.isActive ? 'active' : 'inactive',
      lastActive: updated.user.lastLogin,
      joinDate: updated.createdAt,
    };
  },

  /**
   * Remove user from organization
   */
  removeUser: async (orgId: string, targetUserId: string, actorUserId: string): Promise<void> => {
    // Verify actor has admin access
    const actorRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId: actorUserId,
          orgId,
        },
      },
    });

    if (!actorRole || !['admin', 'finance'].includes(actorRole.role)) {
      throw new ForbiddenError('Only admins and finance users can remove members');
    }

    // Prevent self-removal if only admin
    if (targetUserId === actorUserId) {
      const adminCount = await prisma.userOrgRole.count({
        where: {
          orgId,
          role: 'admin',
        },
      });

      if (adminCount === 1) {
        throw new ValidationError('Cannot remove the last admin from the organization');
      }
    }

    const targetRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId: targetUserId,
          orgId,
        },
      },
    });

    if (!targetRole) {
      throw new NotFoundError('User is not a member of this organization');
    }

    // Delete the role relationship
    await prisma.userOrgRole.delete({
      where: {
        userId_orgId: {
          userId: targetUserId,
          orgId,
        },
      },
    });

    // Log audit event
    await auditService.log({
      actorUserId,
      orgId,
      action: 'user_removed',
      objectType: 'user',
      objectId: targetUserId,
      metaJson: { removedRole: targetRole.role },
    });
  },

  /**
   * Activate/Deactivate user
   */
  toggleUserStatus: async (orgId: string, targetUserId: string, isActive: boolean, actorUserId: string): Promise<TeamMember> => {
    // Verify actor has admin access
    const actorRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId: actorUserId,
          orgId,
        },
      },
    });

    if (!actorRole || !['admin', 'finance'].includes(actorRole.role)) {
      throw new ForbiddenError('Only admins and finance users can change user status');
    }

    // Update user status
    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
      include: {
        roles: {
          where: { orgId },
        },
      },
    });

    const userRole = user.roles[0];
    if (!userRole) {
      throw new NotFoundError('User is not a member of this organization');
    }

    // Log audit event
    await auditService.log({
      actorUserId,
      orgId,
      action: isActive ? 'user_activated' : 'user_deactivated',
      objectType: 'user',
      objectId: targetUserId,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: userRole.role,
      status: isActive ? 'active' : 'inactive',
      lastActive: user.lastLogin,
      joinDate: userRole.createdAt,
    };
  },

  /**
   * Get activity log for organization
   */
  getActivityLog: async (orgId: string, userId: string, limit: number = 50): Promise<ActivityLogEntry[]> => {
    // Verify user has access
    const userRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    if (!userRole) {
      throw new ForbiddenError('No access to this organization');
    }

    const logs = await prisma.auditLog.findMany({
      where: { orgId },
      include: {
        actorUser: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => {
      // Determine activity type based on action
      let type: 'permission' | 'invite' | 'role' | 'login' | 'system' | 'user' = 'system';
      if (log.action.includes('invite') || log.action.includes('invitation')) {
        type = 'invite';
      } else if (log.action.includes('role')) {
        type = 'role';
      } else if (log.action.includes('permission')) {
        type = 'permission';
      } else if (log.action.includes('login')) {
        type = 'login';
      } else if (log.action.includes('user')) {
        type = 'user';
      }

      return {
        id: log.id,
        user: log.actorUser?.name || log.actorUser?.email || 'System',
        action: log.action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        timestamp: log.createdAt,
        type,
        metadata: log.metaJson,
      };
    });
  },

  /**
   * Get roles with permissions
   */
  getRoles: async (): Promise<Role[]> => {
    // Get all roles from user_org_roles
    const roleCounts = await prisma.userOrgRole.groupBy({
      by: ['role'],
      _count: { role: true },
    });

    const roleMap = new Map<string, number>();
    roleCounts.forEach((rc) => {
      roleMap.set(rc.role, rc._count.role);
    });

    // Define default roles with permissions
    const roles: Role[] = [
      {
        id: 'admin',
        name: 'Admin',
        description: 'Manage users and access most features',
        permissions: ['read', 'write', 'export', 'user_management'],
        isDefault: true,
        userCount: roleMap.get('admin') || 0,
      },
      {
        id: 'finance',
        name: 'Editor',
        description: 'Create and edit financial models and reports',
        permissions: ['read', 'write', 'export'],
        isDefault: true,
        userCount: roleMap.get('finance') || 0,
      },
      {
        id: 'viewer',
        name: 'Viewer',
        description: 'View-only access to dashboards and reports',
        permissions: ['read'],
        isDefault: true,
        userCount: roleMap.get('viewer') || 0,
      },
    ];

    return roles;
  },

  /**
   * Get all permissions
   */
  getPermissions: async (): Promise<Permission[]> => {
    return [
      { id: 'read', name: 'Read', description: 'View dashboards, reports, and data', category: 'Access' },
      { id: 'write', name: 'Write', description: 'Create and edit financial models and reports', category: 'Access' },
      { id: 'export', name: 'Export', description: 'Export data and reports', category: 'Access' },
      { id: 'user_management', name: 'User Management', description: 'Manage team members and roles', category: 'Administration' },
      { id: 'billing', name: 'Billing', description: 'Manage billing and subscriptions', category: 'Administration' },
      { id: 'settings', name: 'Settings', description: 'Modify organization settings', category: 'Administration' },
    ];
  },

  /**
   * Update role permissions (for custom roles - not implemented yet)
   */
  updateRolePermissions: async (roleId: string, permissions: string[]): Promise<Role> => {
    // For now, we only support default roles
    // Custom roles would require a new table
    const roles = await userManagementService.getRoles();
    const role = roles.find((r) => r.id === roleId);

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (role.isDefault) {
      throw new ValidationError('Cannot modify default role permissions');
    }

    // In the future, this would update a custom role in the database
    // For now, return the role with updated permissions
    return {
      ...role,
      permissions,
    };
  },
};

