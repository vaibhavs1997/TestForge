// ImportRoutes - Route definitions for Dataset Import
import { Router } from 'express';
import { ImportController } from './ImportController';
import { container } from '../../application/ApplicationContainer';

// Reuse shared repositories from the ApplicationContainer
const {
  datasetRepository,
  columnRepository,
  datasetRowRepository,
  relationshipRepository,
} = container;

// Initialize use case
import { ImportDatasetData } from '../../application/test-data/ImportDatasetData';
import { asyncHandler } from '../middleware/AsyncHandler';

const importDatasetData = new ImportDatasetData(
  datasetRepository,
  columnRepository,
  datasetRowRepository,
  relationshipRepository
);

// Initialize controller
const importController = new ImportController(importDatasetData);

const router = Router();

// Import routes
router.post('/projects/:projectId/test-data/datasets/:datasetId/import', asyncHandler((req, res) => importController.importData(req, res)));
router.get('/projects/:projectId/test-data/datasets/:datasetId/import/template', asyncHandler((req, res) => importController.getImportTemplate(req, res)));

export { router as importRoutes };
export default router;