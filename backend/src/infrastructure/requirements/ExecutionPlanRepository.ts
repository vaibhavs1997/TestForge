// ExecutionPlanRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { ExecutionPlanEntity } from '../../domain/requirements/ExecutionPlanEntity';

const DATA_ROOT = path.join(process.cwd(), 'data', 'execution-plans');

export class ExecutionPlanRepository {
  private getProjectDir(projectId: string): string {
    return path.join(DATA_ROOT, projectId);
  }

  private getPlansFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'plans.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(plan: ExecutionPlanEntity): Promise<ExecutionPlanEntity> {
    this.ensureProjectDir(plan.projectId);
    const filePath = this.getPlansFilePath(plan.projectId);
    const items = await this.readPlans(plan.projectId);
    items.push(plan);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
    return plan;
  }

  async update(id: string, data: Partial<ExecutionPlanEntity>): Promise<ExecutionPlanEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readPlans(projectId);
      const index = items.findIndex(p => p.id === id);
      if (index !== -1) {
        const updated = { ...items[index], ...data, updatedAt: Date.now() };
        items[index] = updated;
        const filePath = this.getPlansFilePath(projectId);
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        return updated;
      }
    }
    throw new Error(`Execution Plan with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readPlans(projectId);
      const filtered = items.filter(p => p.id !== id);
      if (filtered.length !== items.length) {
        const filePath = this.getPlansFilePath(projectId);
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
        return;
      }
    }
  }

  async findById(id: string): Promise<ExecutionPlanEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readPlans(projectId);
      const plan = items.find(p => p.id === id);
      if (plan) return plan;
    }
    return null;
  }

  async findByRequirement(requirementId: string): Promise<ExecutionPlanEntity[]> {
    const projectIds = this.listProjectIds();
    const results: ExecutionPlanEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readPlans(projectId);
      const filtered = items.filter(p => p.requirementId === requirementId);
      results.push(...filtered);
    }
    return results;
  }

  async findByTestDesign(testDesignId: string): Promise<ExecutionPlanEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readPlans(projectId);
      const plan = items.find(p => p.testDesignId === testDesignId);
      if (plan) return plan;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<ExecutionPlanEntity[]> {
    return this.readPlans(projectId);
  }

  async list(): Promise<ExecutionPlanEntity[]> {
    const projectIds = this.listProjectIds();
    const allItems: ExecutionPlanEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readPlans(projectId);
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

  private readPlans(projectId: string): ExecutionPlanEntity[] {
    const filePath = this.getPlansFilePath(projectId);
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}

export default ExecutionPlanRepository;