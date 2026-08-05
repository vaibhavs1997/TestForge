// ManageExecutionProfiles - Application Use Case for Execution Profiles

import { IExecutionProfileRepository } from '../../domain/execution/ExecutionProfileRepository';
import { ExecutionProfileEntity } from '../../domain/execution/ExecutionProfileEntity';

export interface CreateProfileInput {
  projectId: string;
  name: string;
  description: string;
  defaultEnvironmentId: string;
  failureMode: 'StopOnFailure' | 'ContinueOnFailure';
  retryPolicy: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
  };
  timeout: number;
  parallelism: {
    enabled: boolean;
    maxConcurrent: number;
  };
  assertionMode: 'all' | 'failFast' | 'skipOnFailure';
  runtimeVariableReset: boolean;
  datasetSelectionStrategy: 'first' | 'random' | 'sequential';
  tags: string[];
  enabled?: boolean;
  isDefault?: boolean;
}

export class ManageExecutionProfiles {
  constructor(private readonly profileRepository: IExecutionProfileRepository) {}

  async create(input: CreateProfileInput): Promise<ExecutionProfileEntity> {
    // Check if name already exists
    const exists = await this.profileRepository.existsByName(input.name, input.projectId);
    if (exists) {
      throw new Error(`Profile with name "${input.name}" already exists`);
    }

    const profile = await this.profileRepository.create({
      projectId: input.projectId,
      name: input.name,
      description: input.description,
      defaultEnvironmentId: input.defaultEnvironmentId,
      failureMode: input.failureMode,
      retryPolicy: input.retryPolicy,
      timeout: input.timeout,
      parallelism: input.parallelism,
      assertionMode: input.assertionMode,
      runtimeVariableReset: input.runtimeVariableReset,
      datasetSelectionStrategy: input.datasetSelectionStrategy,
      tags: input.tags,
      enabled: input.enabled ?? true,
      isDefault: input.isDefault ?? false,
    });

    // If this is set as default, unset other defaults
    if (input.isDefault) {
      const profiles = await this.profileRepository.listByProject(input.projectId);
      for (const p of profiles) {
        if (p.id !== profile.id && p.isDefault) {
          await this.profileRepository.update(p.id, { isDefault: false });
        }
      }
    }

    return profile;
  }

  async update(id: string, input: Partial<CreateProfileInput>): Promise<ExecutionProfileEntity> {
    const existing = await this.profileRepository.findById(id);
    if (!existing) {
      throw new Error('Execution profile not found');
    }

    // If name is being changed, check for duplicates
    if (input.name && input.name !== existing.name) {
      const exists = await this.profileRepository.existsByName(input.name, existing.projectId);
      if (exists) {
        throw new Error(`Profile with name "${input.name}" already exists`);
      }
    }

    const updated = await this.profileRepository.update(id, input);

    // If this is set as default, unset other defaults
    if (input.isDefault) {
      const profiles = await this.profileRepository.listByProject(existing.projectId);
      for (const p of profiles) {
        if (p.id !== id && p.isDefault) {
          await this.profileRepository.update(p.id, { isDefault: false });
        }
      }
    }

    return updated;
  }

  async delete(id: string): Promise<void> {
    const profile = await this.profileRepository.findById(id);
    if (!profile) {
      return;
    }

    if (profile.isDefault) {
      throw new Error('Cannot delete the default profile');
    }

    await this.profileRepository.delete(id);
  }

  async getById(id: string): Promise<ExecutionProfileEntity | null> {
    return this.profileRepository.findById(id);
  }

  async listByProject(projectId: string): Promise<ExecutionProfileEntity[]> {
    return this.profileRepository.listByProject(projectId);
  }

  async getDefault(projectId: string): Promise<ExecutionProfileEntity | null> {
    return this.profileRepository.findDefault(projectId);
  }

  async duplicate(id: string, newName: string): Promise<ExecutionProfileEntity> {
    const existing = await this.profileRepository.findById(id);
    if (!existing) {
      throw new Error('Execution profile not found');
    }

    const nameExists = await this.profileRepository.existsByName(newName, existing.projectId);
    if (nameExists) {
      throw new Error(`Profile with name "${newName}" already exists`);
    }

    return this.profileRepository.create({
      projectId: existing.projectId,
      name: newName,
      description: existing.description,
      defaultEnvironmentId: existing.defaultEnvironmentId,
      failureMode: existing.failureMode,
      retryPolicy: existing.retryPolicy,
      timeout: existing.timeout,
      parallelism: existing.parallelism,
      assertionMode: existing.assertionMode,
      runtimeVariableReset: existing.runtimeVariableReset,
      datasetSelectionStrategy: existing.datasetSelectionStrategy,
      tags: [...existing.tags, 'duplicate'],
      enabled: true,
      isDefault: false,
    });
  }
}

export default ManageExecutionProfiles;