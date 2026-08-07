// RowRoutes - Route definitions for Dataset Row management
import { Router } from 'express';
import { RowController } from './RowController';
import { container } from '../../application/ApplicationContainer';

// Reuse shared repository from the ApplicationContainer
const { datasetRowRepository: datasetRowRepository } = container;

// Initialize use cases
import { CreateRow } from '../../application/test-data/CreateRow';
import { UpdateRow } from '../../application/test-data/UpdateRow';
import { DeleteRow } from '../../application/test-data/DeleteRow';
import { GetRow } from '../../application/test-data/GetRow';
import { ListRows } from '../../application/test-data/ListRows';
import { asyncHandler } from '../middleware/AsyncHandler';

const createRow = new CreateRow(datasetRowRepository);
const updateRow = new UpdateRow(datasetRowRepository);
const deleteRow = new DeleteRow(datasetRowRepository);
const getRow = new GetRow(datasetRowRepository);
const listRows = new ListRows(datasetRowRepository);

// Initialize controller
const rowController = new RowController(
  createRow,
  updateRow,
  deleteRow,
  getRow,
  listRows
);

const router = Router();

// Dataset Row routes
router.get('/projects/:projectId/test-data/rows', asyncHandler((req, res) => rowController.list(req, res)));
router.post('/projects/:projectId/test-data/rows', asyncHandler((req, res) => rowController.create(req, res)));
router.get('/projects/:projectId/test-data/rows/:rowId', asyncHandler((req, res) => rowController.get(req, res)));
router.patch('/projects/:projectId/test-data/rows/:rowId', asyncHandler((req, res) => rowController.update(req, res)));
router.delete('/projects/:projectId/test-data/rows/:rowId', asyncHandler((req, res) => rowController.delete(req, res)));

export { router as rowRoutes };
export default router;