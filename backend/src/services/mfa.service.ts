import { generateSecret, verify, generateURI } from 'otplib';
import QRCode from 'qrcode';
import prisma from '../config/database';
import { ValidationError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export const mfaService = {
  /**
   * Setup MFA - generates secret and QR code
   */
  setupMFA: async (userId: string, email: string) => {
    const secret = generateSecret();
    const otpauth = generateURI({
      secret,
      label: email,
      issuer: 'FinaPilot',
    });
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    // Temporarily save secret to user (not enabled yet)
    await (prisma.user as any).update({
      where: { id: userId },
      data: { mfaSecret: secret },
    });

    return {
      secret,
      qrCodeUrl,
    };
  },

  /**
   * Verify MFA - checks if token is valid and enables MFA
   */
  verifyAndEnableMFA: async (userId: string, token: string) => {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      throw new ValidationError('Verification code is required');
    }

    const user = await (prisma.user as any).findUnique({
      where: { id: userId },
    });

    if (!user || !(user as any).mfaSecret) {
      throw new ValidationError('MFA setup not initiated');
    }

    const isValid = await verify({ 
      token, 
      secret: (user as any).mfaSecret 
    });
    
    if (!isValid) {
      throw new UnauthorizedError('Invalid verification code');
    }

    // Generate backup codes (store hashed versions at rest)
    const backupCodesPlain = Array.from({ length: 10 }, () =>
      crypto.randomBytes(5).toString('hex').toUpperCase()
    );

    const backupCodesHashed = backupCodesPlain.map((code) =>
      crypto.createHash('sha256').update(code).digest('hex')
    );

    // SECURITY: In a production environment, mfaSecret should be encrypted at rest 
    await (prisma.user as any).update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaBackupCodes: JSON.stringify(backupCodesHashed),
      },
    });

    return {
      success: true,
      backupCodes: backupCodesPlain,
    };
  },

  /**
   * Check if MFA is required for user
   */
  isMFARequired: async (email: string) => {
    const user = await (prisma.user as any).findUnique({
      where: { email },
      select: { mfaEnabled: true },
    });
    return !!user?.mfaEnabled;
  },

  /**
   * Verify MFA login token
   */
  verifyMFAToken: async (userId: string, token: string) => {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return false;
    }

    const user = await (prisma.user as any).findUnique({
      where: { id: userId },
    });

    if (!user || !(user as any).mfaSecret || !(user as any).mfaEnabled) {
      return true; // MFA not enabled
    }

    // Check TOTP
    const isTotpValid = await verify({ 
      token, 
      secret: (user as any).mfaSecret 
    });
    
    if (isTotpValid) return true;

    // Check backup codes
    const backupCodesHashed = JSON.parse((user as any).mfaBackupCodes || '[]');
    const tokenHash = crypto.createHash('sha256').update(token.toUpperCase()).digest('hex');
    const backupCodeIndex = backupCodesHashed.indexOf(tokenHash);
    
    if (backupCodeIndex !== -1) {
      // Remove used backup code
      backupCodesHashed.splice(backupCodeIndex, 1);
      await (prisma.user as any).update({
        where: { id: userId },
        data: { mfaBackupCodes: JSON.stringify(backupCodesHashed) },
      });
      return true;
    }

    return false;
  },
};
