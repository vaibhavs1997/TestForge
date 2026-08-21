// GetPopulationProfile - Application Use Case
import { PopulationProfileRepository } from '../../domain/test-data/PopulationProfileRepository.js';

export class GetPopulationProfile {
  constructor(private readonly profileRepository: PopulationProfileRepository) {}

  async execute(id: string): Promise<any> {
    const profile = await this.profileRepository.findById(id);
    if (!profile) {
      throw new Error(`Profile with id ${id} not found`);
    }
    return profile;
  }
}

export default GetPopulationProfile;