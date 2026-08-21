// DeleteDataSourceMapping - Application Use Case
import { DataSourceMappingRepository } from '../../domain/test-data/DataSourceMappingRepository.js';

export class DeleteDataSourceMapping {
  constructor(private readonly mappingRepository: DataSourceMappingRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.mappingRepository.findById(id);
    if (!existing) {
      throw new Error(`Mapping with id ${id} not found`);
    }
    await this.mappingRepository.delete(id);
  }
}

export default DeleteDataSourceMapping;