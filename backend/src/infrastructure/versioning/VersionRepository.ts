// VersionRepository - Infrastructure implementation for Versioning Framework
// Uses in-memory storage. Can be swapped for DB implementation.

import { VersionEntity, VersionRepository } from '../../domain/versioning';

export class InMemoryVersionRepository implements VersionRepository {
  private versions: Map<string, VersionEntity> = new Map();
  private entityVersions: Map<string, string[]> = new Map(); // entityKey -> version ids

  private getEntityKey(entityType: string, entityId: string): string {
    return `${entityType}:${entityId}`;
  }

  async create(version: VersionEntity): Promise<VersionEntity> {
    this.versions.set(version.id, version);
    
    const entityKey = this.getEntityKey(version.entityType, version.entityId);
    if (!this.entityVersions.has(entityKey)) {
      this.entityVersions.set(entityKey, []);
    }
    this.entityVersions.get(entityKey)!.push(version.id);
    
    return version;
  }

  async findById(id: string): Promise<VersionEntity | null> {
    return this.versions.get(id) || null;
  }

  async findByProject(projectId: string): Promise<VersionEntity[]> {
    return Array.from(this.versions.values()).filter(v => v.projectId === projectId);
  }

  async findByEntity(entityType: string, entityId: string): Promise<VersionEntity[]> {
    const entityKey = this.getEntityKey(entityType, entityId);
    const versionIds = this.entityVersions.get(entityKey) || [];
    return versionIds
      .map(id => this.versions.get(id))
      .filter((v): v is VersionEntity => v !== undefined);
  }

  async findLatestByEntity(entityType: string, entityId: string): Promise<VersionEntity | null> {
    const versions = await this.findByEntity(entityType, entityId);
    if (versions.length === 0) return null;
    return versions.reduce((latest, current) => 
      current.versionNumber > latest.versionNumber ? current : latest
    );
  }

  async findByProjectAndEntityType(projectId: string, entityType: string): Promise<VersionEntity[]> {
    return Array.from(this.versions.values()).filter(
      v => v.projectId === projectId && v.entityType === entityType
    );
  }

  async list(): Promise<VersionEntity[]> {
    return Array.from(this.versions.values());
  }
}

export default InMemoryVersionRepository;