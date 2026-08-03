// PluginService - Application Service for Plugin Framework
// Manages plugin lifecycle and registration.

import { PluginEntity, PluginCategory, PluginCapability } from '../../domain/plugin';
import { PluginRepository } from '../../domain/plugin';
import { PluginRegistry } from './PluginRegistry';

export interface CreatePluginInput {
  name: string;
  version: string;
  author: string;
  category: PluginCategory;
  capabilities: PluginCapability[];
  configuration: Record<string, any>;
  enabled?: boolean;
  projectId?: string | null;
}

export class PluginService {
  constructor(
    private readonly pluginRepository: PluginRepository,
    private readonly pluginRegistry: PluginRegistry
  ) {}

  async create(input: CreatePluginInput): Promise<PluginEntity> {
    const now = Date.now();
    const plugin = new PluginEntity(
      crypto.randomUUID(),
      input.name,
      input.version,
      input.author,
      input.category,
      input.capabilities,
      input.configuration,
      input.enabled ?? true,
      input.projectId ?? null,
      now,
      now
    );
    return this.pluginRegistry.register(plugin);
  }

  async getPlugin(id: string): Promise<PluginEntity> {
    const plugin = await this.pluginRegistry.getPlugin(id);
    if (!plugin) {
      throw new Error(`Plugin with id ${id} not found`);
    }
    return plugin;
  }

  async listPlugins(): Promise<PluginEntity[]> {
    return this.pluginRegistry.listPlugins();
  }

  async listEnabledPlugins(): Promise<PluginEntity[]> {
    return this.pluginRegistry.listEnabledPlugins();
  }

  async listByCategory(category: PluginCategory): Promise<PluginEntity[]> {
    return this.pluginRegistry.resolveByCategory(category);
  }

  async listByProject(projectId: string): Promise<PluginEntity[]> {
    return this.pluginRepository.findByProject(projectId);
  }

  async enablePlugin(id: string): Promise<PluginEntity> {
    const plugin = await this.pluginRegistry.enablePlugin(id);
    if (!plugin) {
      throw new Error(`Plugin with id ${id} not found`);
    }
    return plugin;
  }

  async disablePlugin(id: string): Promise<PluginEntity> {
    const plugin = await this.pluginRegistry.disablePlugin(id);
    if (!plugin) {
      throw new Error(`Plugin with id ${id} not found`);
    }
    return plugin;
  }

  async updateConfiguration(id: string, configuration: Record<string, any>): Promise<PluginEntity> {
    const plugin = await this.pluginRegistry.updateConfiguration(id, configuration);
    if (!plugin) {
      throw new Error(`Plugin with id ${id} not found`);
    }
    return plugin;
  }

  async deletePlugin(id: string): Promise<void> {
    return this.pluginRegistry.unregister(id);
  }

  async checkHealth(id: string): Promise<{ status: string; message: string }> {
    return this.pluginRegistry.checkHealth(id);
  }

  async resolveByCategoryAndCapability(
    category: PluginCategory,
    capabilityName: string
  ): Promise<PluginEntity[]> {
    return this.pluginRegistry.resolveByCategoryAndCapability(category, capabilityName);
  }
}

export default PluginService;