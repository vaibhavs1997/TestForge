// CreateApiOperation - Application Use Case
import { randomUUID } from 'node:crypto';
import { ApiOperationEntity } from '../../domain/api/ApiOperationEntity.js';
import { ApiOperationRepository } from '../../domain/api/ApiOperationRepository.js';
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository.js';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers.js';

export class CreateApiOperation {
  constructor(
    private readonly apiOperationRepository: ApiOperationRepository,
    private readonly apiServiceRepository: ApiServiceRepository
  ) {}

  async execute(params: {
    projectId: string;
    serviceId: string;
    name: string;
    method: string;
    path: string;
    description?: string;
    authenticationType?: string;
    status?: string;
  }): Promise<ApiOperationEntity> {
    const name = ValidationHelpers.validateRequired(params.name, 'API Name');
    const method = ValidationHelpers.validateRequired(params.method, 'HTTP Method');
    const trimmedPath = ValidationHelpers.validateRequired(params.path, 'Endpoint Path');

    if (!trimmedPath.startsWith('/')) {
      throw new Error('Endpoint Path must begin with "/"');
    }

    const service = await this.apiServiceRepository.findById(params.serviceId);
    if (!service) {
      throw new Error(`Service with id ${params.serviceId} not found`);
    }

    const projectId = params.projectId || service.projectId;

    const existingOperations = await this.apiOperationRepository.findByService(params.serviceId);
    const isDuplicate = existingOperations.some(
      op => op.method === method && op.path === trimmedPath
    );
    if (isDuplicate) {
      throw new Error(`API with ${params.method} ${trimmedPath} already exists in this service`);
    }

    const now = Date.now();
    const operation = new ApiOperationEntity(
      randomUUID(),
      projectId,
      params.serviceId,
      name,
      method,
      trimmedPath,
      ValidationHelpers.trimString(params.description),
      ValidationHelpers.trimString(params.authenticationType) || 'None',
      ValidationHelpers.trimString(params.status) || 'Active',
      now,
      now
    );

    return this.apiOperationRepository.create(operation);
  }
}

export default CreateApiOperation;
