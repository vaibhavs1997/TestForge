// PluginRepository - Domain Repository for Plugin Framework
// Handles persistence operations for PluginEntity.

import { PluginEntity } from './PluginEntity.js';

export interface PluginRepository {
  create(plugin: PluginEntity): Promise<PluginEntity>;
  findById(id: string): Promise<PluginEntity | null>;
  findByProject(projectId: string): Promise<PluginEntity[]>;
  findByCategory(category: string): Promise<PluginEntity[]>;
  findByProjectAndCategory(projectId: string, category: string): Promise<PluginEntity[]>;
  findEnabled(): Promise<PluginEntity[]>;
  findByNameAndVersion(name: string, version: string): Promise<PluginEntity | null>;
  list(): Promise<PluginEntity[]>;
  update(id: string, updates: Partial<PluginEntity>): Promise<PluginEntity | null>;
  delete(id: string): Promise<void>;
}

export default PluginRepository;