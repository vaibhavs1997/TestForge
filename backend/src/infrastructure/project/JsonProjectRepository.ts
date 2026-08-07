import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ProjectRecord } from '../../domain/project/ProjectRecord';
import type { ProjectRepository } from '../../domain/project/ProjectRepository';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore';
import {
  deleteProjectDataOnDisk,
  discoverProjectIdsFromData,
  isValidDiscoveredProjectId,
} from './projectDataPaths';

function registryPath(): string {
  return path.join(process.cwd(), 'data', 'projects', 'projects.json');
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'project';
}

export class JsonProjectRepository implements ProjectRepository {
  private async readRegistry(): Promise<ProjectRecord[]> {
    return readJsonArray<ProjectRecord>(registryPath());
  }

  private async writeRegistry(projects: ProjectRecord[]): Promise<void> {
    await writeJsonArray(registryPath(), projects);
  }

  /** Merge on-disk API/env folders into the registry (idempotent). */
  async syncDiscoveredProjects(): Promise<ProjectRecord[]> {
    const existing = await this.readRegistry();
    const byId = new Map(existing.map((p) => [p.id, p]));
    const now = Date.now();

    for (const id of discoverProjectIdsFromData()) {
      if (byId.has(id)) continue;
      const record: ProjectRecord = {
        id,
        name: id,
        projectKey: slugify(id),
        description: 'Discovered from local data directory',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      byId.set(id, record);
    }

    // Drop registry entries that were only lock-file artifacts (e.g. logs.json.lock).
    for (const [id, record] of byId.entries()) {
      if (
        !isValidDiscoveredProjectId(id)
        && record.description === 'Discovered from local data directory'
      ) {
        byId.delete(id);
      }
    }

    const merged = Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
    await this.writeRegistry(merged);
    return merged;
  }

  async list(): Promise<ProjectRecord[]> {
    return this.syncDiscoveredProjects();
  }

  async findById(id: string): Promise<ProjectRecord | null> {
    const projects = await this.list();
    return projects.find((p) => p.id === id) ?? null;
  }

  async create(input: {
    name: string;
    projectKey?: string;
    description?: string;
    id?: string;
    status?: ProjectRecord['status'];
    ownerId?: string;
    tenantId?: string;
  }): Promise<ProjectRecord> {
    const projects = await this.readRegistry();
    const now = Date.now();
    const id = input.id?.trim() || randomUUID();
    const projectKey = (input.projectKey?.trim() || slugify(input.name)).toLowerCase();

    if (projects.some((p) => p.id === id)) {
      throw new Error(`Project with id ${id} already exists`);
    }
    if (projects.some((p) => p.projectKey === projectKey)) {
      throw new Error(`Project key ${projectKey} is already in use`);
    }

    const record: ProjectRecord = {
      id,
      name: input.name.trim(),
      projectKey,
      description: input.description?.trim(),
      status: input.status ?? 'active',
      ownerId: input.ownerId?.trim() || undefined,
      tenantId: input.tenantId?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
    projects.push(record);
    await this.writeRegistry(projects);
    return record;
  }

  async update(
    id: string,
    patch: {
      name?: string;
      projectKey?: string;
      description?: string;
      status?: ProjectRecord['status'];
    },
  ): Promise<ProjectRecord> {
    const projects = await this.readRegistry();
    const index = projects.findIndex((p) => p.id === id);
    if (index < 0) {
      throw new Error(`Project with id ${id} not found`);
    }

    const current = projects[index];
    if (patch.projectKey && projects.some((p) => p.projectKey === patch.projectKey && p.id !== id)) {
      throw new Error(`Project key ${patch.projectKey} is already in use`);
    }

    const updated: ProjectRecord = {
      ...current,
      name: patch.name?.trim() ?? current.name,
      projectKey: patch.projectKey?.trim().toLowerCase() ?? current.projectKey,
      description: patch.description !== undefined ? patch.description.trim() : current.description,
      status: patch.status ?? current.status ?? 'active',
      updatedAt: Date.now(),
    };
    projects[index] = updated;
    await this.writeRegistry(projects);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const projects = await this.readRegistry();
    const next = projects.filter((p) => p.id !== id);
    if (next.length === projects.length) {
      throw new Error(`Project with id ${id} not found`);
    }
    await this.writeRegistry(next);
    deleteProjectDataOnDisk(id);
  }
}

export default JsonProjectRepository;
