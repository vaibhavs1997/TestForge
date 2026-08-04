// ApiRoutes - Route definitions for API Management
import { Router } from 'express';
import multer from 'multer';
import type { FileFilterCallback } from 'multer';
import { ApiController } from './ApiController';
import { container } from '../../application/ApplicationContainer';

// Reuse shared repositories from the ApplicationContainer
const {
  apiServiceRepository,
  apiOperationRepository,
  eventPublisher,
} = container;

// Initialize use cases
import { CreateApiService } from '../../application/api/CreateApiService';
import { UpdateApiService } from '../../application/api/UpdateApiService';
import { DeleteApiService } from '../../application/api/DeleteApiService';
import { GetApiService } from '../../application/api/GetApiService';
import { ListApiServices } from '../../application/api/ListApiServices';
import { CreateApiOperation } from '../../application/api/CreateApiOperation';
import { UpdateApiOperation } from '../../application/api/UpdateApiOperation';
import { DeleteApiOperation } from '../../application/api/DeleteApiOperation';
import { GetApiOperation } from '../../application/api/GetApiOperation';
import { ListApiOperations } from '../../application/api/ListApiOperations';
import { ImportApiContract } from '../../application/api/ImportApiContract';

const createApiService = new CreateApiService(apiServiceRepository, eventPublisher);
const updateApiService = new UpdateApiService(apiServiceRepository, eventPublisher);
const deleteApiService = new DeleteApiService(apiServiceRepository, eventPublisher);
const getApiService = new GetApiService(apiServiceRepository);
const listApiServices = new ListApiServices(apiServiceRepository);
const createApiOperation = new CreateApiOperation(apiOperationRepository, apiServiceRepository);
const updateApiOperation = new UpdateApiOperation(apiOperationRepository, apiServiceRepository);
const deleteApiOperation = new DeleteApiOperation(apiOperationRepository);
const getApiOperation = new GetApiOperation(apiOperationRepository);
const listApiOperations = new ListApiOperations(apiOperationRepository);
const importApiContract = new ImportApiContract(apiServiceRepository, apiOperationRepository);

// Initialize controller
const apiController = new ApiController(
  createApiService,
  updateApiService,
  deleteApiService,
  getApiService,
  listApiServices,
  createApiOperation,
  updateApiOperation,
  deleteApiOperation,
  getApiOperation,
  listApiOperations,
  importApiContract,
  apiServiceRepository,
  apiOperationRepository
);

// Multer setup for multipart file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (['json', 'yaml', 'yml', 'graphql', 'gql'].includes(ext || '')) {
      cb(null, true);
    } else {
       cb(null, false);
    }
  },
});

const router = Router();

// Service routes
router.get('/projects/:projectId/services', (req, res) => apiController.listServices(req, res));
router.post('/projects/:projectId/services', (req, res) => apiController.createService(req, res));
router.get('/projects/:projectId/services/:serviceId', (req, res) => apiController.getService(req, res));
router.patch('/projects/:projectId/services/:serviceId', (req, res) => apiController.updateService(req, res));
router.delete('/projects/:projectId/services/:serviceId', (req, res) => apiController.deleteService(req, res));

// Operation routes
router.get('/projects/:projectId/services/:serviceId/apis', (req, res) => apiController.listOperations(req, res));
router.post('/projects/:projectId/services/:serviceId/apis', (req, res) => apiController.createOperation(req, res));
router.get('/projects/:projectId/services/:serviceId/apis/:apiId', (req, res) => apiController.getOperation(req, res));
router.patch('/projects/:projectId/services/:serviceId/apis/:apiId', (req, res) => apiController.updateOperation(req, res));
router.delete('/projects/:projectId/services/:serviceId/apis/:apiId', (req, res) => apiController.deleteOperation(req, res));

// Import route (multipart file upload)
router.post('/projects/:projectId/import', upload.single('file'), (req, res) => apiController.importContract(req, res));

export { router as apiRoutes };
export default router;