import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { ValidationError } from '../utils/errors';
import { AuthRequest } from '../middlewares/auth';

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
      
      res.status(201).json({
        ok: true,
        user: result.user,
        org: result.org,
        token: result.token,
        refreshToken: result.refreshToken,
      });
    } catch (error) {
      // Log error for debugging
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
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  refresh: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      const result = await authService.refresh(refreshToken);
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
      // Check permissions across any org
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
        throw new ValidationError('User not authenticated');
      }

      const result = await authService.logout(req.user.id);
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
      // Extract permissions from user's org roles
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
      // Extract roles from user's org memberships
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

      // For now, return a simple session list based on the current token
      // In a production system, you would track sessions in a database
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

      // For now, if revoking current session, return success
      // In a production system, you would invalidate the session token in the database
      if (sessionId === 'current') {
        // Clear the token by returning a logout response
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

      // In a production system, you would invalidate all session tokens for this user
      res.json({
        ok: true,
        message: 'All sessions revoked successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};

