// Execution Profile service

import { ApiClient } from '../../../services/ApiClient';
import type { ExecutionProfile, CreateProfileInput } from '../types/profile';
import type { ExecutionProfileDto } from '../../../types/moduleContracts';
import { normalizeExecutionProfile } from '../../../utils/moduleAdapters';

class ExecutionProfileService extends ApiClient<ExecutionProfileDto> {
  constructor() {
    super('/projects/:projectId/execution-profiles');
  }

  async listByProject(projectId: string): Promise<ExecutionProfile[]> {
    const profiles = await this.list(projectId);
    return profiles.map(normalizeExecutionProfile);
  }

  async getDefault(projectId: string): Promise<ExecutionProfile | null> {
    const path = `/projects/${projectId}/execution-profiles/default`;
    const profile = await this.getCustom<ExecutionProfileDto | null>(path);
    return profile ? normalizeExecutionProfile(profile) : null;
  }

  async getById(projectId: string, profileId: string): Promise<ExecutionProfile> {
    return normalizeExecutionProfile(await this.get(projectId, profileId));
  }

  async createProfile(projectId: string, input: CreateProfileInput): Promise<ExecutionProfile> {
    return normalizeExecutionProfile(await this.create(projectId, input));
  }

  async updateProfile(projectId: string, profileId: string, updates: Partial<CreateProfileInput>): Promise<ExecutionProfile> {
    return normalizeExecutionProfile(await this.patch(projectId, profileId, updates));
  }

  async deleteProfile(projectId: string, profileId: string): Promise<void> {
    return this.delete(projectId, profileId);
  }

  async duplicateProfile(projectId: string, profileId: string, newName: string): Promise<ExecutionProfile> {
    const path = `/projects/${projectId}/execution-profiles/${profileId}/duplicate`;
    return normalizeExecutionProfile(await this.post(path, { name: newName }));
  }

  async duplicate(projectId: string, profileId: string, newName: string): Promise<ExecutionProfile> {
    return this.duplicateProfile(projectId, profileId, newName);
  }
}

export const profileService = new ExecutionProfileService();

export default profileService;
