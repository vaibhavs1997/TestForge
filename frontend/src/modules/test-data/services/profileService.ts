// Profile service for Population Profiles
import { ApiClient } from '../../../services/ApiClient';

export interface PopulationProfileDto {
  id: string;
  datasetId: string;
  columnId: string;
  strategyType: string;
  configuration: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

class PopulationProfileService extends ApiClient<PopulationProfileDto> {
  constructor() {
    super('/projects/:projectId/test-data/profiles');
  }

  async listProfiles(projectId: string, datasetId?: string): Promise<PopulationProfileDto[]> {
    const params = datasetId ? { datasetId } : {};
    return this.list(projectId, params);
  }

  async getProfile(projectId: string, profileId: string): Promise<PopulationProfileDto> {
    return this.get(projectId, profileId);
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
    return this.create(projectId, payload);
  }

  async updateProfile(
    projectId: string,
    profileId: string,
    payload: {
      strategyType?: string;
      configuration?: Record<string, any>;
    }
  ): Promise<PopulationProfileDto> {
    return this.patch(projectId, profileId, payload);
  }

  async deleteProfile(projectId: string, profileId: string): Promise<void> {
    return this.delete(projectId, profileId);
  }
}

export const profileService = new PopulationProfileService();

export default profileService;