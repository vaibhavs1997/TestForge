// Authentication and project-scoped authorization middleware
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'node:crypto';
import { AppError, UnauthorizedError, ForbiddenError } from '../../shared/errors';
import { getAuthConfig } from '../../config';
import { isProjectIdInAuthScope } from './projectAccess';
import type { UserRole } from '../../domain/auth/types';

export interface AuthContext {
  subject: string;
  email?: string;
  tenantId?: string;
  role?: UserRole;
  /** Project ids the caller may access, or '*' for all projects (API key). */
  projectIds: string[] | '*';
}

export type ProjectAccessRecord = { ownerId?: string; tenantId?: string } | null;

type ProjectAccessLookup = (projectId: string) => Promise<ProjectAccessRecord>;

let projectAccessLookup: ProjectAccessLookup | null = null;

/** Register project owner/tenant lookup (wired from ApplicationContainer at startup). */
export function setProjectAccessLookup(lookup: ProjectAccessLookup): void {
  projectAccessLookup = lookup;
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
  return undefined;
}

function buildAuthFromJwtPayload(payload: jwt.JwtPayload): AuthContext | null {
  const sub = typeof payload.sub === 'string' ? payload.sub : undefined;
  if (!sub) return null;

  const email = typeof payload.email === 'string' ? payload.email : undefined;
  const tenantId = typeof payload.tenantId === 'string' ? payload.tenantId : undefined;
  const role = typeof payload.role === 'string' ? (payload.role as UserRole) : undefined;
  const projects = payload.projects;

  if (projects === '*') {
    return { subject: sub, email, tenantId, role, projectIds: '*' };
  }
  if (Array.isArray(projects) && projects.every((p) => typeof p === 'string')) {
    return { subject: sub, email, tenantId, role, projectIds: projects };
  }
  if (tenantId) {
    return { subject: sub, email, tenantId, role, projectIds: [] };
  }
  return null;
}

/**
 * When TESTFORGE_API_KEY, TESTFORGE_JWT_SECRET, and/or MONGODB_URI (enterprise) is set, require valid credentials on /api.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authConfig = getAuthConfig();
  if (!authConfig.enabled) {
    return next();
  }

  const token = extractBearerToken(req);
  if (!token) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (authConfig.apiKey && safeEqualString(token, authConfig.apiKey)) {
    req.auth = { subject: 'api-key', projectIds: '*' };
    return next();
  }

  if (authConfig.jwtSecret) {
    try {
      const payload = jwt.verify(token, authConfig.jwtSecret) as jwt.JwtPayload;
      const ctx = buildAuthFromJwtPayload(payload);
      if (!ctx) {
        return next(
          new ForbiddenError('JWT must include tenantId (login token) or projects claim (array or "*")'),
        );
      }
      req.auth = ctx;
      return next();
    } catch {
      return next(new UnauthorizedError('Invalid or expired token'));
    }
  }

  return next(new UnauthorizedError('Invalid credentials'));
}

/** Enforce project scope for routes under /api/projects/:projectId */
export async function authorizeProject(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const projectId = req.params.projectId;
  if (!projectId) {
    return next();
  }

  try {
    await assertProjectAccess(projectId, req.auth);
    return next();
  } catch (error) {
    return next(error);
  }
}

/** Enforce access for resources whose route is not itself project-scoped. */
export async function assertProjectAccess(projectId: string, auth: AuthContext | undefined): Promise<void> {
  const authConfig = getAuthConfig();
  if (!authConfig.enabled) return;
  if (!auth) throw new UnauthorizedError('Authentication required');

  if (auth.projectIds === '*') return;

  if (isProjectIdInAuthScope(auth, projectId)) return;

  if (projectAccessLookup) {
    const record = await projectAccessLookup(projectId);
    if (record?.ownerId && record.ownerId === auth.subject) return;
    if (auth.tenantId && record?.tenantId && record.tenantId === auth.tenantId) return;
  }

  throw new ForbiddenError('Forbidden for this project');
}
