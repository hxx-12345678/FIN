import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  user?: JWTPayload & { id: string };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Priority: 1. HttpOnly Cookie, 2. Authorization Header
    let token = req.cookies['auth-token'];

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token || token.trim().length === 0) {
      throw new UnauthorizedError('Authentication token missing');
    }

    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('[Auth] JWT_SECRET is not configured');
      throw new UnauthorizedError('Server configuration error');
    }

    let payload: JWTPayload;
    try {
      payload = verifyToken(token);
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Token verification failed';
      console.warn('[Auth] Authentication failed:', errorMessage);
      throw new UnauthorizedError(errorMessage.includes('expired') ? 'Token expired' : 'Invalid or expired token');
    }

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, isActive: true },
    });

    if (!user) {
      console.error('[Auth] User not found:', payload.userId);
      throw new UnauthorizedError('User not found');
    }

    if (!user.isActive) {
      console.error('[Auth] User is inactive:', payload.userId);
      throw new UnauthorizedError('User account is inactive');
    }

    req.user = {
      ...payload,
      id: user.id,
    };

    next();
  } catch (error) {
    // If it's already an UnauthorizedError, pass it through
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      // Log unexpected errors for debugging
      console.error('[Auth] Unexpected error:', error);
      next(new UnauthorizedError('Authentication failed'));
    }
  }
};

