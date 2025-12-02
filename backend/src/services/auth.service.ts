import { userRepository } from '../repositories/user.repository';
import { orgRepository } from '../repositories/org.repository';
import { hashPassword, comparePassword } from '../utils/bcrypt';
import { generateToken, generateRefreshToken, verifyToken } from '../utils/jwt';
import { ValidationError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { validateEmail, validatePassword, validateOrgName, sanitizeString } from '../utils/validation';
import prisma from '../config/database';

export const authService = {
  signup: async (email: string, password: string, orgName: string, name?: string) => {
    // Validate inputs with proper validation
    validateEmail(email);
    validatePassword(password);
    validateOrgName(orgName);

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.trim().toLowerCase();

    // Sanitize optional name
    const sanitizedName = name ? sanitizeString(name, 255) : undefined;

    // Check if user already exists (use normalized email)
    const existing = await userRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new ValidationError('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user, org, and role in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: sanitizedName,
          passwordHash,
        },
      });

      // Create org
      const org = await tx.org.create({
        data: {
          name: sanitizeString(orgName.trim(), 255),
        },
      });

      // Create admin role
      await tx.userOrgRole.create({
        data: {
          userId: user.id,
          orgId: org.id,
          role: 'admin',
        },
      });

      return { user, org };
    });

    // Generate tokens
    const token = generateToken({ 
      userId: result.user.id, 
      email: result.user.email,
      orgId: result.org.id,
    });
    const refreshToken = generateRefreshToken({ 
      userId: result.user.id, 
      email: result.user.email,
      orgId: result.org.id,
    });

    return { 
      user: result.user, 
      org: result.org,
      token, 
      refreshToken 
    };
  },

  login: async (email: string, password: string) => {
    // Validate email format
    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email is required');
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Update last login
    await userRepository.updateLastLogin(user.id);

    // Get user's primary org (first org they belong to)
    const userRole = await prisma.userOrgRole.findFirst({
      where: { userId: user.id },
      include: { org: true },
    });

    const orgId = userRole?.orgId;

    // Generate tokens
    const token = generateToken({ 
      userId: user.id, 
      email: user.email,
      orgId: orgId,
    });
    const refreshToken = generateRefreshToken({ 
      userId: user.id, 
      email: user.email,
      orgId: orgId,
    });

    return { user, token, refreshToken };
  },

  refresh: async (refreshToken: string) => {
    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    try {
      // Verify refresh token
      const payload = verifyToken(refreshToken);

      // Verify user still exists and is active
      const user = await userRepository.findById(payload.userId);
      if (!user || !user.isActive) {
        throw new UnauthorizedError('User not found or inactive');
      }

      // Get user's primary org
      const userRole = await prisma.userOrgRole.findFirst({
        where: { userId: user.id },
      });

      // Generate new access token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        orgId: userRole?.orgId || payload.orgId,
      });

      return { token };
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  },

  acceptInvite: async (token: string, password: string, name?: string) => {
    if (!token || !password) {
      throw new ValidationError('Token and password are required');
    }

    // Find invitation
    const invitation = await prisma.invitationToken.findUnique({
      where: { token },
      include: { org: true },
    });

    if (!invitation) {
      throw new NotFoundError('Invalid invitation token');
    }

    if (invitation.usedAt) {
      throw new ValidationError('Invitation has already been used');
    }

    if (invitation.expiresAt < new Date()) {
      throw new ValidationError('Invitation has expired');
    }

    // Check if user already exists
    let user = await userRepository.findByEmail(invitation.email);
    
    if (!user) {
      // Create new user
      const passwordHash = await hashPassword(password);
      user = await userRepository.create({
        email: invitation.email,
        name,
        passwordHash,
      });
    } else {
      // User exists, verify password
      const isValid = await comparePassword(password, user.passwordHash);
      if (!isValid) {
        throw new UnauthorizedError('Invalid password for existing account');
      }
    }

    // Check if user already has role in this org
    const existingRole = await prisma.userOrgRole.findUnique({
      where: {
        userId_orgId: {
          userId: user.id,
          orgId: invitation.orgId,
        },
      },
    });

    if (!existingRole) {
      // Create role
      await prisma.userOrgRole.create({
        data: {
          userId: user.id,
          orgId: invitation.orgId,
          role: invitation.role,
        },
      });
    }

    // Mark invitation as used
    await prisma.invitationToken.update({
      where: { id: invitation.id },
      data: { usedAt: new Date() },
    });

    // Generate tokens
    const accessToken = generateToken({
      userId: user.id,
      email: user.email,
      orgId: invitation.orgId,
    });
    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      orgId: invitation.orgId,
    });

    return {
      user,
      org: invitation.org,
      token: accessToken,
      refreshToken,
    };
  },

  getMe: async (userId: string) => {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Get all user roles with orgs
    const roles = await prisma.userOrgRole.findMany({
      where: { userId },
      include: { 
        org: {
          select: {
            id: true,
            name: true,
            timezone: true,
            currency: true,
            planTier: true,
            dataRegion: true,
            createdAt: true,
          },
        },
      },
    });

    // Format response
    const orgs = roles.map((role) => ({
      id: role.org.id,
      name: role.org.name,
      timezone: role.org.timezone,
      currency: role.org.currency,
      planTier: role.org.planTier,
      dataRegion: role.org.dataRegion,
      role: role.role,
      createdAt: role.org.createdAt,
    }));

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      orgs,
    };
  },

  logout: async (userId: string) => {
    // Logout is primarily handled client-side by clearing tokens
    // This endpoint can be used for server-side cleanup if needed
    // For now, we just return success
    // In the future, we could invalidate refresh tokens here if we track them
    return { success: true, message: 'Logged out successfully' };
  },
};

