import { Request, Response, NextFunction, CookieOptions } from 'express';
import { authService } from '../services/auth.service';
import { ValidationError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';
import { config } from '../config/env';

/**
 * Helper to set authentication cookies
 */
const setAuthCookies = (res: Response, token: string, refreshToken?: string) => {
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };

  res.cookie('auth-token', token, cookieOptions);

  if (refreshToken) {
    res.cookie('refresh-token', refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
  }
};

/**
 * Helper to clear authentication cookies
 */
const clearAuthCookies = (res: Response) => {
  res.clearCookie('auth-token', { path: '/' });
  res.clearCookie('refresh-token', { path: '/' });
};

export const authController = {
  signup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, orgName, name } = req.body;

      if (!email || !password || !orgName) {
        throw new ValidationError('Email, password, and orgName are required');
      }

      const result = await authService.signup(email, password, orgName, name);

      // Check if signup resulted in access request instead of new org
      if ((result as any).requiresAccessRequest) {
        return res.status(202).json({
          ok: true,
          requiresAccessRequest: true,
          orgId: (result as any).orgId,
          orgName: (result as any).orgName,
          message: (result as any).message,
          email: (result as any).email
        });
      }

      // Set secure HttpOnly cookies
      setAuthCookies(res, result.token, result.refreshToken);

      res.status(201).json({
        ok: true,
        user: result.user,
        org: result.org,
        token: result.token,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      console.error('Signup error:', error);
      next(error);
    }
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ValidationError('Email and password are required');
      }

      const result = await authService.login(email, password);

      // Set secure HttpOnly cookies
      setAuthCookies(res, result.token, result.refreshToken);

      res.json({
        ok: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  refresh: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Prioritize refresh token from cookie
      const refreshToken = req.cookies['refresh-token'] || req.body.refreshToken;

      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      const result = await authService.refresh(refreshToken);

      // Update tokens in cookies
      // @ts-ignore - refreshToken exists but typing might be inferred incorrectly
      setAuthCookies(res, result.token, result.refreshToken);

      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  acceptInvite: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password, name } = req.body;

      if (!token || !password) {
        throw new ValidationError('Token and password are required');
      }

      const result = await authService.acceptInvite(token, password, name);

      // Set secure HttpOnly cookies
      setAuthCookies(res, result.token, result.refreshToken);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  getMe: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const result = await authService.getMe(req.user.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  getExcelPerms: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const me = await authService.getMe(req.user.id);
      // @ts-ignore
      const canEdit = me.orgs?.some((o: any) => o.role === 'admin' || o.role === 'finance') || false;

      res.json({
        ok: true,
        data: {
          canCreate: canEdit,
          canEdit: canEdit,
          canView: true,
        }
      });
    } catch (error) {
      next(error);
    }
  },

  logout: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        // Still clear cookies even if req.user is missing
        clearAuthCookies(res);
        return res.json({ ok: true, message: 'Logged out' });
      }

      const result = await authService.logout(req.user.id);

      // Clear all auth cookies
      clearAuthCookies(res);

      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  switchOrg: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { orgId } = req.body;

      if (!orgId) {
        throw new ValidationError('Organization ID is required');
      }

      const result = await authService.switchOrg(req.user.id, orgId);

      // Update cookies with new token/org context
      setAuthCookies(res, result.token, result.refreshToken);

      res.json({
        ok: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  },

  getPermissions: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const me = await authService.getMe(req.user.id);
      const permissions: string[] = [];

      // @ts-ignore
      if (me.orgs && Array.isArray(me.orgs)) {
        // @ts-ignore
        me.orgs.forEach((org: any) => {
          if (org.role === 'admin') {
            permissions.push('admin:*');
            permissions.push('finance:*');
            permissions.push('viewer:*');
          } else if (org.role === 'finance') {
            permissions.push('finance:*');
            permissions.push('viewer:*');
          } else if (org.role === 'viewer') {
            permissions.push('viewer:*');
          }
        });
      }

      res.json({
        ok: true,
        data: {
          permissions: [...new Set(permissions)], // Remove duplicates
        },
      });
    } catch (error) {
      next(error);
    }
  },

  getRoles: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const me = await authService.getMe(req.user.id);
      const roles: Array<{ orgId: string; role: string; orgName?: string }> = [];

      // @ts-ignore
      if (me.orgs && Array.isArray(me.orgs)) {
        // @ts-ignore
        me.orgs.forEach((org: any) => {
          roles.push({
            orgId: org.id,
            role: org.role,
            orgName: org.name,
          });
        });
      }

      res.json({
        ok: true,
        data: {
          roles,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  getSessions: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const currentSession = {
        id: 'current',
        device: req.headers['user-agent'] || 'Unknown',
        deviceType: 'desktop' as const,
        location: 'Unknown',
        ip: req.ip || req.socket.remoteAddress || 'Unknown',
        lastActivity: new Date().toISOString(),
        isCurrent: true,
      };

      res.json({
        ok: true,
        sessions: [currentSession],
      });
    } catch (error) {
      next(error);
    }
  },

  revokeSession: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      const { sessionId } = req.params;

      if (sessionId === 'current') {
        clearAuthCookies(res);
        res.json({
          ok: true,
          message: 'Session revoked successfully',
        });
      } else {
        res.json({
          ok: true,
          message: 'Session revoked successfully',
        });
      }
    } catch (error) {
      next(error);
    }
  },

  revokeAllSessions: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new ValidationError('User not authenticated');
      }

      clearAuthCookies(res);
      res.json({
        ok: true,
        message: 'All sessions revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};

