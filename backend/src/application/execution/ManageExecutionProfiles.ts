// ManageExecutionProfiles - Application Use Case for Execution Profiles

import { randomUUID } from 'node:crypto';
import { IExecutionProfileRepository } from '../../domain/execution/ExecutionProfileRepository.js';
import { ExecutionProfileEntity } from '../../domain/execution/ExecutionProfileEntity.js';
import {
  buildExecutionProfileDuplicate,
  buildExecutionProfileEntity,
  normalizeExecutionProfileName,
} from '../../domain/execution/ExecutionProfilePolicy.js';
import { validateUniqueProjectName } from '../shared/crudHelpers.js';

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
    const name = await validateUniqueProjectName(
      this.profileRepository,
      normalizeExecutionProfileName(input.name),
      input.projectId,
      'Profile'
    );

    const profile = await this.profileRepository.create(
      buildExecutionProfileEntity(randomUUID(), Date.now(), {
        projectId: input.projectId,
        name,
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
      })
    );

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

    const updateInput =
      input.name !== undefined
        ? {
            ...input,
            name: await validateUniqueProjectName(
              this.profileRepository,
              normalizeExecutionProfileName(input.name),
              existing.projectId,
              'Profile',
              existing.name
            ),
          }
        : input;

    const updated = await this.profileRepository.update(id, updateInput);

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

    const name = normalizeExecutionProfileName(newName);
    await validateUniqueProjectName(this.profileRepository, name, existing.projectId, 'Profile');

    return this.profileRepository.create(
      buildExecutionProfileDuplicate(existing, randomUUID(), name, Date.now())
    );
  }
}

export default ManageExecutionProfiles;
