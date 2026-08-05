// VersionRepository - Domain Repository for Versioning Framework
// Handles persistence operations for VersionEntity.

import { VersionEntity } from './VersionEntity';

export interface VersionRepository {
  create(version: VersionEntity): Promise<VersionEntity>;
  findById(id: string): Promise<VersionEntity | null>;
  findByProject(projectId: string): Promise<VersionEntity[]>;
  findByEntity(entityType: string, entityId: string): Promise<VersionEntity[]>;
  findLatestByEntity(entityType: string, entityId: string): Promise<VersionEntity | null>;
  findByProjectAndEntityType(projectId: string, entityType: string): Promise<VersionEntity[]>;
  list(): Promise<VersionEntity[]>;
}

export default VersionRepository;