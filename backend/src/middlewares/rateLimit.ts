/**
 * RATE LIMITING MIDDLEWARE
 * Prevents abuse and ensures system stability
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per user
const RATE_LIMIT_MAX_REQUESTS_PER_ORG = 500; // 500 requests per minute per org

/**
 * Get rate limit key from request
 */
function getRateLimitKey(req: AuthRequest): string {
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  return `ip:${req.ip || 'unknown'}`;
}

/**
 * Get org rate limit key
 */
function getOrgRateLimitKey(orgId: string): string {
  return `org:${orgId}`;
}

/**
 * Check if rate limit is exceeded
 */
function checkRateLimit(key: string, maxRequests: number): boolean {
  const now = Date.now();
  const record = store[key];

  if (!record || now > record.resetTime) {
    // Reset or create new record
    store[key] = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    };
    return false; // Not exceeded
  }

  if (record.count >= maxRequests) {
    return true; // Exceeded
  }

  record.count++;
  return false; // Not exceeded
}

/**
 * Clean up old rate limit records
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

/**
 * Rate limiting middleware
 */
export const rateLimit = (maxRequests: number = RATE_LIMIT_MAX_REQUESTS) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const key = getRateLimitKey(req);
    const exceeded = checkRateLimit(key, maxRequests);

    if (exceeded) {
      return res.status(429).json({
        ok: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${maxRequests} per minute.`,
        retryAfter: Math.ceil((store[key].resetTime - Date.now()) / 1000),
      });
    }

    // Add rate limit headers
    const record = store[key];
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

    next();
  };
};

/**
 * Org-level rate limiting
 */
export const orgRateLimit = (req: AuthRequest, res: Response, next: NextFunction) => {
  const orgId = req.params.orgId || (req.body?.orgId);
  
  if (!orgId) {
    return next(); // Skip if no org ID
  }

  const key = getOrgRateLimitKey(orgId);
  const exceeded = checkRateLimit(key, RATE_LIMIT_MAX_REQUESTS_PER_ORG);

  if (exceeded) {
    return res.status(429).json({
      ok: false,
      error: 'Organization rate limit exceeded',
      message: `Too many requests for this organization. Limit: ${RATE_LIMIT_MAX_REQUESTS_PER_ORG} per minute.`,
      retryAfter: Math.ceil((store[key].resetTime - Date.now()) / 1000),
    });
  }

  next();
};

