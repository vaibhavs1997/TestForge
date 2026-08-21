// PluginService - Application Service for Plugin Framework
// Manages plugin lifecycle and registration.

import { randomUUID } from 'node:crypto';
import { PluginEntity } from '../../domain/plugin/index.js';
import type { PluginCategory, PluginCapability, PluginRepository } from '../../domain/plugin/index.js';
import { PluginRegistry } from './PluginRegistry.js';
import { EventPublisher } from '../EventPublisher.js';

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
    private readonly pluginRegistry: PluginRegistry,
    private readonly eventPublisher?: EventPublisher
  ) {}

  async create(input: CreatePluginInput): Promise<PluginEntity> {
    const now = Date.now();
    const plugin = new PluginEntity(
      randomUUID(),
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
    const created = await this.pluginRegistry.register(plugin);

    // Publish through central EventPublisher — triggers audit, versioning,
    // cache invalidation, recommendation refresh, and pipeline refresh.
    if (this.eventPublisher) {
      await this.eventPublisher.created('plugin', created.id, created.projectId || '', 'Plugin', created as any);
    }

    return created;
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

    // Publish ENABLED event through central EventPublisher.
    if (this.eventPublisher) {
      await this.eventPublisher.enabled('plugin', plugin.id, plugin.projectId || '', 'Plugin', true);
    }

    return plugin;
  }

  async disablePlugin(id: string): Promise<PluginEntity> {
    const plugin = await this.pluginRegistry.disablePlugin(id);
    if (!plugin) {
      throw new Error(`Plugin with id ${id} not found`);
    }

    // Publish DISABLED event through central EventPublisher.
    if (this.eventPublisher) {
      await this.eventPublisher.enabled('plugin', plugin.id, plugin.projectId || '', 'Plugin', false);
    }

    return plugin;
  }

  async updateConfiguration(id: string, configuration: Record<string, any>): Promise<PluginEntity> {
    const existing = await this.getPlugin(id);
    const plugin = await this.pluginRegistry.updateConfiguration(id, configuration);
    if (!plugin) {
      throw new Error(`Plugin with id ${id} not found`);
    }

    // Publish UPDATED event through central EventPublisher.
    if (this.eventPublisher) {
      await this.eventPublisher.updated('plugin', plugin.id, plugin.projectId || '', 'Plugin', existing as any, plugin as any);
    }

    return plugin;
  }

  async deletePlugin(id: string): Promise<void> {
    const existing = await this.getPlugin(id);
    await this.pluginRegistry.unregister(id);

    // Publish DELETED event through central EventPublisher.
    if (this.eventPublisher) {
      await this.eventPublisher.deleted('plugin', existing.id, existing.projectId || '', 'Plugin', existing as any);
    }
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