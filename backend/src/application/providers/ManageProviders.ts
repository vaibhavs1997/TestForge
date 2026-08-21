// ManageProviders - Application Use Case for Provider Framework
// Handles CRUD operations for providers (create, get, list, update, delete).
import { randomUUID } from 'node:crypto';
import { ProviderEntity, ProviderCategory, ProviderAdapterType } from '../../domain/providers/ProviderEntity.js';
import { ProviderRepository } from '../../domain/providers/ProviderRepository.js';
import { ProviderAdapterRegistry } from '../../infrastructure/providers/adapters/ProviderAdapterRegistry.js';

export interface CreateProviderInput {
  projectId: string;
  name: string;
  category: ProviderCategory;
  adapter: ProviderAdapterType;
  configuration: Record<string, any>;
  credentials: Record<string, any>;
  enabled?: boolean;
  isDefault?: boolean;
}

export interface UpdateProviderInput {
  name?: string;
  category?: ProviderCategory;
  adapter?: ProviderAdapterType;
  configuration?: Record<string, any>;
  credentials?: Record<string, any>;
  enabled?: boolean;
  isDefault?: boolean;
}

export class ManageProviders {
  constructor(private readonly providerRepository: ProviderRepository) {}

  async create(input: CreateProviderInput): Promise<ProviderEntity> {
    const now = Date.now();
    const provider = new ProviderEntity(
      randomUUID(),
      input.projectId,
      input.name,
      input.category,
      input.adapter,
      input.configuration || {},
      input.credentials || {},
      input.enabled ?? true,
      input.isDefault ?? false,
      now,
      now
    );

    // Validate against the adapter registry
    const adapter = ProviderAdapterRegistry.getInstance().get(provider.adapter);
    if (adapter) {
      const errors = adapter.validateConfiguration(provider.configuration, provider.credentials);
      if (errors.length > 0) {
        throw new Error(`Provider configuration invalid: ${errors.join(', ')}`);
      }
    }

    // If this is the first provider or default, unset others
    if (provider.isDefault) {
      const existing = await this.providerRepository.findByProject(input.projectId);
      for (const p of existing) {
        if (p.isDefault) {
          await this.providerRepository.update(p.id, { isDefault: false });
        }
      }
    }

    return this.providerRepository.create(provider);
  }

  async get(id: string): Promise<ProviderEntity> {
    const provider = await this.providerRepository.findById(id);
    if (!provider) {
      throw new Error(`Provider with id ${id} not found`);
    }
    return provider;
  }

  async listByProject(projectId: string): Promise<ProviderEntity[]> {
    return this.providerRepository.findByProject(projectId);
  }

  async listByCategory(projectId: string, category: string): Promise<ProviderEntity[]> {
    return this.providerRepository.findByProjectAndCategory(projectId, category);
  }

  async list(): Promise<ProviderEntity[]> {
    return this.providerRepository.list();
  }

  async update(id: string, updates: UpdateProviderInput): Promise<ProviderEntity> {
    const existing = await this.providerRepository.findById(id);
    if (!existing) {
      throw new Error(`Provider with id ${id} not found`);
    }

    const now = Date.now();
    const mergedUpdates: Partial<ProviderEntity> = {
      ...updates,
      updatedAt: now,
    };

    // If setting as default, unset others in the project
    if (updates.isDefault === true) {
      const allProviders = await this.providerRepository.findByProject(existing.projectId);
      for (const p of allProviders) {
        if (p.id !== id && p.isDefault) {
          await this.providerRepository.update(p.id, { isDefault: false });
        }
      }
    }

    const updated = await this.providerRepository.update(id, mergedUpdates);
    if (!updated) {
      throw new Error(`Provider with id ${id} not found`);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.providerRepository.findById(id);
    if (!existing) {
      throw new Error(`Provider with id ${id} not found`);
    }
    await this.providerRepository.delete(id);
  }
}

export default ManageProviders;