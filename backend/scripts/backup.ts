import { loadEnv } from '../src/config/loadEnv.js';
import { acquireRuntimeStorageLock } from '../src/infrastructure/persistence/RuntimeStorageLock.js';
loadEnv();
const release = await acquireRuntimeStorageLock();
try {
  const { BackupService } = await import('../src/interfaces/backup/BackupService.js');
  const service = new BackupService({ offline: true });
  if (process.argv[2] === 'restore' && process.argv[3]) {
    const result = await service.restoreBackup(process.argv[3]);
    console.log(result.message);
    if (!result.success) process.exitCode = 1;
  } else if (process.argv[2] === 'create') {
    console.log((await service.createBackup()).id);
  } else throw new Error('Usage: backup.ts create | restore <backup-id>');
} finally { await release(); }
