// ExecutionPlanRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { ExecutionPlanEntity } from '../../domain/requirements/ExecutionPlanEntity';
import { EventPublisher } from '../../application/EventPublisher';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'execution-plans');
}

export class ExecutionPlanRepository {
  constructor(private readonly eventPublisher?: EventPublisher) {}

  private getProjectDir(projectId: string): string {
    return path.join(getDataRoot(), projectId);
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
    await writeJsonArray(filePath, items);

    // Publish CREATED event through central EventPublisher
    if (this.eventPublisher) {
      await this.eventPublisher.created('execution', plan.id, plan.projectId, 'ExecutionPlan', plan as any);
    }

    return plan;
  }

  async update(id: string, data: Partial<ExecutionPlanEntity>): Promise<ExecutionPlanEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readPlans(projectId);
      const index = items.findIndex(p => p.id === id);
      if (index !== -1) {
        const oldValue = items[index];
        const updated = { ...items[index], ...data, updatedAt: Date.now() };
        items[index] = updated;
        const filePath = this.getPlansFilePath(projectId);
        await writeJsonArray(filePath, items);

        // Publish UPDATED event through central EventPublisher
        if (this.eventPublisher) {
          await this.eventPublisher.updated('execution', updated.id, updated.projectId, 'ExecutionPlan', oldValue as any, updated as any);
        }

        return updated;
      }
    }
    throw new Error(`Execution Plan with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readPlans(projectId);
      const plan = items.find(p => p.id === id);
      if (plan) {
        const filtered = items.filter(p => p.id !== id);
        const filePath = this.getPlansFilePath(projectId);
        await writeJsonArray(filePath, filtered);

        // Publish DELETED event through central EventPublisher
        if (this.eventPublisher) {
          await this.eventPublisher.deleted('execution', plan.id, plan.projectId, 'ExecutionPlan', plan as any);
        }

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
    if (!fs.existsSync(getDataRoot())) return [];
    return fs.readdirSync(getDataRoot()).filter(name => {
      const fullPath = path.join(getDataRoot(), name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private async readPlans(projectId: string): Promise<ExecutionPlanEntity[]> {
    const filePath = this.getPlansFilePath(projectId);
    return readJsonArray(filePath);
  }
}

export default ExecutionPlanRepository;