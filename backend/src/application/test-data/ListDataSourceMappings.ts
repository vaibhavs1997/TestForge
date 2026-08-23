// ListDataSourceMappings - Application Use Case
import { DataSourceMappingRepository } from '../../domain/test-data/DataSourceMappingRepository.js';

export class ListDataSourceMappings {
  constructor(private readonly mappingRepository: DataSourceMappingRepository) {}

  async execute(params: {
    projectId?: string;
    operationId?: string;
  }): Promise<any[]> {
    if (params.operationId) {
      return this.mappingRepository.findByOperation(params.operationId);
    }
    if (params.projectId) {
      return this.mappingRepository.findByProject(params.projectId);
    }
    return this.mappingRepository.list();
  }
}

export default ListDataSourceMappings;