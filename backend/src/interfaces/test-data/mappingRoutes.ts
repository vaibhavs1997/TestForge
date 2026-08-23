// DataSourceMappingRoutes - Route definitions for Data Source Mappings
import { Router } from 'express';
import { DataSourceMappingController } from './DataSourceMappingController.js';
import { container } from '../../application/ApplicationContainer.js';

// Reuse shared repository from the ApplicationContainer
const { dataSourceMappingRepository: mappingRepository } = container;

// Initialize use cases
import { CreateDataSourceMapping } from '../../application/test-data/CreateDataSourceMapping.js';
import { UpdateDataSourceMapping } from '../../application/test-data/UpdateDataSourceMapping.js';
import { DeleteDataSourceMapping } from '../../application/test-data/DeleteDataSourceMapping.js';
import { GetDataSourceMapping } from '../../application/test-data/GetDataSourceMapping.js';
import { ListDataSourceMappings } from '../../application/test-data/ListDataSourceMappings.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';

const createMapping = new CreateDataSourceMapping(mappingRepository);
const updateMapping = new UpdateDataSourceMapping(mappingRepository);
const deleteMapping = new DeleteDataSourceMapping(mappingRepository);
const getMapping = new GetDataSourceMapping(mappingRepository);
const listMappings = new ListDataSourceMappings(mappingRepository);

// Initialize controller
const mappingController = new DataSourceMappingController(
  createMapping,
  updateMapping,
  deleteMapping,
  getMapping,
  listMappings
);

const router = Router();

// Mapping routes
router.get('/projects/:projectId/test-data/mappings', asyncHandler((req, res) => mappingController.listMappings(req, res)));
router.post('/projects/:projectId/test-data/mappings', asyncHandler((req, res) => mappingController.createMapping(req, res)));
router.get('/projects/:projectId/test-data/mappings/:mappingId', asyncHandler((req, res) => mappingController.getMapping(req, res)));
router.patch('/projects/:projectId/test-data/mappings/:mappingId', asyncHandler((req, res) => mappingController.updateMapping(req, res)));
router.delete('/projects/:projectId/test-data/mappings/:mappingId', asyncHandler((req, res) => mappingController.deleteMapping(req, res)));

export { router as mappingRoutes };
export default router;