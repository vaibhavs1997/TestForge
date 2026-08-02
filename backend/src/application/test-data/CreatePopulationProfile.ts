// CreatePopulationProfile - Application Use Case
import { PopulationProfileRepository } from '../../domain/test-data/PopulationProfileRepository';
import { PopulationProfileEntity } from '../../domain/test-data/PopulationProfileEntity';

export class CreatePopulationProfile {
  constructor(private readonly profileRepository: PopulationProfileRepository) {}

  async execute(params: {
    datasetId: string;
    columnId: string;
    strategyType: string;
    configuration?: Record<string, any>;
  }): Promise<PopulationProfileEntity> {
    if (!params.columnId || !params.columnId.trim()) {
      throw new Error('Column ID is required');
    }

    if (!params.strategyType || !params.strategyType.trim()) {
      throw new Error('Strategy type is required');
    }

    // Check if profile already exists for this column
    const existing = await this.profileRepository.findByColumn(params.columnId);
    if (existing) {
      throw new Error(`Profile already exists for this column`);
    }

    const now = Date.now();
    const profile = new PopulationProfileEntity(
      crypto.randomUUID(),
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