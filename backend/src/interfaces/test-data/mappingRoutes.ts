// DataSourceMappingRoutes - Route definitions for Data Source Mappings
import { Router } from 'express';
import { DataSourceMappingController } from './DataSourceMappingController';
import { DataSourceMappingRepository } from '../../infrastructure/test-data/DataSourceMappingRepository';
import { CreateDataSourceMapping } from '../../application/test-data/CreateDataSourceMapping';
import { UpdateDataSourceMapping } from '../../application/test-data/UpdateDataSourceMapping';
import { DeleteDataSourceMapping } from '../../application/test-data/DeleteDataSourceMapping';
import { GetDataSourceMapping } from '../../application/test-data/GetDataSourceMapping';
import { ListDataSourceMappings } from '../../application/test-data/ListDataSourceMappings';

// Initialize repositories
const mappingRepository = new DataSourceMappingRepository();

// Initialize use cases
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
router.get('/projects/:projectId/test-data/mappings', (req, res) => mappingController.listMappings(req, res));
router.post('/projects/:projectId/test-data/mappings', (req, res) => mappingController.createMapping(req, res));
router.get('/projects/:projectId/test-data/mappings/:mappingId', (req, res) => mappingController.getMapping(req, res));
router.patch('/projects/:projectId/test-data/mappings/:mappingId', (req, res) => mappingController.updateMapping(req, res));
router.delete('/projects/:projectId/test-data/mappings/:mappingId', (req, res) => mappingController.deleteMapping(req, res));

export { router as mappingRoutes };
export default router;