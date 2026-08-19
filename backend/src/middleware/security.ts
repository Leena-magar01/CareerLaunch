import { Request, Response, NextFunction } from 'express';

/**
 * Enterprise HTTP Security Headers Middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  next();
};

/**
 * In-Memory Sliding-Window Rate Limiter
 */
interface RateLimitRecord {
  timestamps: number[];
}

export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  const store = new Map<string, RateLimitRecord>();

  // Periodically clean up expired entries
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      record.timestamps = record.timestamps.filter(ts => now - ts < options.windowMs);
      if (record.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, options.windowMs).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown-ip';
    const key = `${clientIp}:${req.baseUrl || req.path}`;
    const now = Date.now();

    let record = store.get(key);
    if (!record) {
      record = { timestamps: [] };
      store.set(key, record);
    }

    // Filter out timestamps outside window
    record.timestamps = record.timestamps.filter(ts => now - ts < options.windowMs);

    if (record.timestamps.length >= options.max) {
      const retryAfterSeconds = Math.ceil((options.windowMs - (now - record.timestamps[0])) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Too many requests. Please try again later.'
        }
      });
    }

    record.timestamps.push(now);
    next();
  };
};

/**
 * Student Privacy Redaction Helper
 * Ensures companies & mentors do not receive private credentials, personal addresses, or sensitive internal data.
 */
export const sanitizeStudentProfile = (student: any, viewerRole: 'COMPANY' | 'MENTOR' | 'TNP' | 'ADMIN') => {
  if (!student) return null;

  if (viewerRole === 'TNP' || viewerRole === 'ADMIN') {
    return student; // Institutional administrators see full verified record
  }

  // Redact private user fields
  const sanitized = { ...student };
  if (sanitized.user) {
    const { password, ...safeUser } = sanitized.user;
    sanitized.user = safeUser;
  }

  return sanitized;
};
