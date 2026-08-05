// UpdatePopulationProfile - Application Use Case
import { PopulationProfileRepository } from '../../domain/test-data/PopulationProfileRepository';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';

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

    let strategyType: string | undefined;
    if (params.strategyType !== undefined) {
      strategyType = ValidationHelpers.validateRequired(params.strategyType, 'Strategy type');
    }

    const updateData: any = {};
    if (strategyType !== undefined) updateData.strategyType = strategyType;
    if (params.configuration !== undefined) updateData.configuration = params.configuration;

    return this.profileRepository.update(params.id, updateData);
  }
}

export default UpdatePopulationProfile;
