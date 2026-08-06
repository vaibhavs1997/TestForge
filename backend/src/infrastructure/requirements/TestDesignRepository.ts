// TestDesignRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { TestDesignEntity } from '../../domain/requirements/TestDesignEntity';
import { EventPublisher } from '../../application/EventPublisher';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'test-designs');
}

export class TestDesignRepository {
  constructor(private readonly eventPublisher?: EventPublisher) {}

  private getProjectDir(projectId: string): string {
    return path.join(getDataRoot(), projectId);
  }

  private getDesignsFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'designs.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(design: TestDesignEntity): Promise<TestDesignEntity> {
    this.ensureProjectDir(design.projectId);
    const filePath = this.getDesignsFilePath(design.projectId);
    const items = await this.readDesigns(design.projectId);
    items.push(design);
    await writeJsonArray(filePath, items);

    // Publish CREATED event through central EventPublisher
    if (this.eventPublisher) {
      await this.eventPublisher.created('design', design.id, design.projectId, 'TestDesign', design as any);
    }

    return design;
  }

  async update(id: string, data: Partial<TestDesignEntity>): Promise<TestDesignEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readDesigns(projectId);
      const index = items.findIndex(d => d.id === id);
      if (index !== -1) {
        const oldValue = items[index];
        const updated = { ...items[index], ...data, updatedAt: Date.now() };
        items[index] = updated;
        const filePath = this.getDesignsFilePath(projectId);
        await writeJsonArray(filePath, items);

        // Publish UPDATED event through central EventPublisher
        if (this.eventPublisher) {
          await this.eventPublisher.updated('design', updated.id, updated.projectId, 'TestDesign', oldValue as any, updated as any);
        }

        return updated;
      }
    }
    throw new Error(`Test Design with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readDesigns(projectId);
      const design = items.find(d => d.id === id);
      if (design) {
        const filtered = items.filter(d => d.id !== id);
        const filePath = this.getDesignsFilePath(projectId);
        await writeJsonArray(filePath, filtered);

        // Publish DELETED event through central EventPublisher
        if (this.eventPublisher) {
          await this.eventPublisher.deleted('design', design.id, design.projectId, 'TestDesign', design as any);
        }

        return;
      }
    }
  }

  async findById(id: string): Promise<TestDesignEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readDesigns(projectId);
      const design = items.find(d => d.id === id);
      if (design) return design;
    }
    return null;
  }

  async findByRequirement(requirementId: string): Promise<TestDesignEntity[]> {
    const projectIds = this.listProjectIds();
    const results: TestDesignEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readDesigns(projectId);
      const filtered = items.filter(d => d.requirementId === requirementId);
      results.push(...filtered);
    }
    return results;
  }

  async findByStrategyItem(strategyItemId: string): Promise<TestDesignEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readDesigns(projectId);
      const design = items.find(d => d.strategyItemId === strategyItemId);
      if (design) return design;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<TestDesignEntity[]> {
    return this.readDesigns(projectId);
  }

  async list(): Promise<TestDesignEntity[]> {
    const projectIds = this.listProjectIds();
    const allItems: TestDesignEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readDesigns(projectId);
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

  private async readDesigns(projectId: string): Promise<TestDesignEntity[]> {
    const filePath = this.getDesignsFilePath(projectId);
    return readJsonArray(filePath);
  }
}

export default TestDesignRepository;