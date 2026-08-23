// Backup & Restore Routes
import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import { BackupService } from './BackupService.js';
import { assertGlobalAccess, assertProjectAccess, type AuthContext } from '../middleware/auth.js';
import { AppError } from '../../shared/errors.js';

const upload = multer({ dest: './data/uploads/', limits: { fileSize: 100 * 1024 * 1024 } });

function requireGlobalAccess(req: { auth?: AuthContext }): void {
  assertGlobalAccess(req.auth);
}
function sendError(res: any, error: unknown, fallback: string): void {
  if (error instanceof AppError) { res.status(error.statusCode).json({ error: error.message, errorCode: error.errorCode }); return; }
  res.status(500).json({ error: error instanceof Error ? error.message : fallback });
}

export function createBackupRoutes(backupService: BackupService): Router {
  const router = Router();

  // Create a manual backup
  router.post('/backups', async (req, res) => {
    try {
      requireGlobalAccess(req);
      const backup = await backupService.createBackup();
      res.status(201).json(backup);
    } catch (err) {
      sendError(res, err, 'Backup failed');
    }
  });

  // List all backups
  router.get('/backups', (req, res) => {
    try {
      requireGlobalAccess(req);
      res.json(backupService.listBackups());
    } catch (err) {
      sendError(res, err, 'Failed to list backups');
    }
  });

  // Restore from a backup
  router.post('/backups/:id/restore', async (req, res) => {
    try {
      requireGlobalAccess(req);
      const result = await backupService.restoreBackup(req.params.id);
      if (!result.success) {
        res.status(400).json(result);
      } else {
        res.json(result);
      }
    } catch (err) {
      sendError(res, err, 'Restore failed');
    }
  });

  // Delete a backup
  router.delete('/backups/:id', (req, res) => {
    try {
      requireGlobalAccess(req);
      const result = backupService.deleteBackup(req.params.id);
      if (!result.success) {
        res.status(404).json(result);
      } else {
        res.json(result);
      }
    } catch (err) {
      sendError(res, err, 'Delete failed');
    }
  });

  // Export a project
  router.post('/projects/:projectId/export', async (req, res) => {
    try {
      await assertProjectAccess(req.params.projectId, req.auth);
      const { projectName } = req.body;
      const result = await backupService.exportProject(req.params.projectId, projectName || req.params.projectId);
      res.download(result.path, (err) => {
        if (err) {
          res.status(500).json({ error: 'Failed to download export' });
        }
      });
    } catch (err) {
      sendError(res, err, 'Export failed');
    }
  });

  // Import a project
  router.post('/projects/import', upload.single('file'), async (req, res) => {
    try {
      requireGlobalAccess(req);
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      const mode = (req.body.mode || 'copy') as 'replace' | 'copy' | 'merge';
      const uploadedPath = req.file.path;
      try {
        const result = await backupService.importProject(uploadedPath, mode);
        res.json(result);
      } finally {
        try { fs.unlinkSync(uploadedPath); } catch { /* already removed */ }
      }
    } catch (err) {
      sendError(res, err, 'Import failed');
    }
  });

  return router;
}

export default createBackupRoutes;
