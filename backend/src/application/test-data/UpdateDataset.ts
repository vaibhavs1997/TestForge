// UpdateDataset - Application Use Case
import { DatasetRepository } from '../../domain/test-data/DatasetRepository';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';

export class UpdateDataset {
  constructor(private readonly datasetRepository: DatasetRepository) {}

  async execute(params: {
    id: string;
    name?: string;
    description?: string;
    category?: string;
  }): Promise<any> {
    const existing = await this.datasetRepository.findById(params.id);
    if (!existing) {
      throw new Error(`Dataset with id ${params.id} not found`);
    }

    if (params.name !== undefined) {
      ValidationHelpers.validateNotEmpty(params.name, 'Dataset Name');
      await ValidationHelpers.validateUniqueName(
        this.datasetRepository,
        params.name,
        existing.projectId,
        existing.name
      );
    }

    const updateData: any = {};
    if (params.name !== undefined) updateData.name = params.name.trim();
    if (params.description !== undefined) updateData.description = ValidationHelpers.trimString(params.description);
    if (params.category !== undefined) updateData.category = ValidationHelpers.trimString(params.category) || 'Custom';

    return this.datasetRepository.update(params.id, updateData);
  }
}

export default UpdateDataset;