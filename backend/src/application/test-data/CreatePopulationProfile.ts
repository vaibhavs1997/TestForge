// CreatePopulationProfile - Application Use Case
import { randomUUID } from 'node:crypto';
import { PopulationProfileRepository } from '../../domain/test-data/PopulationProfileRepository';
import { PopulationProfileEntity } from '../../domain/test-data/PopulationProfileEntity';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';

export class CreatePopulationProfile {
  constructor(private readonly profileRepository: PopulationProfileRepository) {}

  async execute(params: {
    datasetId: string;
    columnId: string;
    strategyType: string;
    configuration?: Record<string, any>;
  }): Promise<PopulationProfileEntity> {
    ValidationHelpers.validateRequired(params.columnId, 'Column ID');
    ValidationHelpers.validateRequired(params.strategyType, 'Strategy type');

    // Check if profile already exists for this column
    const existing = await this.profileRepository.findByColumn(params.columnId);
    if (existing) {
      throw new Error(`Profile already exists for this column`);
    }

    const now = Date.now();
    const profile = new PopulationProfileEntity(
      randomUUID(),
      params.datasetId,
      params.columnId,
      params.strategyType,
      params.configuration || {},
      now,
      now
    );

    return this.profileRepository.create(profile);
  }
}

export default CreatePopulationProfile;
