// Profile service for Population Profiles
import { ApiClient } from '../../../services/ApiClient';
import type { PopulationProfileDto } from '../../../types/moduleContracts';
import { normalizePopulationProfile } from '../../../utils/moduleAdapters';

class PopulationProfileService extends ApiClient<PopulationProfileDto> {
  constructor() {
    super('/projects/:projectId/test-data/profiles');
  }

  async listProfiles(projectId: string, datasetId?: string): Promise<PopulationProfileDto[]> {
    const params = datasetId ? { datasetId } : {};
    return (await this.list(projectId, params)).map(normalizePopulationProfile);
  }

  async getProfile(projectId: string, profileId: string): Promise<PopulationProfileDto> {
    return normalizePopulationProfile(await this.get(projectId, profileId));
  }

  async createProfile(
    projectId: string,
    payload: {
      datasetId: string;
      columnId: string;
      strategyType: string;
      configuration?: Record<string, any>;
    }
  ): Promise<PopulationProfileDto> {
    return normalizePopulationProfile(await this.create(projectId, payload));
  }

  async updateProfile(
    projectId: string,
    profileId: string,
    payload: {
      strategyType?: string;
      configuration?: Record<string, any>;
    }
  ): Promise<PopulationProfileDto> {
    return normalizePopulationProfile(await this.patch(projectId, profileId, payload));
  }

  async deleteProfile(projectId: string, profileId: string): Promise<void> {
    return this.delete(projectId, profileId);
  }
}

export const profileService = new PopulationProfileService();

export default profileService;
