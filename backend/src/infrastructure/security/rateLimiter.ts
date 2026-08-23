// Rate limiting middleware
import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests, please try again later.',
  skipSuccessfulRequests: false,
};

// In-memory store (use Redis for production multi-instance)
export interface RateLimitStore { increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }>; }
export class LocalRateLimitStore implements RateLimitStore { private counts = new Map<string, { count: number; resetTime: number }>(); async increment(key:string,windowMs:number){const now=Date.now();const record=this.counts.get(key);if(!record||now>record.resetTime){const next={count:1,resetTime:now+windowMs};this.counts.set(key,next);return next;}record.count++;return record;} }
const defaultStore = new LocalRateLimitStore();

export function createRateLimiter(config: Partial<RateLimitConfig> = {}, store: RateLimitStore = defaultStore) {
  const mergedConfig = { ...defaultConfig, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    const record = await store.increment(clientIp, mergedConfig.windowMs);

    if (record.count > mergedConfig.max) {
      return res.status(429).json({
        success: false,
        message: mergedConfig.message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    next();
  };
}
