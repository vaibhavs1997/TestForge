// GetDataSourceMapping - Application Use Case
import { DataSourceMappingRepository } from '../../domain/test-data/DataSourceMappingRepository';

export class GetDataSourceMapping {
  constructor(private readonly mappingRepository: DataSourceMappingRepository) {}

  async execute(id: string): Promise<any> {
    const mapping = await this.mappingRepository.findById(id);
    if (!mapping) {
      throw new Error(`Mapping with id ${id} not found`);
    }
    return mapping;
  }
}

export default GetDataSourceMapping;