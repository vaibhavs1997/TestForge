import { describe, expect, it, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticate, authorizeProject } from './auth';
import { AppError } from './ErrorHandler';

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

  it('enforces JWT project scope', () => {
    process.env.TESTFORGE_JWT_SECRET = 'jwt-secret';
    const token = jwt.sign({ sub: 'user-1', projects: ['allowed'] }, 'jwt-secret');
    const req = {
      params: { projectId: 'denied' },
      headers: { authorization: `Bearer ${token}` },
      auth: { subject: 'user-1', projectIds: ['allowed'] },
    } as any;
    const next = vi.fn();
    authorizeProject(req, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });
});
