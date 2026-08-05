// UpdateApiOperation - Application Use Case
import { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';
import { ApiOperationRepository } from '../../domain/api/ApiOperationRepository';
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository';

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
  }): Promise<ApiOperationEntity> {
    const existing = await this.apiOperationRepository.findById(params.id);
    if (!existing) {
      throw new Error(`Operation with id ${params.id} not found`);
    }

    if (params.name !== undefined && !params.name.trim()) {
      throw new Error('API Name cannot be empty');
    }

    if (params.method !== undefined && !params.method.trim()) {
      throw new Error('HTTP Method cannot be empty');
    }

    if (params.path !== undefined && !params.path.trim()) {
      throw new Error('Endpoint Path cannot be empty');
    }

    const trimmedPath = params.path !== undefined ? params.path.trim() : existing.path;
    if (!trimmedPath.startsWith('/')) {
      throw new Error('Endpoint Path must begin with "/"');
    }

    const service = await this.apiServiceRepository.findById(existing.serviceId);
    if (!service) {
      throw new Error(`Service with id ${existing.serviceId} not found`);
    }

    const methodToCheck = params.method !== undefined ? params.method.trim() : existing.method;
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
    if (params.name !== undefined) updateData.name = params.name.trim();
    if (params.method !== undefined) updateData.method = params.method.trim();
    if (params.path !== undefined) updateData.path = trimmedPath;
    if (params.description !== undefined) updateData.description = params.description.trim();
    if (params.authenticationType !== undefined) updateData.authenticationType = params.authenticationType.trim() || 'None';
    if (params.status !== undefined) updateData.status = params.status.trim() || 'Active';

    return this.apiOperationRepository.update(params.id, updateData);
  }
}

export default UpdateApiOperation;