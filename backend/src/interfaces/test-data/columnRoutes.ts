// ColumnRoutes - Route definitions for Dataset Columns
import { Router } from 'express';
import { ColumnController } from './ColumnController.js';
import { container } from '../../application/ApplicationContainer.js';

// Reuse shared repositories from the ApplicationContainer
const {
  columnRepository,
  apiServiceRepository,
  apiOperationRepository,
} = container;

// Initialize use cases
import { CreateColumn } from '../../application/test-data/CreateColumn.js';
import { UpdateColumn } from '../../application/test-data/UpdateColumn.js';
import { DeleteColumn } from '../../application/test-data/DeleteColumn.js';
import { GetColumn } from '../../application/test-data/GetColumn.js';
import { ListColumns } from '../../application/test-data/ListColumns.js';
import { SuggestColumns } from '../../application/test-data/SuggestColumns.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';

const createColumn = new CreateColumn(columnRepository);
const updateColumn = new UpdateColumn(columnRepository);
const deleteColumn = new DeleteColumn(columnRepository);
const getColumn = new GetColumn(columnRepository);
const listColumns = new ListColumns(columnRepository);
const suggestColumns = new SuggestColumns(apiOperationRepository, apiServiceRepository);

// Initialize controller
const columnController = new ColumnController(
  createColumn,
  updateColumn,
  deleteColumn,
  getColumn,
  listColumns,
  suggestColumns
);

const router = Router();

// Column routes
router.get('/projects/:projectId/test-data/columns', asyncHandler((req, res) => columnController.listColumns(req, res)));
router.post('/projects/:projectId/test-data/columns', asyncHandler((req, res) => columnController.createColumn(req, res)));
router.get('/projects/:projectId/test-data/columns/:columnId', asyncHandler((req, res) => columnController.getColumn(req, res)));
router.patch('/projects/:projectId/test-data/columns/:columnId', asyncHandler((req, res) => columnController.updateColumn(req, res)));
router.delete('/projects/:projectId/test-data/columns/:columnId', asyncHandler((req, res) => columnController.deleteColumn(req, res)));
router.get('/projects/:projectId/test-data/columns/suggest', asyncHandler((req, res) => columnController.suggestColumns(req, res)));

export { router as columnRoutes };
export default router;