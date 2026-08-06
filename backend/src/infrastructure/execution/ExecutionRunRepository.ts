// ExecutionRunRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { ExecutionRunEntity } from '../../domain/execution/ExecutionRunEntity';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'executions');
}

export class ExecutionRunRepository {
  private getProjectDir(projectId: string): string {
    return path.join(getDataRoot(), projectId);
  }

  private getRunsFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'runs.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(run: ExecutionRunEntity): Promise<ExecutionRunEntity> {
    this.ensureProjectDir(run.projectId);
    const filePath = this.getRunsFilePath(run.projectId);
    const items = await this.readRuns(run.projectId);
    items.push(run);
    await writeJsonArray(filePath, items);
    return run;
  }

  async update(id: string, data: Partial<ExecutionRunEntity>): Promise<ExecutionRunEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readRuns(projectId);
      const index = items.findIndex(r => r.id === id);
      if (index !== -1) {
        const updated = { ...items[index], ...data, updatedAt: Date.now() };
        items[index] = updated;
        const filePath = this.getRunsFilePath(projectId);
        await writeJsonArray(filePath, items);
        return updated;
      }
    }
    throw new Error(`Execution Run with id ${id} not found`);
  }

  async findById(id: string): Promise<ExecutionRunEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readRuns(projectId);
      const run = items.find(r => r.id === id);
      if (run) return run;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<ExecutionRunEntity[]> {
    return this.readRuns(projectId);
  }

  async findByRequirement(requirementId: string): Promise<ExecutionRunEntity[]> {
    const projectIds = this.listProjectIds();
    const results: ExecutionRunEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readRuns(projectId);
      const filtered = items.filter(r => r.requirementId === requirementId);
      results.push(...filtered);
    }
    return results;
  }

  async list(): Promise<ExecutionRunEntity[]> {
    const projectIds = this.listProjectIds();
    const allItems: ExecutionRunEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readRuns(projectId);
      allItems.push(...items);
    }
    return allItems;
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(getDataRoot())) return [];
    return fs.readdirSync(getDataRoot()).filter(name => {
      const fullPath = path.join(getDataRoot(), name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private async readRuns(projectId: string): Promise<ExecutionRunEntity[]> {
    const filePath = this.getRunsFilePath(projectId);
    return readJsonArray(filePath);
  }
}

export default ExecutionRunRepository;