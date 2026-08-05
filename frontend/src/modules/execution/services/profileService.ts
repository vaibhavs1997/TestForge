// Execution Profile service

import { ApiClient } from '../../../services/ApiClient';
import type { ExecutionProfile, CreateProfileInput } from '../types/profile';

class ExecutionProfileService extends ApiClient<ExecutionProfile> {
  constructor() {
    super('/projects/:projectId/execution-profiles');
  }

  async listByProject(projectId: string): Promise<ExecutionProfile[]> {
    return this.list(projectId);
  }

  async getDefault(projectId: string): Promise<ExecutionProfile | null> {
    const path = `/projects/${projectId}/execution-profiles/default`;
    return this.getCustom(path);
  }

  async getById(projectId: string, profileId: string): Promise<ExecutionProfile> {
    return this.get(projectId, profileId);
  }

  async createProfile(projectId: string, input: CreateProfileInput): Promise<ExecutionProfile> {
    return this.create(projectId, input);
  }

  async updateProfile(projectId: string, profileId: string, updates: Partial<CreateProfileInput>): Promise<ExecutionProfile> {
    return this.patch(projectId, profileId, updates);
  }

  async deleteProfile(projectId: string, profileId: string): Promise<void> {
    return this.delete(projectId, profileId);
  }

  async duplicateProfile(projectId: string, profileId: string, newName: string): Promise<ExecutionProfile> {
    const path = `/projects/${projectId}/execution-profiles/${profileId}/duplicate`;
    return this.post(path, { name: newName });
  }

  async duplicate(projectId: string, profileId: string, newName: string): Promise<ExecutionProfile> {
    return this.duplicateProfile(projectId, profileId, newName);
  }
}

export const profileService = new ExecutionProfileService();

export default profileService;