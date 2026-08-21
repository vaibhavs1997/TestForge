// ListPopulationProfiles - Application Use Case
import { PopulationProfileRepository } from '../../domain/test-data/PopulationProfileRepository.js';

export class ListPopulationProfiles {
  constructor(private readonly profileRepository: PopulationProfileRepository) {}

  async execute(params: {
    datasetId?: string;
  }): Promise<any[]> {
    if (params.datasetId) {
      return this.profileRepository.findByDataset(params.datasetId);
    }
    return this.profileRepository.list();
  }
}

export default ListPopulationProfiles;