import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { mfaService } from '../services/mfa.service';
import prisma from '../config/database';

export const mfaController = {
  setupMFA: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await mfaService.setupMFA(req.user.id, req.user.email);
      res.json({ ok: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  verifyMFA: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { token, code } = req.body as { token?: string; code?: string };
      const verificationToken = token || code;
      const result = await mfaService.verifyAndEnableMFA(req.user.id, verificationToken);
      res.json({ ok: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  getBackupCodes: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // In a real app, you might want to re-authenticate or verify password here
      // For now, return what's in the DB if MFA is enabled
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });
      const backupCodes = JSON.parse((user as any)?.mfaBackupCodes || '[]');
      res.json({ ok: true, data: { backupCodes } });
    } catch (error) {
      next(error);
    }
  },

  enableMFA: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // This is called after verification to finalized
      res.json({ ok: true, message: 'MFA enabled' });
    } catch (error) {
      next(error);
    }
  },
};
