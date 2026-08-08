// CSRF protection middleware
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'csrf_token';

// Store CSRF tokens in memory (use Redis for production multi-instance)
const csrfTokens = new Map<string, { token: string; expires: number }>();

function generateToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [sessionId, record] of csrfTokens.entries()) {
    if (now > record.expires) {
      csrfTokens.delete(sessionId);
    }
  }
}

// Cleanup every 10 minutes
setInterval(cleanupExpiredTokens, 10 * 60 * 1000);

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for API key auth (already authenticated)
  if (req.headers.authorization?.startsWith('Bearer')) {
    return next();
  }

  const sessionId = req.ip || 'anonymous';
  const token = req.headers[CSRF_HEADER] || (req.body && (req.body as any)._csrf);

  if (!token || typeof token !== 'string') {
    res.status(403).json({
      success: false,
      message: 'CSRF token missing or invalid',
    });
    return;
  }

  const record = csrfTokens.get(sessionId);

  if (!record || record.token !== token || Date.now() > record.expires) {
    res.status(403).json({
      success: false,
      message: 'CSRF token invalid or expired',
    });
    return;
  }

  next();
}

export function generateCsrfToken(sessionId: string): string {
  const token = generateToken();
  csrfTokens.set(sessionId, {
    token,
    expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  return token;
}

export function getCsrfTokenForClient(sessionId: string): { cookie: string; header: string } {
  const token = generateCsrfToken(sessionId);
  return {
    cookie: token,
    header: token,
  };
}