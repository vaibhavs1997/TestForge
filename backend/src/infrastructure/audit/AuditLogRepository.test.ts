import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditLogEntity } from '../../domain/audit/index.js';
import { InMemoryAuditLogRepository } from './AuditLogRepository.js';
import { FileAuditLogRepository } from './FileAuditLogRepository.js';

describe('AuditLogRepository contract', () => {
  let tempDir: string;
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
    tempDir = mkdtempSync(join(tmpdir(), 'testforge-audit-'));
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  const sampleLogs = [
    new AuditLogEntity('log-1', 'project-a', 'API', 'Service', 'service-1', 'CREATE', 'user-1', 100, null, { id: 'service-1' }, {}),
    new AuditLogEntity('log-2', 'project-a', 'Environment', 'Environment', 'env-1', 'UPDATE', 'user-1', 300, null, { id: 'env-1' }, {}),
    new AuditLogEntity('log-3', 'project-a', 'API', 'Service', 'service-2', 'DELETE', 'user-1', 200, null, null, {}),
    new AuditLogEntity('log-4', 'project-b', 'Report', 'Report', 'report-1', 'CREATE', 'user-2', 400, null, null, {}),
  ];

  async function expectRepositoryContract(
    repository: InMemoryAuditLogRepository | FileAuditLogRepository,
  ) {
    for (const log of sampleLogs) {
      await repository.create(log);
    }

    const all = await repository.list();
    expect(all.map((log) => log.id)).toEqual(['log-4', 'log-2', 'log-3', 'log-1']);

    const projectLogs = await repository.findByProject('project-a');
    expect(projectLogs.map((log) => log.id)).toEqual(['log-1', 'log-2', 'log-3']);

    const filtered = await repository.findByProjectAndFilters('project-a', {
      module: 'API',
      action: 'DELETE',
    });
    expect(filtered.map((log) => log.id)).toEqual(['log-3']);
  }

  it('behaves consistently in memory', async () => {
    await expectRepositoryContract(new InMemoryAuditLogRepository());
  });

  it('behaves consistently on disk', async () => {
    await expectRepositoryContract(new FileAuditLogRepository());
  });
});
