// File-backed execution profile repository. Profiles must survive restarts so
// an approved suite can reliably be run with its intended configuration.
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'node:crypto';
import { IExecutionProfileRepository } from '../../domain/execution/ExecutionProfileRepository.js';
import { ExecutionProfileEntity } from '../../domain/execution/ExecutionProfileEntity.js';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore.js';

const getDataRoot = () => path.join(process.cwd(), 'data', 'execution-profiles');

export class ExecutionProfileRepository implements IExecutionProfileRepository {
  private getFilePath(projectId: string): string {
    return path.join(getDataRoot(), projectId, 'profiles.json');
  }

  private ensureProjectDir(projectId: string): void {
    const directory = path.dirname(this.getFilePath(projectId));
    if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
  }

  private async read(projectId: string): Promise<ExecutionProfileEntity[]> {
    return readJsonArray<ExecutionProfileEntity>(this.getFilePath(projectId));
  }

  async create(profile: Omit<ExecutionProfileEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<ExecutionProfileEntity> {
    const now = Date.now();
    const entity = new ExecutionProfileEntity(
      randomUUID(), profile.projectId, profile.name, profile.description,
      profile.defaultEnvironmentId, profile.failureMode, profile.retryPolicy,
      profile.timeout, profile.parallelism, profile.assertionMode,
      profile.runtimeVariableReset, profile.datasetSelectionStrategy, profile.tags,
      profile.enabled, profile.isDefault, now, now,
    );
    this.ensureProjectDir(profile.projectId);
    const profiles = await this.read(profile.projectId);
    await writeJsonArray(this.getFilePath(profile.projectId), [...profiles, entity]);
    return entity;
  }

  async update(id: string, data: Partial<Omit<ExecutionProfileEntity, 'id' | 'projectId' | 'createdAt'>>): Promise<ExecutionProfileEntity> {
    for (const projectId of this.listProjectIds()) {
      const profiles = await this.read(projectId);
      const index = profiles.findIndex((profile) => profile.id === id);
      if (index < 0) continue;
      const updated = { ...profiles[index], ...data, updatedAt: Date.now() } as ExecutionProfileEntity;
      const next = [...profiles];
      next[index] = updated;
      await writeJsonArray(this.getFilePath(projectId), next);
      return updated;
    }
    throw new Error('Execution profile not found');
  }

  async delete(id: string): Promise<void> {
    for (const projectId of this.listProjectIds()) {
      const profiles = await this.read(projectId);
      const next = profiles.filter((profile) => profile.id !== id);
      if (next.length === profiles.length) continue;
      await writeJsonArray(this.getFilePath(projectId), next);
      return;
    }
  }

  async findById(id: string): Promise<ExecutionProfileEntity | null> {
    for (const projectId of this.listProjectIds()) {
      const profile = (await this.read(projectId)).find((candidate) => candidate.id === id);
      if (profile) return profile;
    }
    return null;
  }

  async listByProject(projectId: string): Promise<ExecutionProfileEntity[]> {
    return this.read(projectId);
  }

  async findDefault(projectId: string): Promise<ExecutionProfileEntity | null> {
    return (await this.read(projectId)).find((profile) => profile.isDefault && profile.enabled) || null;
  }

  async existsByName(name: string, projectId: string): Promise<boolean> {
    return (await this.read(projectId)).some((profile) => profile.name.toLowerCase() === name.toLowerCase());
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(getDataRoot())) return [];
    return fs.readdirSync(getDataRoot()).filter((name) => fs.statSync(path.join(getDataRoot(), name)).isDirectory());
  }
}

export default ExecutionProfileRepository;
