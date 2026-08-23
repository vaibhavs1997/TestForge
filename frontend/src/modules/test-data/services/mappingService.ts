// Mapping service for Data Source Intelligence
import { ApiClient } from '../../../services/ApiClient';
import type { DataSourceMappingDto } from '../../../types/moduleContracts';
import { normalizeDataSourceMapping } from '../../../utils/moduleAdapters';

class MappingService extends ApiClient<DataSourceMappingDto> {
  constructor() {
    super('/projects/:projectId/test-data/mappings');
  }

  async listMappings(projectId: string, operationId?: string): Promise<DataSourceMappingDto[]> {
    const params = operationId ? { operationId } : {};
    return (await this.list(projectId, params)).map(normalizeDataSourceMapping);
  }

  async getMapping(projectId: string, mappingId: string): Promise<DataSourceMappingDto> {
    return normalizeDataSourceMapping(await this.get(projectId, mappingId));
  }

  async createMapping(
    projectId: string,
    payload: {
      serviceId: string;
      operationId: string;
      fieldPath: string;
      sourceType: string;
      datasetId?: string;
      datasetColumn?: string;
      environmentVariable?: string;
      runtimeOperationId?: string;
      runtimeField?: string;
      notes?: string;
    }
  ): Promise<DataSourceMappingDto> {
    return normalizeDataSourceMapping(await this.create(projectId, payload));
  }

  async updateMapping(
    projectId: string,
    mappingId: string,
    payload: {
      fieldPath?: string;
      sourceType?: string;
      datasetId?: string;
      datasetColumn?: string;
      environmentVariable?: string;
      runtimeOperationId?: string;
      runtimeField?: string;
      notes?: string;
    }
  ): Promise<DataSourceMappingDto> {
    return normalizeDataSourceMapping(await this.patch(projectId, mappingId, payload));
  }

  async deleteMapping(projectId: string, mappingId: string): Promise<void> {
    return this.delete(projectId, mappingId);
  }
}

export const mappingService = new MappingService();

export default mappingService;
