import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected server error occurred';

  logger.error(`[API ERROR] ${req.method} ${req.originalUrl} - ${code}: ${message}`, err);

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details: err.details || []
    }
  });
};
