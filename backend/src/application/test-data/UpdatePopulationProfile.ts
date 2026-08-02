// UpdatePopulationProfile - Application Use Case
import { PopulationProfileRepository } from '../../domain/test-data/PopulationProfileRepository';

export class UpdatePopulationProfile {
  constructor(private readonly profileRepository: PopulationProfileRepository) {}

  async execute(params: {
    id: string;
    strategyType?: string;
    configuration?: Record<string, any>;
  }): Promise<any> {
    const existing = await this.profileRepository.findById(params.id);
    if (!existing) {
      throw new Error(`Profile with id ${params.id} not found`);
    }

    if (params.strategyType !== undefined && !params.strategyType.trim()) {
      throw new Error('Strategy type is required');
    }

    const updateData: any = {};
    if (params.strategyType !== undefined) updateData.strategyType = params.strategyType.trim();
    if (params.configuration !== undefined) updateData.configuration = params.configuration;

    return this.profileRepository.update(params.id, updateData);
  }
}

export default UpdatePopulationProfile;