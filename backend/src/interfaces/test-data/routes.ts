// DatasetRoutes - Route definitions for Test Data Library
import { Router } from 'express';
import { DatasetController } from './DatasetController';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';
import { CreateDataset } from '../../application/test-data/CreateDataset';
import { UpdateDataset } from '../../application/test-data/UpdateDataset';
import { DeleteDataset } from '../../application/test-data/DeleteDataset';
import { GetDataset } from '../../application/test-data/GetDataset';
import { ListDatasets } from '../../application/test-data/ListDatasets';

// Initialize repositories
const datasetRepository = new DatasetRepository();

// Initialize use cases
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
router.get('/projects/:projectId/test-data/datasets', (req, res) => datasetController.listDatasets(req, res));
router.post('/projects/:projectId/test-data/datasets', (req, res) => datasetController.createDataset(req, res));
router.get('/projects/:projectId/test-data/datasets/:datasetId', (req, res) => datasetController.getDataset(req, res));
router.patch('/projects/:projectId/test-data/datasets/:datasetId', (req, res) => datasetController.updateDataset(req, res));
router.delete('/projects/:projectId/test-data/datasets/:datasetId', (req, res) => datasetController.deleteDataset(req, res));

export { router as datasetRoutes };
export default router;