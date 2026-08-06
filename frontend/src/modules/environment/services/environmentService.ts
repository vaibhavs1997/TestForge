// Environment service for Environment Management
import { ApiClient } from '../../../services/ApiClient';

export interface EnvironmentDto {
  id: string;
  projectId: string;
  name: string;
  baseUrl: string;
  description: string;
  authentication: any;
  variables: Record<string, string>;
  timeout: number;
  createdAt: number;
  updatedAt: number;
}

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
    const existingList = await this.listEnvironments(projectId);
    const nameLower = payload.name.trim().toLowerCase();
    const match = existingList.find((e) => e.name.trim().toLowerCase() === nameLower);

    if (match) {
      const environment = await this.updateEnvironment(projectId, match.id, {
        baseUrl: payload.baseUrl,
        description: payload.description,
        variables: payload.variables,
        timeout: payload.timeout,
      });
      return { action: 'updated', environment };
    }

    const environment = await this.createEnvironment(projectId, payload);
    return { action: 'created', environment };
  }
}

export const environmentService = new EnvironmentService();

export default environmentService;