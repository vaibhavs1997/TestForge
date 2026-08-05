// Backup & Restore Routes
import { Router } from 'express';
import multer from 'multer';
import { BackupService } from './BackupService';

const upload = multer({ dest: './data/uploads/' });

export function createBackupRoutes(backupService: BackupService): Router {
  const router = Router();

  // Create a manual backup
  router.post('/backups', async (_req, res) => {
    try {
      const backup = await backupService.createBackup();
      res.status(201).json(backup);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Backup failed' });
    }
  });

  // List all backups
  router.get('/backups', (_req, res) => {
    try {
      res.json(backupService.listBackups());
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list backups' });
    }
  });

  // Restore from a backup
  router.post('/backups/:id/restore', async (req, res) => {
    try {
      const result = await backupService.restoreBackup(req.params.id);
      if (!result.success) {
        res.status(400).json(result);
      } else {
        res.json(result);
      }
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Restore failed' });
    }
  });

  // Delete a backup
  router.delete('/backups/:id', (req, res) => {
    try {
      const result = backupService.deleteBackup(req.params.id);
      if (!result.success) {
        res.status(404).json(result);
      } else {
        res.json(result);
      }
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Delete failed' });
    }
  });

  // Export a project
  router.post('/projects/:projectId/export', async (req, res) => {
    try {
      const { projectName } = req.body;
      const result = await backupService.exportProject(req.params.projectId, projectName || req.params.projectId);
      res.download(result.path, (err) => {
        if (err) {
          res.status(500).json({ error: 'Failed to download export' });
        }
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Export failed' });
    }
  });

  // Import a project
  router.post('/projects/import', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      const mode = (req.body.mode || 'copy') as 'replace' | 'copy' | 'merge';
      const result = await backupService.importProject(req.file.path, mode);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Import failed' });
    }
  });

  return router;
}

export default createBackupRoutes;