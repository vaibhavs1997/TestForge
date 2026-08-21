// ImportRoutes - Route definitions for Dataset Import
import { Router } from 'express';
import multer from 'multer';
import type { FileFilterCallback } from 'multer';
import { ImportController } from './ImportController.js';
import { container } from '../../application/ApplicationContainer.js';

// Reuse shared repositories from the ApplicationContainer
const {
  datasetRepository,
  columnRepository,
  datasetRowRepository,
  relationshipRepository,
} = container;

// Initialize use case
import { ImportDatasetData } from '../../application/test-data/ImportDatasetData.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';

const importDatasetData = new ImportDatasetData(
  datasetRepository,
  columnRepository,
  datasetRowRepository,
  relationshipRepository
);

// Initialize controller
const importController = new ImportController(importDatasetData);

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || ext === 'json') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

// Import routes
router.post(
  '/projects/:projectId/test-data/datasets/:datasetId/import',
  upload.single('file'),
  asyncHandler((req, res) => importController.importData(req, res)),
);
router.get('/projects/:projectId/test-data/datasets/:datasetId/import/template', asyncHandler((req, res) => importController.getImportTemplate(req, res)));

export { router as importRoutes };
export default router;