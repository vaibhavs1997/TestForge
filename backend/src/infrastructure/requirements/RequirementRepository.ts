// RequirementRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { RequirementEntity } from '../../domain/requirements/RequirementEntity';
import { EventPublisher } from '../../application/EventPublisher';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore';

function getDataRoot(): string {
  return path.join(process.cwd(), 'data', 'requirements');
}

export class RequirementRepository {
  private getProjectDir(projectId: string): string {
    return path.join(getDataRoot(), projectId);
  }

  private getRequirementsFilePath(projectId: string): string {
    return path.join(this.getProjectDir(projectId), 'requirements.json');
  }

  private ensureProjectDir(projectId: string): void {
    const dir = this.getProjectDir(projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  constructor(
    private readonly eventPublisher?: EventPublisher
  ) {}

  async create(requirement: RequirementEntity): Promise<RequirementEntity> {
    this.ensureProjectDir(requirement.projectId);
    const filePath = this.getRequirementsFilePath(requirement.projectId);
    const items = await this.readRequirements(requirement.projectId);
    items.push(requirement);
    await writeJsonArray(filePath, items);

    // Publish through central EventPublisher — triggers audit, versioning,
    // cache invalidation, recommendation refresh, and pipeline refresh.
    if (this.eventPublisher) {
      await this.eventPublisher.created('requirements', requirement.id, requirement.projectId, 'Requirement', requirement as any);
    }

    return requirement;
  }

  async update(id: string, data: Partial<RequirementEntity>): Promise<RequirementEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readRequirements(projectId);
      const index = items.findIndex(r => r.id === id);
      if (index !== -1) {
        const oldValue = { ...items[index] };
        const updated = { ...items[index], ...data, updatedAt: Date.now() };
        items[index] = updated;
        const filePath = this.getRequirementsFilePath(projectId);
        await writeJsonArray(filePath, items);

        // Publish through central EventPublisher — triggers audit, versioning,
        // cache invalidation, recommendation refresh, and pipeline refresh.
        if (this.eventPublisher) {
          await this.eventPublisher.updated('requirements', updated.id, updated.projectId, 'Requirement', oldValue as any, updated as any);
        }

        return updated;
      }
    }
    throw new Error(`Requirement with id ${id} not found`);
  }

  async delete(id: string): Promise<void> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readRequirements(projectId);
      const index = items.findIndex(r => r.id === id);
      if (index !== -1) {
        const deleted = items[index];
        const filtered = items.filter(r => r.id !== id);
        const filePath = this.getRequirementsFilePath(projectId);
        await writeJsonArray(filePath, filtered);

        // Publish through central EventPublisher — triggers audit, versioning,
        // cache invalidation, recommendation refresh, and pipeline refresh.
        if (this.eventPublisher) {
          await this.eventPublisher.deleted('requirements', deleted.id, deleted.projectId, 'Requirement', deleted as any);
        }

        return;
      }
    }
  }

  async findById(id: string): Promise<RequirementEntity | null> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readRequirements(projectId);
      const requirement = items.find(r => r.id === id);
      if (requirement) return requirement;
    }
    return null;
  }

  async findByProject(projectId: string): Promise<RequirementEntity[]> {
    return this.readRequirements(projectId);
  }

  async list(): Promise<RequirementEntity[]> {
    const projectIds = this.listProjectIds();
    const allItems: RequirementEntity[] = [];
    for (const projectId of projectIds) {
      const items = await this.readRequirements(projectId);
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

  private async readRequirements(projectId: string): Promise<RequirementEntity[]> {
    const filePath = this.getRequirementsFilePath(projectId);
    return readJsonArray(filePath);
  }
}

export default RequirementRepository;