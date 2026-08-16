// Environment service for Environment Management
import { ApiClient } from '../../../services/ApiClient';
import type { EnvironmentDto } from '../../../types/apiModels';

class EnvironmentService extends ApiClient<EnvironmentDto> {
  constructor() {
    super('/projects/:projectId/environments');
  }

  async listEnvironments(projectId: string): Promise<EnvironmentDto[]> {
    return this.list(projectId);
  }

  async createEnvironment(
    projectId: string,
    payload: {
      name: string;
      baseUrl: string;
      description?: string;
      authentication?: any;
      variables?: Record<string, string>;
      timeout?: number;
    }
  ): Promise<EnvironmentDto> {
    return this.create(projectId, payload);
  }

  async updateEnvironment(
    projectId: string,
    environmentId: string,
    payload: {
      name?: string;
      baseUrl?: string;
      description?: string;
      authentication?: any;
      variables?: Record<string, string>;
      timeout?: number;
      isDefault?: boolean;
    }
  ): Promise<EnvironmentDto> {
    return this.patch(projectId, environmentId, payload);
  }

  async deleteEnvironment(projectId: string, environmentId: string): Promise<void> {
    return this.delete(projectId, environmentId);
  }

  /** Create or update by environment name within the project (case-insensitive). */
  async upsertEnvironment(
    projectId: string,
    payload: {
      name: string;
      baseUrl: string;
      description?: string;
      authentication?: any;
      variables?: Record<string, string>;
      timeout?: number;
    },
  ): Promise<{ action: 'created' | 'updated'; environment: EnvironmentDto }> {
    const result = await this.batchUpsertEnvironments(projectId, [payload]);
    const environment = result.environments[0];
    return {
      action: result.created > 0 ? 'created' : 'updated',
      environment,
    };
  }

  async batchUpsertEnvironments(
    projectId: string,
    environments: Array<{
      name: string;
      baseUrl: string;
      description?: string;
      authentication?: any;
      variables?: Record<string, string>;
      timeout?: number;
    }>,
  ): Promise<{ created: number; updated: number; environments: EnvironmentDto[] }> {
    if (environments.length === 0) {
      return { created: 0, updated: 0, environments: [] };
    }
    return this.post(`/projects/${projectId}/environments/upsert-batch`, { environments });
  }
}

export const environmentService = new EnvironmentService();

export default environmentService;
