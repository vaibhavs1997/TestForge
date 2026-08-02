// DeletePopulationProfile - Application Use Case
import { PopulationProfileRepository } from '../../domain/test-data/PopulationProfileRepository';

export class DeletePopulationProfile {
  constructor(private readonly profileRepository: PopulationProfileRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.profileRepository.findById(id);
    if (!existing) {
      throw new Error(`Profile with id ${id} not found`);
    }
    await this.profileRepository.delete(id);
  }
}

export default DeletePopulationProfile;