// Authentication and project-scoped authorization middleware
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'node:crypto';
import { AppError } from './ErrorHandler';
import { ERROR_CODES } from '../../shared/ApiResponse';
import { getAuthConfig } from '../../config';

export interface AuthContext {
  subject: string;
  /** Project ids the caller may access, or '*' for all projects (API key). */
  projectIds: string[] | '*';
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  const apiKey = req.headers['x-api-key'];
  if (typeof apiKey === 'string' && apiKey.length > 0) {
    return apiKey;
  }
  const queryToken = req.query?.token;
  if (typeof queryToken === 'string' && queryToken.length > 0) {
    return queryToken;
  }
  return undefined;
}

/**
 * When TESTFORGE_API_KEY and/or TESTFORGE_JWT_SECRET is set, require valid credentials on /api.
 * When neither is set, authentication is skipped (local development).
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authConfig = getAuthConfig();
  if (!authConfig.enabled) {
    return next();
  }

  const token = extractBearerToken(req);
  if (!token) {
    return next(new AppError(401, 'Authentication required', ERROR_CODES.UNAUTHORIZED));
  }

  if (authConfig.apiKey && safeEqualString(token, authConfig.apiKey)) {
    req.auth = { subject: 'api-key', projectIds: '*' };
    return next();
  }

  if (authConfig.jwtSecret) {
    try {
      const payload = jwt.verify(token, authConfig.jwtSecret) as jwt.JwtPayload;
      const sub = typeof payload.sub === 'string' ? payload.sub : 'jwt-user';
      const projects = payload.projects;
      if (projects === '*') {
        req.auth = { subject: sub, projectIds: '*' };
        return next();
      }
      if (Array.isArray(projects) && projects.every((p) => typeof p === 'string')) {
        req.auth = { subject: sub, projectIds: projects };
        return next();
      }
      return next(new AppError(403, 'JWT must include projects claim (array or "*")', ERROR_CODES.FORBIDDEN));
    } catch {
      return next(new AppError(401, 'Invalid or expired token', ERROR_CODES.UNAUTHORIZED));
    }
  }

  return next(new AppError(401, 'Invalid credentials', ERROR_CODES.UNAUTHORIZED));
}

/** Enforce JWT project scope for routes under /api/projects/:projectId */
export function authorizeProject(req: Request, _res: Response, next: NextFunction): void {
  const authConfig = getAuthConfig();
  if (!authConfig.enabled) {
    return next();
  }

  const projectId = req.params.projectId;
  if (!projectId || !req.auth) {
    return next();
  }

  if (req.auth.projectIds === '*') {
    return next();
  }

  if (!req.auth.projectIds.includes(projectId)) {
    return next(new AppError(403, 'Forbidden for this project', ERROR_CODES.FORBIDDEN));
  }

  return next();
}
