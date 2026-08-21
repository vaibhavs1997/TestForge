// UpdateApiOperation - Application Use Case
import { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';
import { ApiOperationRepository } from '../../domain/api/ApiOperationRepository';
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';

export class UpdateApiOperation {
  constructor(
    private readonly apiOperationRepository: ApiOperationRepository,
    private readonly apiServiceRepository: ApiServiceRepository
  ) {}

  async execute(params: {
    id: string;
    name?: string;
    method?: string;
    path?: string;
    description?: string;
    authenticationType?: string;
    status?: string;
    sampleRequestBody?: Record<string, unknown> | null;
  }): Promise<ApiOperationEntity> {
    const existing = await this.apiOperationRepository.findById(params.id);
    if (!existing) {
      throw new Error(`Operation with id ${params.id} not found`);
    }

    if (params.name !== undefined) {
      ValidationHelpers.validateNotEmpty(params.name, 'API Name');
    }

    if (params.method !== undefined) {
      ValidationHelpers.validateNotEmpty(params.method, 'HTTP Method');
    }

    if (params.path !== undefined) {
      ValidationHelpers.validateNotEmpty(params.path, 'Endpoint Path');
    }

    const trimmedPath = params.path !== undefined ? ValidationHelpers.trimString(params.path) : existing.path;
    if (!trimmedPath.startsWith('/')) {
      throw new Error('Endpoint Path must begin with "/"');
    }

    const service = await this.apiServiceRepository.findById(existing.serviceId);
    if (!service) {
      throw new Error(`Service with id ${existing.serviceId} not found`);
    }

    const methodToCheck = params.method !== undefined ? ValidationHelpers.trimString(params.method) : existing.method;
    if (methodToCheck !== existing.method || trimmedPath !== existing.path) {
      const existingOperations = await this.apiOperationRepository.findByService(existing.serviceId);
      const isDuplicate = existingOperations.some(
        op => op.id !== params.id && op.method === methodToCheck && op.path === trimmedPath
      );
      if (isDuplicate) {
        throw new Error(`API with ${methodToCheck} ${trimmedPath} already exists in this service`);
      }
    }

    const updateData: any = {};
    if (params.name !== undefined) updateData.name = ValidationHelpers.trimString(params.name);
    if (params.method !== undefined) updateData.method = ValidationHelpers.trimString(params.method);
    if (params.path !== undefined) updateData.path = trimmedPath;
    if (params.description !== undefined) updateData.description = ValidationHelpers.trimString(params.description);
    if (params.authenticationType !== undefined) updateData.authenticationType = ValidationHelpers.trimString(params.authenticationType) || 'None';
    if (params.status !== undefined) updateData.status = ValidationHelpers.trimString(params.status) || 'Active';
    if (params.sampleRequestBody !== undefined) {
      updateData.sampleRequestBody = params.sampleRequestBody && typeof params.sampleRequestBody === 'object'
        ? params.sampleRequestBody
        : null;
    }

    return this.apiOperationRepository.update(params.id, updateData);
  }
}

export default UpdateApiOperation;
