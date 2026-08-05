// ExecutionRunRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { ExecutionRunEntity } from '../../domain/execution/ExecutionRunEntity';

const DATA_ROOT = path.join(process.cwd(), 'data', 'executions');

export class ExecutionRunRepository {
  private getProjectDir(projectId: string): string {
    return path.join(DATA_ROOT, projectId);
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
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
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
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
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
    if (!fs.existsSync(DATA_ROOT)) return [];
    return fs.readdirSync(DATA_ROOT).filter(name => {
      const fullPath = path.join(DATA_ROOT, name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private readRuns(projectId: string): ExecutionRunEntity[] {
    const filePath = this.getRunsFilePath(projectId);
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}

export default ExecutionRunRepository;