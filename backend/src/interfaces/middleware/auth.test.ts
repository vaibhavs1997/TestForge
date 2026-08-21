import { describe, expect, it, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticate, authorizeProject, authorizeResource, assertGlobalAccess } from './auth.js';
import { AppError } from '../../shared/errors.js';

describe('auth middleware', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.TESTFORGE_API_KEY;
    delete process.env.TESTFORGE_JWT_SECRET;
  });

  it('skips authentication when no secrets are configured', () => {
    const next = vi.fn();
    authenticate({ headers: {} } as any, {} as any, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('accepts a valid API key', () => {
    process.env.TESTFORGE_API_KEY = 'test-secret-key';
    const req = { headers: { authorization: 'Bearer test-secret-key' } } as any;
    const next = vi.fn();
    authenticate(req, {} as any, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.auth).toEqual({ subject: 'api-key', projectIds: '*' });
  });

  it('rejects missing credentials when auth is enabled', () => {
    process.env.TESTFORGE_API_KEY = 'test-secret-key';
    const next = vi.fn();
    authenticate({ headers: {} } as any, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('enforces JWT project scope', async () => {
    process.env.TESTFORGE_JWT_SECRET = 'jwt-secret';
    const token = jwt.sign({ sub: 'user-1', projects: ['allowed'] }, 'jwt-secret');
    const req = {
      params: { projectId: 'denied' },
      headers: { authorization: `Bearer ${token}` },
      auth: { subject: 'user-1', projectIds: ['allowed'] },
    } as any;
    const next = vi.fn();
    await authorizeProject(req, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });

  it('standardizes missing, unauthenticated, and cross-project ID-resource access', async () => {
    process.env.TESTFORGE_API_KEY = 'test-secret-key';
    const load = vi.fn(async (id: string) => id === 'missing' ? null : { projectId: 'project-a' });
    const guard = authorizeResource('resourceId', load);
    const run = async (resourceId: string, auth: any) => {
      const next = vi.fn();
      await guard({ params: { resourceId }, auth } as any, {} as any, next);
      return next.mock.calls[0][0];
    };

    expect((await run('missing', { subject: 'u', projectIds: ['project-a'] }))?.statusCode).toBe(404);
    expect((await run('exists', undefined))?.statusCode).toBe(401);
    expect((await run('exists', { subject: 'u', projectIds: ['project-b'] }))?.statusCode).toBe(403);
    expect(await run('exists', { subject: 'u', projectIds: ['project-a'] })).toBeUndefined();
  });

  it('denies member-role global operations even with global project scope', () => {
    process.env.TESTFORGE_API_KEY = 'test-secret-key';
    expect(() => assertGlobalAccess({ subject: 'member', role: 'member', projectIds: '*' })).toThrow(/Administrator role/);
  });
});
