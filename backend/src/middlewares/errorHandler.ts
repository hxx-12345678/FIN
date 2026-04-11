import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Determine status code for logging
  let statusCode = 500;
  if (err instanceof AppError) {
    statusCode = err.statusCode;
  } else if (err instanceof SyntaxError && (err as any).status === 400) {
    statusCode = 400;
  } else if (err.name === 'PrismaClientKnownRequestError') {
    statusCode = 400; // Most known Prisma errors in this app are bad requests or not found
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
  }

  if (statusCode >= 500) {
    logger.error('System failure occurred:', {
      message: err.message,
      path: req.path,
      method: req.method,
      statusCode,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  } else {
    // Audit-level warning for client errors
    logger.warn('Client request handling:', {
      message: err.message,
      path: req.path,
      method: req.method,
      statusCode,
    });
  }

  // Handle SyntaxError (usually from express.json() for invalid JSON)
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid JSON payload',
      },
    });
  }

  // Handle known AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      ok: false,
      error: {
        code: err.constructor.name,
        message: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      },
    });
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        ok: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'A record with this value already exists',
        },
      });
    }
    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Record not found',
        },
      });
    }
    if (prismaError.code === 'P2023') {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_UUID',
          message: 'Invalid UUID format provided',
        },
      });
    }
  }

  // Handle Prisma validation errors (like invalid UUIDs that Prisma catches)
  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid data format provided to database',
      },
    });
  }

  // Handle validation errors (e.g., from express-validator or our ValidationError)
  if (err.name === 'ValidationError' || err instanceof ValidationError || (err as any).errors) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: (err as any).errors,
      },
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      ok: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      },
    });
  }

  // Default error response
  res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

