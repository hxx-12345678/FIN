import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface JWTPayload {
  userId: string;
  email: string;
  orgId?: string;
}

export const generateToken = (payload: JWTPayload): string => {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }
  try {
    return jwt.verify(token, config.jwtSecret) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '30d',
  } as jwt.SignOptions);
};

