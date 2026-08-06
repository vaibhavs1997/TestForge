// TestStrategyRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { TestStrategyEntity } from '../../domain/requirements/TestStrategyEntity';
import { EventPublisher } from '../../application/EventPublisher';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'test-strategies');
}

export class TestStrategyRepository {
  constructor(private readonly eventPublisher?: EventPublisher) {}

  private getProjectDir(projectId: string): string {
    return path.join(getDataRoot(), projectId);
  }

  private getStrategyFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'strategies.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(strategy: TestStrategyEntity): Promise<TestStrategyEntity> {
    this.ensureProjectDir(strategy.projectId);
    const filePath = this.getStrategyFilePath(strategy.projectId);
    const items = await this.readStrategies(strategy.projectId);
    items.push(strategy);
    await writeJsonArray(filePath, items);

    // Publish CREATED event through central EventPublisher
    if (this.eventPublisher) {
      await this.eventPublisher.created('strategy', strategy.id, strategy.projectId, 'TestStrategy', strategy as any);
    }

    return strategy;
  }

  async update(id: string, data: Partial<TestStrategyEntity>): Promise<TestStrategyEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readStrategies(projectId);
      const index = items.findIndex(s => s.id === id);
      if (index !== -1) {
        const oldValue = items[index];
        const updated = { ...items[index], ...data, updatedAt: Date.now() };
        items[index] = updated;
        const filePath = this.getStrategyFilePath(projectId);
        await writeJsonArray(filePath, items);

        // Publish UPDATED event through central EventPublisher
        if (this.eventPublisher) {
          await this.eventPublisher.updated('strategy', updated.id, updated.projectId, 'TestStrategy', oldValue as any, updated as any);
        }

        return updated;
      }
    }
    throw new Error(`Test Strategy with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readStrategies(projectId);
      const strategy = items.find(s => s.id === id);
      if (strategy) {
        const filtered = items.filter(s => s.id !== id);
        const filePath = this.getStrategyFilePath(projectId);
        await writeJsonArray(filePath, filtered);

        // Publish DELETED event through central EventPublisher
        if (this.eventPublisher) {
          await this.eventPublisher.deleted('strategy', strategy.id, strategy.projectId, 'TestStrategy', strategy as any);
        }

        return;
      }
    }
  }

  async findById(id: string): Promise<TestStrategyEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readStrategies(projectId);
      const strategy = items.find(s => s.id === id);
      if (strategy) return strategy;
    }
    return null;
  }

  async findByRequirement(requirementId: string): Promise<TestStrategyEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readStrategies(projectId);
      const strategy = items.find(s => s.requirementId === requirementId);
      if (strategy) return strategy;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<TestStrategyEntity[]> {
    return this.readStrategies(projectId);
  }

  async list(): Promise<TestStrategyEntity[]> {
    const projectIds = this.listProjectIds();
    const allItems: TestStrategyEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readStrategies(projectId);
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

  private async readStrategies(projectId: string): Promise<TestStrategyEntity[]> {
    const filePath = this.getStrategyFilePath(projectId);
    return readJsonArray(filePath);
  }
}

export default TestStrategyRepository;