import { Router } from 'express';
import multer from 'multer';
import type { FileFilterCallback } from 'multer';
import { ApiController } from '../../interfaces/api/ApiController';
import { CreateApiService } from './CreateApiService';
import { UpdateApiService } from './UpdateApiService';
import { DeleteApiService } from './DeleteApiService';
import { GetApiService } from './GetApiService';
import { ListApiServices } from './ListApiServices';
import { CreateApiOperation } from './CreateApiOperation';
import { UpdateApiOperation } from './UpdateApiOperation';
import { DeleteApiOperation } from './DeleteApiOperation';
import { GetApiOperation } from './GetApiOperation';
import { ListApiOperations } from './ListApiOperations';
import { ImportApiContract } from './ImportApiContract';
import type { ApiServiceRepository } from '../../domain/api/ApiServiceRepository';
import type { ApiOperationRepository } from '../../domain/api/ApiOperationRepository';
import type { EventPublisher } from '../EventPublisher';
import { asyncHandler } from '../../interfaces/middleware/AsyncHandler';

export interface ApiModuleDeps {
  apiServiceRepository: ApiServiceRepository;
  apiOperationRepository: ApiOperationRepository;
  eventPublisher: EventPublisher;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: Express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (['json', 'yaml', 'yml', 'graphql', 'gql'].includes(ext || '')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

export class ApiModule {
  readonly controller: ApiController;
  readonly router: Router;

  constructor(deps: ApiModuleDeps) {
    const createApiService = new CreateApiService(deps.apiServiceRepository, deps.eventPublisher);
    const updateApiService = new UpdateApiService(deps.apiServiceRepository, deps.eventPublisher);
    const deleteApiService = new DeleteApiService(
      deps.apiServiceRepository,
      deps.apiOperationRepository,
      deps.eventPublisher,
    );
    const getApiService = new GetApiService(deps.apiServiceRepository);
    const listApiServices = new ListApiServices(deps.apiServiceRepository);
    const createApiOperation = new CreateApiOperation(deps.apiOperationRepository, deps.apiServiceRepository);
    const updateApiOperation = new UpdateApiOperation(deps.apiOperationRepository, deps.apiServiceRepository);
    const deleteApiOperation = new DeleteApiOperation(deps.apiOperationRepository);
    const getApiOperation = new GetApiOperation(deps.apiOperationRepository);
    const listApiOperations = new ListApiOperations(deps.apiOperationRepository);
    const importApiContract = new ImportApiContract(
      deps.apiServiceRepository,
      deps.apiOperationRepository,
      deps.eventPublisher,
    );

    this.controller = new ApiController(
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
      deps.apiServiceRepository,
      deps.apiOperationRepository,
    );

    const router = Router();
    const apiController = this.controller;

    router.get('/projects/:projectId/services', asyncHandler((req, res) => apiController.listServices(req, res)));
    router.post('/projects/:projectId/services', asyncHandler((req, res) => apiController.createService(req, res)));
    router.get('/projects/:projectId/services/:serviceId', asyncHandler((req, res) => apiController.getService(req, res)));
    router.patch('/projects/:projectId/services/:serviceId', asyncHandler((req, res) => apiController.updateService(req, res)));
    router.delete('/projects/:projectId/services/:serviceId', asyncHandler((req, res) => apiController.deleteService(req, res)));

    router.get('/projects/:projectId/services/:serviceId/apis', asyncHandler((req, res) => apiController.listOperations(req, res)));
    router.post('/projects/:projectId/services/:serviceId/apis', asyncHandler((req, res) => apiController.createOperation(req, res)));
    router.get('/projects/:projectId/services/:serviceId/apis/:apiId', asyncHandler((req, res) => apiController.getOperation(req, res)));
    router.patch('/projects/:projectId/services/:serviceId/apis/:apiId', asyncHandler((req, res) => apiController.updateOperation(req, res)));
    router.delete('/projects/:projectId/services/:serviceId/apis/:apiId', asyncHandler((req, res) => apiController.deleteOperation(req, res)));

    router.post('/projects/:projectId/import', upload.single('file'), asyncHandler((req, res) => apiController.importContract(req, res)));
    router.post('/projects/:projectId/import/url', asyncHandler((req, res) => apiController.importContractFromUrl(req, res)));

    this.router = router;
  }
}

export default ApiModule;
