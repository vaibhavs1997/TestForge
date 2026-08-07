import { describe, expect, it, beforeEach } from 'vitest';
import type { ProjectRecord } from '../../domain/project/ProjectRecord';
import { filterProjectsForAuth } from './projectAccess';

const sample = (id: string, ownerId?: string): ProjectRecord => ({
  id,
  name: id,
  projectKey: id,
  createdAt: 1,
  updatedAt: 1,
  ownerId,
});

describe('filterProjectsForAuth', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.TESTFORGE_API_KEY;
    delete process.env.TESTFORGE_JWT_SECRET;
  });

  const projects = [
    { ...sample('a', 'user-1'), tenantId: 'tenant-a' },
    { ...sample('b', 'user-2'), tenantId: 'tenant-b' },
    { ...sample('legacy'), tenantId: 'tenant-a' },
  ];

  it('returns all projects when auth is disabled', () => {
    const filtered = filterProjectsForAuth(projects, undefined);
    expect(filtered).toHaveLength(3);
  });

  it('filters by tenant for enterprise login tokens', () => {
    process.env.TESTFORGE_JWT_SECRET = 'secret';
    const filtered = filterProjectsForAuth(projects, {
      subject: 'user-1',
      tenantId: 'tenant-a',
      projectIds: [],
    });
    expect(filtered.map((p) => p.id).sort()).toEqual(['a', 'legacy']);
  });

  it('filters to JWT project list and owned projects', () => {
    process.env.TESTFORGE_JWT_SECRET = 'secret';
    const filtered = filterProjectsForAuth(projects, {
      subject: 'user-1',
      projectIds: ['legacy'],
    });
    expect(filtered.map((p) => p.id).sort()).toEqual(['a', 'legacy']);
  });

  it('allows global API key access to all projects', () => {
    process.env.TESTFORGE_API_KEY = 'key';
    const filtered = filterProjectsForAuth(projects, {
      subject: 'api-key',
      projectIds: '*',
    });
    expect(filtered).toHaveLength(3);
  });
});
