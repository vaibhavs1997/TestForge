// Backup & Restore Service
import fs from 'fs';
import path from 'path';
import { execFileSync, execSync } from 'child_process';
import { APP_VERSION, BUILD_TIMESTAMP, GIT_COMMIT } from '../../config.js';
import { defaultEvidenceGovernance } from '../../infrastructure/security/EvidenceGovernanceService.js';

export interface BackupMetadata {
  id: string;
  createdAt: string;
  version: string;
  buildTimestamp: string;
  gitCommit: string;
  schemaVersion: number;
  applicationVersion: string;
  migrationVersion: number;
  sizeBytes: number;
  fileCount: number;
}

export interface ExportManifest {
  schemaVersion: number;
  applicationVersion: string;
  migrationVersion: number;
  exportedAt: string;
  source: {
    version: string;
    buildTimestamp: string;
    gitCommit: string;
  };
  project: {
    id: string;
    name: string;
    description?: string;
  };
  collections: string[];
}

const SCHEMA_VERSION = 1;
const MIGRATION_VERSION = 1;
const BACKUP_DIR = process.env.BACKUP_DIR || './data/backups';
const MAX_BACKUPS = Number(process.env.MAX_BACKUPS || 10);

export class BackupService {
  private backupDir: string;

  constructor() {
    this.backupDir = BACKUP_DIR;
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a manual backup of the entire data directory.
   */
  async createBackup(): Promise<BackupMetadata> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const id = `backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, id);

    // Create backup directory
    fs.mkdirSync(backupPath, { recursive: true });

    // Copy data directory
    const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : './data';
    if (fs.existsSync(dataDir)) {
      this.copyDir(dataDir, path.join(backupPath, 'data'));
    }

    // Write metadata
    const metadata: BackupMetadata = {
      id,
      createdAt: new Date().toISOString(),
      version: APP_VERSION,
      buildTimestamp: BUILD_TIMESTAMP,
      gitCommit: GIT_COMMIT,
      schemaVersion: SCHEMA_VERSION,
      applicationVersion: APP_VERSION,
      migrationVersion: MIGRATION_VERSION,
      sizeBytes: this.getDirSize(backupPath),
      fileCount: this.countFiles(backupPath),
    };

    fs.writeFileSync(
      path.join(backupPath, 'backup.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Enforce retention policy
    this.enforceRetention();

    return metadata;
  }

  /**
   * List all backups with metadata.
   */
  listBackups(): BackupMetadata[] {
    if (!fs.existsSync(this.backupDir)) return [];

    return fs.readdirSync(this.backupDir)
      .filter((name) => fs.statSync(path.join(this.backupDir, name)).isDirectory())
      .map((name) => {
        const metaPath = path.join(this.backupDir, name, 'backup.json');
        if (fs.existsSync(metaPath)) {
          try {
            return JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as BackupMetadata;
          } catch {
            return null;
          }
        }
        return null;
      })
      .filter((m): m is BackupMetadata => m !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Restore from a backup by ID.
   */
  async restoreBackup(id: string): Promise<{ success: boolean; message: string }> {
    this.validateBackupId(id);
    const backupPath = path.join(this.backupDir, id);
    if (!fs.existsSync(backupPath)) {
      return { success: false, message: `Backup not found: ${id}` };
    }

    // Validate backup integrity
    const metaPath = path.join(backupPath, 'backup.json');
    if (!fs.existsSync(metaPath)) {
      return { success: false, message: 'Backup metadata missing - invalid backup' };
    }

    let metadata: BackupMetadata;
    try {
      metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch {
      return { success: false, message: 'Backup metadata corrupt' };
    }

    // Validate compatibility
    if (metadata.schemaVersion > SCHEMA_VERSION) {
      return { success: false, message: `Backup schema version ${metadata.schemaVersion} is newer than supported ${SCHEMA_VERSION}` };
    }

    // Restore data
    const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : './data';
    const backupData = path.join(backupPath, 'data');
    if (fs.existsSync(backupData)) {
      // Clear existing data
      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
      }
      fs.mkdirSync(dataDir, { recursive: true });
      this.copyDir(backupData, dataDir);
    }

    return { success: true, message: `Backup ${id} restored successfully` };
  }

  /**
   * Delete a backup by ID.
   */
  deleteBackup(id: string): { success: boolean; message: string } {
    this.validateBackupId(id);
    const backupPath = path.join(this.backupDir, id);
    if (!fs.existsSync(backupPath)) {
      return { success: false, message: `Backup not found: ${id}` };
    }
    fs.rmSync(backupPath, { recursive: true, force: true });
    return { success: true, message: `Backup ${id} deleted` };
  }

  private validateBackupId(id: string): void {
    if (!/^[A-Za-z0-9._-]+$/.test(id) || id === '.' || id === '..' || path.basename(id) !== id) {
      throw new Error('Invalid backup id');
    }
  }

  private validateArchiveEntries(archivePath: string): void {
    let listing = '';
    try {
      listing = execFileSync('unzip', ['-Z1', archivePath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch {
      listing = execFileSync('tar', ['-tzf', archivePath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    }
    for (const entry of listing.split(/\r?\n/).filter(Boolean)) {
      const normalized = entry.replace(/\\/g, '/');
      if (normalized.startsWith('/') || normalized.split('/').includes('..') || /^[A-Za-z]:\//.test(normalized)) {
        throw new Error('Archive contains an unsafe path');
      }
    }
  }

  /**
   * Export a project to a ZIP archive.
   */
  async exportProject(projectId: string, projectName: string): Promise<{ path: string; manifest: ExportManifest }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportDir = path.join(this.backupDir, `export-${projectId}-${timestamp}`);
    fs.mkdirSync(exportDir, { recursive: true });

    // Build manifest
    const manifest: ExportManifest = {
      schemaVersion: SCHEMA_VERSION,
      applicationVersion: APP_VERSION,
      migrationVersion: MIGRATION_VERSION,
      exportedAt: new Date().toISOString(),
      source: {
        version: APP_VERSION,
        buildTimestamp: BUILD_TIMESTAMP,
        gitCommit: GIT_COMMIT,
      },
      project: {
        id: projectId,
        name: projectName,
      },
      collections: [
        'apis', 'environments', 'knowledge', 'datasets', 'rows', 'relationships',
        'requirements', 'strategies', 'designs', 'assertions', 'executionPlans',
        'suites', 'executionProfiles', 'reports', 'versions', 'notifications',
        'providers', 'plugins', 'scheduler', 'recommendations', 'auditLogs',
        'prompts', 'context',
      ],
    };

    // Write manifest
    fs.writeFileSync(
      path.join(exportDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );

    // Copy project data
    const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : './data';
    if (fs.existsSync(dataDir)) {
      this.copyDir(dataDir, path.join(exportDir, 'data'));
    }

    // Create ZIP archive
    const zipPath = path.join(this.backupDir, `project-${projectId}-${timestamp}.zip`);
    try {
      execSync(`cd "${exportDir}" && zip -r "${zipPath}" .`, { stdio: 'pipe' });
    } catch {
      // Fallback: use tar
      execSync(`cd "${exportDir}" && tar -czf "${zipPath}" .`, { stdio: 'pipe' });
    }

    // Cleanup temp dir
    fs.rmSync(exportDir, { recursive: true, force: true });

    return { path: zipPath, manifest };
  }

  /**
   * Import a project from a ZIP archive.
   */
  async importProject(zipPath: string, mode: 'replace' | 'copy' | 'merge'): Promise<{ success: boolean; message: string }> {
    if (!fs.existsSync(zipPath)) {
      return { success: false, message: 'Import file not found' };
    }

    const importDir = path.join(this.backupDir, `import-${Date.now()}`);
    fs.mkdirSync(importDir, { recursive: true });

    try {
      this.validateArchiveEntries(zipPath);
      // Extract archive
      try {
        execSync(`cd "${importDir}" && unzip -o "${zipPath}"`, { stdio: 'pipe' });
      } catch {
        execSync(`cd "${importDir}" && tar -xzf "${zipPath}"`, { stdio: 'pipe' });
      }

      // Validate manifest
      const manifestPath = path.join(importDir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        return { success: false, message: 'Import file missing manifest.json - invalid project export' };
      }

      let manifest: ExportManifest;
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      } catch {
        return { success: false, message: 'Import manifest is corrupt' };
      }

      // Validate schema version
      if (manifest.schemaVersion > SCHEMA_VERSION) {
        return { success: false, message: `Import schema version ${manifest.schemaVersion} is newer than supported ${SCHEMA_VERSION}` };
      }

      // Import data
      const dataDir = process.env.DB_PATH ? path.dirname(process.env.DB_PATH) : './data';
      const importData = path.join(importDir, 'data');
      if (fs.existsSync(importData)) {
        if (mode === 'replace') {
          if (fs.existsSync(dataDir)) {
            fs.rmSync(dataDir, { recursive: true, force: true });
          }
          fs.mkdirSync(dataDir, { recursive: true });
          this.copyDir(importData, dataDir);
        } else if (mode === 'copy') {
          // Copy with new project ID (handled by caller)
          fs.mkdirSync(dataDir, { recursive: true });
          this.copyDir(importData, dataDir);
        } else {
          // Merge - copy files that don't exist
          fs.mkdirSync(dataDir, { recursive: true });
          this.mergeDir(importData, dataDir);
        }
      }

      return { success: true, message: `Project imported successfully (mode: ${mode})` };
    } finally {
      fs.rmSync(importDir, { recursive: true, force: true });
    }
  }

  private copyDir(src: string, dest: string) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this.copyDir(srcPath, destPath);
      } else if (entry.name === 'secret-store.key' || entry.name === 'secrets.enc.json') {
        continue;
      } else if (entry.name.endsWith('.json')) {
        try {
          const safe = defaultEvidenceGovernance.protect(JSON.parse(fs.readFileSync(srcPath, 'utf8')), 'export');
          fs.writeFileSync(destPath, JSON.stringify(safe, null, 2), 'utf8');
        } catch {
          fs.copyFileSync(srcPath, destPath);
        }
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  private mergeDir(src: string, dest: string) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this.mergeDir(srcPath, destPath);
      } else if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  private getDirSize(dir: string): number {
    let size = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        size += this.getDirSize(fullPath);
      } else {
        size += fs.statSync(fullPath).size;
      }
    }
    return size;
  }

  private countFiles(dir: string): number {
    let count = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += this.countFiles(fullPath);
      } else {
        count++;
      }
    }
    return count;
  }

  private enforceRetention() {
    const backups = this.listBackups();
    if (backups.length > MAX_BACKUPS) {
      const toDelete = backups.slice(MAX_BACKUPS);
      for (const backup of toDelete) {
        this.deleteBackup(backup.id);
      }
    }
  }
}

export default BackupService;
