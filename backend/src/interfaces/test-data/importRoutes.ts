// ImportRoutes - Route definitions for Dataset Import
import { Router } from 'express';
import { ImportController } from './ImportController';
import { ImportDatasetData } from '../../application/test-data/ImportDatasetData';
import { DatasetRepository } from '../../domain/test-data/DatasetRepository';
import { ColumnRepository } from '../../domain/test-data/ColumnRepository';
import { DatasetRowRepository } from '../../infrastructure/test-data/DatasetRowRepository';
import { IRelationshipRepository } from '../../domain/test-data/RelationshipRepository';

// Initialize repositories
import { DatasetRepository as DatasetRepositoryImpl } from '../../infrastructure/test-data/DatasetRepository';
import { ColumnRepository as ColumnRepositoryImpl } from '../../infrastructure/test-data/ColumnRepository';
import { RelationshipRepository as RelationshipRepositoryImpl } from '../../infrastructure/test-data/RelationshipRepository';

const datasetRepository = new DatasetRepositoryImpl();
const columnRepository = new ColumnRepositoryImpl();
const datasetRowRepository = new DatasetRowRepository();
const relationshipRepository = new RelationshipRepositoryImpl();

// Initialize use case
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
router.post('/projects/:projectId/test-data/datasets/:datasetId/import', (req, res) => importController.importData(req, res));
router.get('/projects/:projectId/test-data/datasets/:datasetId/import/template', (req, res) => importController.getImportTemplate(req, res));

export { router as importRoutes };
export default router;