import Database from 'better-sqlite3';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ProjectRecord } from '../../domain/project/ProjectRecord';
import type { ProjectRepository } from '../../domain/project/ProjectRepository';
import { JsonProjectRepository } from './JsonProjectRepository';

import {
  allocateProjectIdentifiers,
  slugifyProjectKey,
} from '../../domain/project/projectIdentifiers';

function rowToRecord(row: Record<string, unknown>): ProjectRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    projectKey: String(row.project_key),
    description: row.description ? String(row.description) : undefined,
    status: (row.status as ProjectRecord['status']) || 'active',
    lastOpenedAt: row.last_opened_at ? Number(row.last_opened_at) : undefined,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export class SqliteProjectRepository implements ProjectRepository {
  private readonly db: Database.Database;
  private readonly jsonFallback = new JsonProjectRepository();

  constructor(dbPath: string) {
    const resolved = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    this.db = new Database(resolved);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        project_key TEXT NOT NULL UNIQUE,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        last_opened_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
    try {
      this.db.exec('ALTER TABLE projects ADD COLUMN last_opened_at INTEGER');
    } catch {
      // Existing databases already have the column.
    }
  }

  async syncDiscoveredProjects(): Promise<ProjectRecord[]> {
    const discovered = await this.jsonFallback.syncDiscoveredProjects();
    for (const project of discovered) {
      const existing = this.db.prepare('SELECT id FROM projects WHERE id = ?').get(project.id);
      if (!existing) {
        this.insert(project);
      }
    }
    const rows = this.db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
    return rows.map((row) => rowToRecord(row as Record<string, unknown>));
  }

  async list(): Promise<ProjectRecord[]> {
    return this.syncDiscoveredProjects();
  }

  private insert(record: ProjectRecord): void {
    this.db
      .prepare(
        `INSERT INTO projects (id, name, project_key, description, status, last_opened_at, created_at, updated_at)
         VALUES (@id, @name, @projectKey, @description, @status, @lastOpenedAt, @createdAt, @updatedAt)`,
      )
      .run({
        id: record.id,
        name: record.name,
        projectKey: record.projectKey,
        description: record.description ?? null,
        status: record.status ?? 'active',
        lastOpenedAt: record.lastOpenedAt ?? null,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
  }

  async findById(id: string): Promise<ProjectRecord | null> {
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    return row ? rowToRecord(row as Record<string, unknown>) : null;
  }

  async create(input: {
    name: string;
    projectKey?: string;
    description?: string;
    id?: string;
    status?: ProjectRecord['status'];
    lastOpenedAt?: number;
    ownerId?: string;
    tenantId?: string;
  }): Promise<ProjectRecord> {
    const now = Date.now();
    const existing = this.db.prepare('SELECT id, project_key FROM projects').all() as Array<{
      id: string;
      project_key: string;
    }>;
    const allocated =
      !input.id?.trim() && !input.projectKey?.trim()
        ? allocateProjectIdentifiers(
            input.name,
            existing.map((r) => ({ id: r.id, projectKey: r.project_key })),
          )
        : null;

    const id = input.id?.trim() || allocated?.id || randomUUID();
    const projectKey = (
      input.projectKey?.trim() || allocated?.projectKey || slugifyProjectKey(input.name)
    ).toLowerCase();

    const record: ProjectRecord = {
      id,
      name: input.name.trim(),
      projectKey,
      description: input.description?.trim(),
      status: input.status ?? 'active',
      lastOpenedAt: input.lastOpenedAt,
      createdAt: now,
      updatedAt: now,
    };

    try {
      this.insert(record);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('UNIQUE')) {
        throw new Error(`Project with id ${id} or key ${projectKey} already exists`);
      }
      throw err;
    }
    return record;
  }

  async update(
    id: string,
    patch: {
      name?: string;
      projectKey?: string;
      description?: string;
      status?: ProjectRecord['status'];
      lastOpenedAt?: number;
    },
  ): Promise<ProjectRecord> {
    const current = await this.findById(id);
    if (!current) {
      throw new Error(`Project with id ${id} not found`);
    }

    const updated: ProjectRecord = {
      ...current,
      name: patch.name?.trim() ?? current.name,
      projectKey: patch.projectKey?.trim().toLowerCase() ?? current.projectKey,
      description: patch.description !== undefined ? patch.description.trim() : current.description,
      status: patch.status ?? current.status ?? 'active',
      lastOpenedAt: patch.lastOpenedAt ?? current.lastOpenedAt,
      updatedAt: Date.now(),
    };

    this.db
      .prepare(
        `UPDATE projects SET name = @name, project_key = @projectKey, description = @description,
         status = @status, last_opened_at = @lastOpenedAt, updated_at = @updatedAt WHERE id = @id`,
      )
      .run({
        id,
        name: updated.name,
        projectKey: updated.projectKey,
        description: updated.description ?? null,
        status: updated.status ?? 'active',
        lastOpenedAt: updated.lastOpenedAt ?? null,
        updatedAt: updated.updatedAt,
      });

    return updated;
  }

  async delete(id: string): Promise<void> {
    const result = this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    if (result.changes === 0) {
      throw new Error(`Project with id ${id} not found`);
    }
  }
}

export default SqliteProjectRepository;
