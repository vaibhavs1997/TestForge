// AssertionRepository - File-based repository implementation

import { randomUUID } from 'node:crypto';
import * as fs from 'fs';
import * as path from 'path';
import { AssertionEntity } from '../../domain/assertion/AssertionEntity';
import { EventPublisher } from '../../application/EventPublisher';

const DATA_ROOT = path.join(process.cwd(), 'data', 'assertions');

export class AssertionRepository {
  constructor(private readonly eventPublisher?: EventPublisher) {}

  private getProjectDir(projectId: string): string {
    return path.join(DATA_ROOT, projectId);
  }

  private getAssertionsFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'assertions.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async create(assertion: Omit<AssertionEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssertionEntity> {
    this.ensureProjectDir(assertion.projectId);
    const filePath = this.getAssertionsFilePath(assertion.projectId);
    const assertions = await this.readAssertions(assertion.projectId);
    
    const newAssertion: AssertionEntity = {
      ...assertion,
      id: randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    assertions.push(newAssertion);
    fs.writeFileSync(filePath, JSON.stringify(assertions, null, 2));

    // Publish CREATED event through central EventPublisher
    if (this.eventPublisher) {
      await this.eventPublisher.created('assertion', newAssertion.id, newAssertion.projectId, 'Assertion', newAssertion as any);
    }

    return newAssertion;
  }

  async update(id: string, data: Partial<Omit<AssertionEntity, 'id' | 'projectId' | 'createdAt'>>): Promise<AssertionEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const assertions = await this.readAssertions(projectId);
      const index = assertions.findIndex(a => a.id === id);
      if (index !== -1) {
        const oldValue = assertions[index];
        const updated = { 
          ...assertions[index], 
          ...data, 
          updatedAt: Date.now() 
        };
        assertions[index] = updated;
        const filePath = this.getAssertionsFilePath(projectId);
        fs.writeFileSync(filePath, JSON.stringify(assertions, null, 2));

        // Publish UPDATED event through central EventPublisher
        if (this.eventPublisher) {
          await this.eventPublisher.updated('assertion', updated.id, updated.projectId, 'Assertion', oldValue as any, updated as any);
        }

        return updated;
      }
    }
    throw new Error(`Assertion with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const assertions = await this.readAssertions(projectId);
      const assertion = assertions.find(a => a.id === id);
      if (assertion) {
        const filtered = assertions.filter(a => a.id !== id);
        const filePath = this.getAssertionsFilePath(projectId);
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));

        // Publish DELETED event through central EventPublisher
        if (this.eventPublisher) {
          await this.eventPublisher.deleted('assertion', assertion.id, assertion.projectId, 'Assertion', assertion as any);
        }

        return;
      }
    }
  }

  async findById(id: string): Promise<AssertionEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const assertions = await this.readAssertions(projectId);
      const assertion = assertions.find(a => a.id === id);
      if (assertion) return assertion;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<AssertionEntity[]> {
    return this.readAssertions(projectId);
  }

  async findByCategory(projectId: string, category: string): Promise<AssertionEntity[]> {
    const assertions = await this.readAssertions(projectId);
    return assertions.filter(a => a.category === category);
  }

  async findByTag(projectId: string, tag: string): Promise<AssertionEntity[]> {
    const assertions = await this.readAssertions(projectId);
    return assertions.filter(a => a.tags.includes(tag));
  }

  async existsByName(name: string, projectId: string): Promise<boolean> {
    const assertions = await this.readAssertions(projectId);
    return assertions.some(a => a.name === name);
  }

  async list(): Promise<AssertionEntity[]> {
    const projectIds = this.listProjectIds();
    const allAssertions: AssertionEntity[] = [];
    for (const projectId of projectIds) {
      const assertions = await this.readAssertions(projectId);
      allAssertions.push(...assertions);
    }
    return allAssertions;
  }

  private listProjectIds(): string[] {
    if (!fs.existsSync(DATA_ROOT)) return [];
    return fs.readdirSync(DATA_ROOT).filter(name => {
      const fullPath = path.join(DATA_ROOT, name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private readAssertions(projectId: string): AssertionEntity[] {
    const filePath = this.getAssertionsFilePath(projectId);
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}

export default AssertionRepository;