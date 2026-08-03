// ProviderResolutionService - Resolves providers for the Execution Engine
// Reuses the existing ProviderRepository. Does NOT change execution behavior.
import { ProviderEntity } from '../../domain/providers/ProviderEntity';
import { ProviderRepository } from '../../domain/providers/ProviderRepository';
import { ProviderAdapterRegistry } from './adapters/ProviderAdapterRegistry';
import { ProviderAdapter } from './ProviderAdapter';

export interface ProviderResolutionResult {
  provider: ProviderEntity | null;
  adapter: ProviderAdapter | null;
}

export class ProviderResolutionService {
  constructor(private readonly providerRepository: ProviderRepository) {}

  async resolveById(id: string): Promise<ProviderResolutionResult> {
    const provider = await this.providerRepository.findById(id);
    if (!provider) return { provider: null, adapter: null };
    const adapter = ProviderAdapterRegistry.getInstance().get(provider.adapter);
    return { provider, adapter };
  }

  async resolveDefault(projectId: string, category?: string): Promise<ProviderResolutionResult> {
    let provider: ProviderEntity | null = await this.providerRepository.findDefault(projectId);
    if (!provider && category) {
      const providers = await this.providerRepository.findByProjectAndCategory(projectId, category);
      provider = providers.find(p => p.enabled) || null;
    }
    if (!provider) return { provider: null, adapter: null };
    const adapter = ProviderAdapterRegistry.getInstance().get(provider.adapter);
    return { provider, adapter };
  }

  async listByProjectAndCategory(projectId: string, category: string): Promise<ProviderEntity[]> {
    return this.providerRepository.findByProjectAndCategory(projectId, category);
  }
}

export default ProviderResolutionService;