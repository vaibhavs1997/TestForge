// ExecutionProfileRepository - In-memory implementation of Execution Profile Repository

import { randomUUID } from 'node:crypto';
import { IExecutionProfileRepository } from '../../domain/execution/ExecutionProfileRepository';
import { ExecutionProfileEntity } from '../../domain/execution/ExecutionProfileEntity';

export class ExecutionProfileRepository implements IExecutionProfileRepository {
  private profiles: Map<string, ExecutionProfileEntity> = new Map();
  private projectProfiles: Map<string, Set<string>> = new Map();

  async create(profile: Omit<ExecutionProfileEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExecutionProfileEntity> {
    const id = randomUUID();
    const now = Date.now();

    const entity = new ExecutionProfileEntity(
      id,
      profile.projectId,
      profile.name,
      profile.description,
      profile.defaultEnvironmentId,
      profile.failureMode,
      profile.retryPolicy,
      profile.timeout,
      profile.parallelism,
      profile.assertionMode,
      profile.runtimeVariableReset,
      profile.datasetSelectionStrategy,
      profile.tags,
      profile.enabled,
      profile.isDefault,
      now,
      now
    );

    this.profiles.set(id, entity);

    // Index by project
    if (!this.projectProfiles.has(profile.projectId)) {
      this.projectProfiles.set(profile.projectId, new Set());
    }
    this.projectProfiles.get(profile.projectId)!.add(id);

    return entity;
  }

  async update(id: string, data: Partial<Omit<ExecutionProfileEntity, 'id' | 'projectId' | 'createdAt'>>): Promise<ExecutionProfileEntity> {
    const existing = this.profiles.get(id);
    if (!existing) {
      throw new Error('Execution profile not found');
    }

    const updated = new ExecutionProfileEntity(
      existing.id,
      existing.projectId,
      data.name ?? existing.name,
      data.description ?? existing.description,
      data.defaultEnvironmentId ?? existing.defaultEnvironmentId,
      data.failureMode ?? existing.failureMode,
      data.retryPolicy ?? existing.retryPolicy,
      data.timeout ?? existing.timeout,
      data.parallelism ?? existing.parallelism,
      data.assertionMode ?? existing.assertionMode,
      data.runtimeVariableReset ?? existing.runtimeVariableReset,
      data.datasetSelectionStrategy ?? existing.datasetSelectionStrategy,
      data.tags ?? existing.tags,
      data.enabled ?? existing.enabled,
      data.isDefault ?? existing.isDefault,
      existing.createdAt,
      Date.now()
    );

    this.profiles.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const profile = this.profiles.get(id);
    if (!profile) {
      return;
    }

    this.profiles.delete(id);

    // Remove from project index
    const projectProfiles = this.projectProfiles.get(profile.projectId);
    if (projectProfiles) {
      projectProfiles.delete(id);
    }
  }

  async findById(id: string): Promise<ExecutionProfileEntity | null> {
    return this.profiles.get(id) || null;
  }

  async listByProject(projectId: string): Promise<ExecutionProfileEntity[]> {
    const profileIds = this.projectProfiles.get(projectId);
    if (!profileIds) {
      return [];
    }

    return Array.from(profileIds)
      .map(id => this.profiles.get(id))
      .filter((profile): profile is ExecutionProfileEntity => profile !== undefined);
  }

  async findDefault(projectId: string): Promise<ExecutionProfileEntity | null> {
    const profiles = await this.listByProject(projectId);
    return profiles.find(p => p.isDefault && p.enabled) || null;
  }

  async existsByName(name: string, projectId: string): Promise<boolean> {
    const profiles = await this.listByProject(projectId);
    return profiles.some(p => p.name.toLowerCase() === name.toLowerCase());
  }
}

export default ExecutionProfileRepository;