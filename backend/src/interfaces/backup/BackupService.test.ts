import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { BackupService } from './BackupService.js';

describe('recoverable backups', () => {
  it('preserves exact data, excludes nested backups, verifies corruption, and stages restore', async () => {
    const root = mkdtempSync(join(tmpdir(), 'testforge-backup-'));
    const dataDir = join(root, 'data'); const backupDir = join(dataDir, 'backups');
    const previousDb = process.env.DB_PATH; delete process.env.DB_PATH;
    try {
      mkdirSync(dataDir); const file = join(dataDir, 'state.json');
      const original = JSON.stringify({ token: 'restore-exactly', payload: 'x'.repeat(150000) });
      writeFileSync(file, original);
      const service = new BackupService({ dataDir, backupDir, offline: true });
      const backup = await service.createBackup();
      expect(existsSync(join(backupDir, backup.id, 'data/backups'))).toBe(false);
      expect(readFileSync(join(backupDir, backup.id, 'data/state.json'), 'utf8')).toBe(original);
      writeFileSync(file, 'new-state');
      expect((await new BackupService({dataDir, backupDir}).restoreBackup(backup.id)).success).toBe(false);
      expect(readFileSync(file, 'utf8')).toBe('new-state');
      expect((await service.restoreBackup(backup.id)).success).toBe(true);
      expect(readFileSync(file, 'utf8')).toBe(original);
      expect(service.listBackups()).toHaveLength(1);
      writeFileSync(join(backupDir, backup.id, 'data/state.json'), 'tampered');
      expect((await service.restoreBackup(backup.id)).success).toBe(false);
      expect(readFileSync(file, 'utf8')).toBe(original);
    } finally {
      if (previousDb === undefined) delete process.env.DB_PATH; else process.env.DB_PATH = previousDb;
      rmSync(root, { recursive: true, force: true });
    }
  });
});
