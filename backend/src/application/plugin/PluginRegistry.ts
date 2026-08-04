// PluginRegistry - Central registry for plugin resolution
// Allows modules to resolve plugins by category and capability.

import { PluginEntity } from '../../domain/plugin';
import type { PluginCategory, PluginCapability, PluginRepository } from '../../domain/plugin';

export class PluginRegistry {
  constructor(private readonly pluginRepository: PluginRepository) {}

  async register(plugin: PluginEntity): Promise<PluginEntity> {
    return this.pluginRepository.create(plugin);
  }

  async resolveByCategory(category: PluginCategory): Promise<PluginEntity[]> {
    return this.pluginRepository.findByCategory(category);
  }

  async resolveByCategoryAndCapability(
    category: PluginCategory,
    capabilityName: string
  ): Promise<PluginEntity[]> {
    const plugins = await this.pluginRepository.findByCategory(category);
    return plugins.filter(plugin => 
      plugin.enabled && plugin.capabilities.some(cap => cap.name === capabilityName)
    );
  }

  async resolveByProjectAndCategory(
    projectId: string,
    category: PluginCategory
  ): Promise<PluginEntity[]> {
    return this.pluginRepository.findByProjectAndCategory(projectId, category);
  }

  async resolveByProjectCategoryAndCapability(
    projectId: string,
    category: PluginCategory,
    capabilityName: string
  ): Promise<PluginEntity[]> {
    const plugins = await this.pluginRepository.findByProjectAndCategory(projectId, category);
    return plugins.filter(plugin =>
      plugin.enabled && plugin.capabilities.some(cap => cap.name === capabilityName)
    );
  }

  async getPlugin(id: string): Promise<PluginEntity | null> {
    return this.pluginRepository.findById(id);
  }

  async listPlugins(): Promise<PluginEntity[]> {
    return this.pluginRepository.list();
  }

  async listEnabledPlugins(): Promise<PluginEntity[]> {
    return this.pluginRepository.findEnabled();
  }

  async enablePlugin(id: string): Promise<PluginEntity | null> {
    return this.pluginRepository.update(id, { enabled: true });
  }

  async disablePlugin(id: string): Promise<PluginEntity | null> {
    return this.pluginRepository.update(id, { enabled: false });
  }

  async updateConfiguration(id: string, configuration: Record<string, any>): Promise<PluginEntity | null> {
    return this.pluginRepository.update(id, { configuration });
  }

  async unregister(id: string): Promise<void> {
    return this.pluginRepository.delete(id);
  }

  // Health check for a plugin
  async checkHealth(id: string): Promise<{ status: 'healthy' | 'unhealthy' | 'unknown'; message: string }> {
    const plugin = await this.pluginRepository.findById(id);
    if (!plugin) {
      return { status: 'unknown', message: 'Plugin not found' };
    }
    if (!plugin.enabled) {
      return { status: 'unhealthy', message: 'Plugin is disabled' };
    }
    // Placeholder health check - in real implementation would call plugin's health endpoint
    return { status: 'healthy', message: 'Plugin is enabled and registered' };
  }
}

export default PluginRegistry;