import { Router } from 'express';
import multer from 'multer';
import type { FileFilterCallback } from 'multer';
import { ApiController } from '../../interfaces/api/ApiController.js';
import { CreateApiService } from './CreateApiService.js';
import { UpdateApiService } from './UpdateApiService.js';
import { DeleteApiService } from './DeleteApiService.js';
import { GetApiService } from './GetApiService.js';
import { ListApiServices } from './ListApiServices.js';
import { CreateApiOperation } from './CreateApiOperation.js';
import { UpdateApiOperation } from './UpdateApiOperation.js';
import { DeleteApiOperation } from './DeleteApiOperation.js';
import { DeleteApiContract } from './DeleteApiContract.js';
import { GetApiOperation } from './GetApiOperation.js';
import { ListApiOperations } from './ListApiOperations.js';
import { ExecuteApiRequest } from './ExecuteApiRequest.js';
import { ImportApiContract } from './ImportApiContract.js';
import { RefreshApiContract } from './RefreshApiContract.js';
import type { ApiServiceRepository } from '../../domain/api/ApiServiceRepository.js';
import type { ApiOperationRepository } from '../../domain/api/ApiOperationRepository.js';
import type { EventPublisher } from '../EventPublisher.js';
import type { FieldDataRuleRepository } from '../../domain/test-data/FieldDataRuleRepository.js';
import { asyncHandler } from '../../interfaces/middleware/AsyncHandler.js';

export interface ApiModuleDeps {
  apiServiceRepository: ApiServiceRepository;
  apiOperationRepository: ApiOperationRepository;
  eventPublisher: EventPublisher;
  fieldDataRuleRepository?: FieldDataRuleRepository;
  impactRepositories?: Array<{ findByProject(projectId: string): Promise<any[]>; impactKind?: 'requirementMappings' | 'testCases' | 'testCaseVersions' | 'suites' | 'schedules' | 'runtimeLinks' | 'fieldDataRules' }>;
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
    const deleteApiContract = new DeleteApiContract(
      deps.apiServiceRepository,
      deps.apiOperationRepository,
      deps.eventPublisher,
    );
    const getApiOperation = new GetApiOperation(deps.apiOperationRepository);
    const listApiOperations = new ListApiOperations(deps.apiOperationRepository);
    const executeApiRequest = new ExecuteApiRequest();
    const importApiContract = new ImportApiContract(
      deps.apiServiceRepository,
      deps.apiOperationRepository,
      deps.eventPublisher,
      deps.fieldDataRuleRepository,
      deps.impactRepositories,
    );
    const refreshApiContract = new RefreshApiContract(deps.apiServiceRepository, importApiContract);

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
      refreshApiContract,
      deleteApiContract,
      executeApiRequest,
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
    router.post('/projects/:projectId/services/:serviceId/api-contract/refresh', asyncHandler((req, res) => apiController.refreshContract(req, res)));
    router.delete('/projects/:projectId/api-contract', asyncHandler((req, res) => apiController.deleteContract(req, res)));
    router.post('/projects/:projectId/api-execution', asyncHandler((req, res) => apiController.executeOperation(req, res)));

    router.post('/projects/:projectId/import', upload.single('file'), asyncHandler((req, res) => apiController.importContract(req, res)));
    router.post('/projects/:projectId/import/preview', upload.single('file'), asyncHandler((req, res) => apiController.previewImportContract(req, res)));
    router.post('/projects/:projectId/import/url', asyncHandler((req, res) => apiController.importContractFromUrl(req, res)));
    router.post('/projects/:projectId/import/url/preview', asyncHandler((req, res) => apiController.previewImportContractFromUrl(req, res)));

    this.router = router;
  }
}

export default ApiModule;
