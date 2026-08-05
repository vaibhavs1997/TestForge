// ProviderResolutionService - Resolves providers for the Execution Engine
// Refactored to use Plugin Registry for provider resolution.
// Does NOT change execution behavior.
import { ProviderEntity } from '../../domain/providers/ProviderEntity';
import { ProviderRepository } from '../../domain/providers/ProviderRepository';
import { ProviderAdapterRegistry } from './adapters/ProviderAdapterRegistry';
import { ProviderAdapter } from './ProviderAdapter';
import { PluginRegistry } from '../../application/plugin/PluginRegistry';

export interface ProviderResolutionResult {
  provider: ProviderEntity | null;
  adapter: ProviderAdapter | null;
  pluginId: string | null;
}

export class ProviderResolutionService {
  constructor(
    private readonly providerRepository: ProviderRepository,
    private readonly pluginRegistry?: PluginRegistry
  ) {}

  async resolveById(id: string): Promise<ProviderResolutionResult> {
    const provider = await this.providerRepository.findById(id);
    if (!provider) return { provider: null, adapter: null, pluginId: null };
    
    // Resolve adapter through Plugin Registry if available
    let pluginId: string | null = null;
    if (this.pluginRegistry) {
      const plugins = await this.pluginRegistry.resolveByCategoryAndCapability('Provider', provider.adapter);
      if (plugins.length > 0) {
        pluginId = plugins[0].id;
      }
    }
    
    const adapter = ProviderAdapterRegistry.getInstance().get(provider.adapter);
    return { provider, adapter, pluginId };
  }

  async resolveDefault(projectId: string, category?: string): Promise<ProviderResolutionResult> {
    let provider: ProviderEntity | null = await this.providerRepository.findDefault(projectId);
    if (!provider && category) {
      const providers = await this.providerRepository.findByProjectAndCategory(projectId, category);
      provider = providers.find(p => p.enabled) || null;
    }
    if (!provider) return { provider: null, adapter: null, pluginId: null };
    
    // Resolve adapter through Plugin Registry if available
    let pluginId: string | null = null;
    if (this.pluginRegistry) {
      const plugins = await this.pluginRegistry.resolveByCategoryAndCapability('Provider', provider.adapter);
      if (plugins.length > 0) {
        pluginId = plugins[0].id;
      }
    }
    
    const adapter = ProviderAdapterRegistry.getInstance().get(provider.adapter);
    return { provider, adapter, pluginId };
  }

  async listByProjectAndCategory(projectId: string, category: string): Promise<ProviderEntity[]> {
    return this.providerRepository.findByProjectAndCategory(projectId, category);
  }
}

export default ProviderResolutionService;