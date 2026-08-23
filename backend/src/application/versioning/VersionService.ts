// VersionService - Application Service for Versioning Framework
// Creates and manages version history for entities.

import { randomUUID } from 'node:crypto';
import { VersionEntity, EntityType } from '../../domain/versioning/VersionEntity.js';
import { VersionRepository } from '../../domain/versioning/VersionRepository.js';
import { sensitiveDataRedactor } from '../../infrastructure/security/SensitiveDataRedactionService.js';

export interface CreateVersionInput {
  projectId: string;
  entityType: EntityType;
  entityId: string;
  snapshot: Record<string, any>;
  changeSummary?: string;
  createdBy?: string;
}

export interface RestoreVersionInput {
  versionId: string;
  createdBy?: string;
}

export class VersionService {
  constructor(private readonly versionRepository: VersionRepository) {}

  async create(input: CreateVersionInput): Promise<VersionEntity> {
    // Get the latest version number for this entity
    const latestVersion = await this.versionRepository.findLatestByEntity(
      input.entityType,
      input.entityId
    );
    
    const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;
    const now = Date.now();
    
    const version = new VersionEntity(
      randomUUID(),
      input.projectId,
      input.entityType,
      input.entityId,
      nextVersionNumber,
      sensitiveDataRedactor.redact(input.snapshot),
      input.changeSummary || null,
      input.createdBy || 'System',
      now
    );

    return this.versionRepository.create(version);
  }

  async getVersion(versionId: string): Promise<VersionEntity> {
    const version = await this.versionRepository.findById(versionId);
    if (!version) {
      throw new Error(`Version with id ${versionId} not found`);
    }
    return version;
  }

  async listProjectVersions(projectId: string): Promise<VersionEntity[]> {
    return this.versionRepository.findByProject(projectId);
  }

  async listEntityVersions(entityType: string, entityId: string): Promise<VersionEntity[]> {
    return this.versionRepository.findByEntity(entityType, entityId);
  }

  async getLatestVersion(entityType: string, entityId: string): Promise<VersionEntity | null> {
    return this.versionRepository.findLatestByEntity(entityType, entityId);
  }

  async restoreVersion(input: RestoreVersionInput): Promise<VersionEntity> {
    const sourceVersion = await this.getVersion(input.versionId);
    
    // Create a new version representing the restore
    const restoreInput: CreateVersionInput = {
      projectId: sourceVersion.projectId,
      entityType: sourceVersion.entityType,
      entityId: sourceVersion.entityId,
      snapshot: { ...sourceVersion.snapshot, restoredFrom: sourceVersion.id },
      changeSummary: `Restored to version ${sourceVersion.versionNumber}`,
      createdBy: input.createdBy || 'System',
    };

    return this.create(restoreInput);
  }

  async compareVersions(versionId1: string, versionId2: string): Promise<{
    oldVersion: VersionEntity;
    newVersion: VersionEntity;
    differences: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
  }> {
    const oldVersion = await this.getVersion(versionId1);
    const newVersion = await this.getVersion(versionId2);
    
    const differences: Array<{ field: string; oldValue: any; newValue: any }> = [];
    
    // Compare all fields in the snapshot
    const oldSnapshot = oldVersion.snapshot;
    const newSnapshot = newVersion.snapshot;
    
    const allKeys = new Set([
      ...Object.keys(oldSnapshot),
      ...Object.keys(newSnapshot)
    ]);
    
    for (const key of allKeys) {
      const oldValue = oldSnapshot[key];
      const newValue = newSnapshot[key];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        differences.push({
          field: key,
          oldValue,
          newValue,
        });
      }
    }
    
    return {
      oldVersion,
      newVersion,
      differences,
    };
  }
}

export default VersionService;
