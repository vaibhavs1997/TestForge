// RequirementRepository - File-based repository implementation
import * as fs from 'fs';
import * as path from 'path';
import { RequirementEntity } from '../../domain/requirements/RequirementEntity';
import { VersionService } from '../../application/versioning/VersionService';
import { EventBus } from '../../domain/events/EventBus';

const DATA_ROOT = path.join(process.cwd(), 'data', 'requirements');

export class RequirementRepository {
  private getProjectDir(projectId: string): string {
    return path.join(DATA_ROOT, projectId);
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
    private readonly versionService?: VersionService,
    private readonly eventBus?: EventBus
  ) {}

  async create(requirement: RequirementEntity): Promise<RequirementEntity> {
    this.ensureProjectDir(requirement.projectId);
    const filePath = this.getRequirementsFilePath(requirement.projectId);
    const items = await this.readRequirements(requirement.projectId);
    items.push(requirement);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
    
    // Create version snapshot
    if (this.versionService) {
      await this.versionService.create({
        projectId: requirement.projectId,
        entityType: 'Requirement',
        entityId: requirement.id,
        snapshot: requirement as any,
        changeSummary: 'Requirement created',
      });
    }

    // Publish event for audit logging
    if (this.eventBus) {
      await this.eventBus.publish({
        type: 'IMPORTED',
        module: 'requirements',
        entityId: requirement.id,
        projectId: requirement.projectId,
        timestamp: Date.now(),
        payload: {
          entityType: 'Requirement',
          oldValue: null,
          newValue: requirement as any,
        },
      });
    }
    
    return requirement;
  }

  async update(id: string, data: Partial<RequirementEntity>): Promise<RequirementEntity> {
    const projectIds = this.listProjectIds();
    for (const projectId of projectIds) {
      const items = await this.readRequirements(projectId);
      const index = items.findIndex(r => r.id === id);
      if (index !== -1) {
        const updated = { ...items[index], ...data, updatedAt: Date.now() };
        items[index] = updated;
        const filePath = this.getRequirementsFilePath(projectId);
        fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
        
        // Create version snapshot
        if (this.versionService) {
          await this.versionService.create({
            projectId: updated.projectId,
            entityType: 'Requirement',
            entityId: updated.id,
            snapshot: updated as any,
            changeSummary: 'Requirement updated',
          });
        }

        // Publish event for audit logging
        if (this.eventBus) {
          await this.eventBus.publish({
            type: 'UPDATED',
            module: 'requirements',
            entityId: updated.id,
            projectId: updated.projectId,
            timestamp: Date.now(),
            payload: {
              entityType: 'Requirement',
              oldValue: items[index] as any,
              newValue: updated as any,
            },
          });
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
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));

        // Publish event for audit logging
        if (this.eventBus) {
          await this.eventBus.publish({
            type: 'DELETED',
            module: 'requirements',
            entityId: deleted.id,
            projectId: deleted.projectId,
            timestamp: Date.now(),
            payload: {
              entityType: 'Requirement',
              oldValue: deleted as any,
              newValue: null,
            },
          });
        }

        // Create version snapshot for deletion
        if (this.versionService) {
          await this.versionService.create({
            projectId: deleted.projectId,
            entityType: 'Requirement',
            entityId: deleted.id,
            snapshot: deleted as any,
            changeSummary: 'Requirement deleted',
          });
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
    if (!fs.existsSync(DATA_ROOT)) return [];
    return fs.readdirSync(DATA_ROOT).filter(name => {
      const fullPath = path.join(DATA_ROOT, name);
      return fs.statSync(fullPath).isDirectory();
    });
  }

  private readRequirements(projectId: string): RequirementEntity[] {
    const filePath = this.getRequirementsFilePath(projectId);
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
}

export default RequirementRepository;