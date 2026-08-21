// DatasetRoutes - Route definitions for Test Data Library
import { Router } from 'express';
import { DatasetController } from './DatasetController.js';
import { container } from '../../application/ApplicationContainer.js';

// Reuse shared repository from the ApplicationContainer
const { datasetRepository } = container;

// Initialize use cases
import { CreateDataset } from '../../application/test-data/CreateDataset.js';
import { UpdateDataset } from '../../application/test-data/UpdateDataset.js';
import { DeleteDataset } from '../../application/test-data/DeleteDataset.js';
import { GetDataset } from '../../application/test-data/GetDataset.js';
import { ListDatasets } from '../../application/test-data/ListDatasets.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';

const createDataset = new CreateDataset(datasetRepository);
const updateDataset = new UpdateDataset(datasetRepository);
const deleteDataset = new DeleteDataset(datasetRepository);
const getDataset = new GetDataset(datasetRepository);
const listDatasets = new ListDatasets(datasetRepository);

// Initialize controller
const datasetController = new DatasetController(
  createDataset,
  updateDataset,
  deleteDataset,
  getDataset,
  listDatasets
);

const router = Router();

// Dataset routes
router.get('/projects/:projectId/test-data/datasets', asyncHandler((req, res) => datasetController.listDatasets(req, res)));
router.post('/projects/:projectId/test-data/datasets', asyncHandler((req, res) => datasetController.createDataset(req, res)));
router.get('/projects/:projectId/test-data/datasets/:datasetId', asyncHandler((req, res) => datasetController.getDataset(req, res)));
router.patch('/projects/:projectId/test-data/datasets/:datasetId', asyncHandler((req, res) => datasetController.updateDataset(req, res)));
router.delete('/projects/:projectId/test-data/datasets/:datasetId', asyncHandler((req, res) => datasetController.deleteDataset(req, res)));

export { router as datasetRoutes };
