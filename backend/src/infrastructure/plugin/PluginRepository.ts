// PluginRepository - Infrastructure implementation for Plugin Framework
// Uses in-memory storage. Can be swapped for DB implementation.

import { PluginEntity, PluginRepository } from '../../domain/plugin';

export class InMemoryPluginRepository implements PluginRepository {
  private plugins: Map<string, PluginEntity> = new Map();

  async create(plugin: PluginEntity): Promise<PluginEntity> {
    this.plugins.set(plugin.id, plugin);
    return plugin;
  }

  async findById(id: string): Promise<PluginEntity | null> {
    return this.plugins.get(id) || null;
  }

  async findByProject(projectId: string): Promise<PluginEntity[]> {
    return Array.from(this.plugins.values()).filter(
      p => p.projectId === projectId || p.projectId === null
    );
  }

  async findByCategory(category: string): Promise<PluginEntity[]> {
    return Array.from(this.plugins.values()).filter(p => p.category === category);
  }

  async findByProjectAndCategory(projectId: string, category: string): Promise<PluginEntity[]> {
    return Array.from(this.plugins.values()).filter(
      p => (p.projectId === projectId || p.projectId === null) && p.category === category
    );
  }

  async findEnabled(): Promise<PluginEntity[]> {
    return Array.from(this.plugins.values()).filter(p => p.enabled);
  }

  async findByNameAndVersion(name: string, version: string): Promise<PluginEntity | null> {
    return Array.from(this.plugins.values()).find(
      p => p.name === name && p.version === version
    ) || null;
  }

  async list(): Promise<PluginEntity[]> {
    return Array.from(this.plugins.values());
  }

  async update(id: string, updates: Partial<PluginEntity>): Promise<PluginEntity | null> {
    const existing = this.plugins.get(id);
    if (!existing) return null;
    
    const updated = new PluginEntity(
      existing.id,
      existing.name,
      existing.version,
      existing.author,
      existing.category,
      existing.capabilities,
      updates.configuration || existing.configuration,
      updates.enabled !== undefined ? updates.enabled : existing.enabled,
      existing.projectId,
      existing.createdAt,
      Date.now()
    );
    
    this.plugins.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.plugins.delete(id);
  }
}

export default InMemoryPluginRepository;