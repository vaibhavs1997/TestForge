// TestStrategyRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { TestStrategyEntity } from '../../domain/requirements/TestStrategyEntity';

const DATA_ROOT = path.join(process.cwd(), 'data', 'test-strategies');

export class TestStrategyRepository {
  private getProjectDir(projectId: string): string {
    return path.join(DATA_ROOT, projectId);
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
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
    return strategy;
  }

  async update(id: string, data: Partial<TestStrategyEntity>): Promise<TestStrategyEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readStrategies(projectId);
      const index = items.findIndex(s => s.id === id);
      if (index !== -1) {
        const updated = { ...items[index], ...data, updatedAt: Date.now() };
        items[index] = updated;
        const filePath = this.getStrategyFilePath(projectId);
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        return updated;
      }
    }
    throw new Error(`Test Strategy with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readStrategies(projectId);
      const filtered = items.filter(s => s.id !== id);
      if (filtered.length !== items.length) {
        const filePath = this.getStrategyFilePath(projectId);
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
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
    if (!fs.existsSync(DATA_ROOT)) return [];
    return fs.readdirSync(DATA_ROOT).filter(name => {
      const fullPath = path.join(DATA_ROOT, name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private readStrategies(projectId: string): TestStrategyEntity[] {
    const filePath = this.getStrategyFilePath(projectId);
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}

export default TestStrategyRepository;