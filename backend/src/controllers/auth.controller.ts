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
};

