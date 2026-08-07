// Provider service for Data Providers
import { ApiClient } from '../../../services/ApiClient';
import type { Provider, CreateProviderInput, ProviderTestResult, AdapterInfo } from '../types/provider';

class ProviderService extends ApiClient<Provider> {
  constructor() {
    super('/projects/:projectId/providers');
  }

  async listByProject(projectId: string, category?: string): Promise<Provider[]> {
    const params = category ? { category } : {};
    return this.list(projectId, params);
  }

  async getById(projectId: string, providerId: string): Promise<Provider> {
    return this.get(projectId, providerId);
  }

  async createProvider(projectId: string, input: CreateProviderInput): Promise<Provider> {
    return this.create(projectId, input);
  }

  async updateProvider(projectId: string, providerId: string, updates: Partial<CreateProviderInput>): Promise<Provider> {
    return this.patch(projectId, providerId, updates);
  }

  async deleteProvider(projectId: string, providerId: string): Promise<void> {
    return this.delete(projectId, providerId);
  }

  async testConnection(projectId: string, providerId: string): Promise<ProviderTestResult> {
    const path = `/projects/${projectId}/providers/${providerId}/test`;
    return this.post(path);
  }

  async listAdapterTypes(): Promise<AdapterInfo[]> {
    const path = `/adapter-types`;
    return this.getCustom(path);
  }
}

export const providerService = new ProviderService();

export default providerService;