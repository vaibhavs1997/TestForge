// RelationshipRepository - In-memory implementation of Relationship Repository

import { randomUUID } from 'node:crypto';
import { IRelationshipRepository } from '../../domain/test-data/RelationshipRepository';
import { RelationshipEntity } from '../../domain/test-data/RelationshipEntity';

export class RelationshipRepository implements IRelationshipRepository {
  private relationships: Map<string, RelationshipEntity> = new Map();
  private projectRelationships: Map<string, Set<string>> = new Map();
  private datasetRelationships: Map<string, Set<string>> = new Map();

  async create(relationship: Omit<RelationshipEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<RelationshipEntity> {
    const id = randomUUID();
    const now = Date.now();
    
    const entity = new RelationshipEntity(
      id,
      relationship.projectId,
      relationship.parentDatasetId,
      relationship.childDatasetId,
      relationship.relationshipType,
      relationship.parentColumn,
      relationship.childColumn,
      relationship.cardinality,
      relationship.enabled,
      now,
      now
    );

    this.relationships.set(id, entity);

    // Index by project
    if (!this.projectRelationships.has(relationship.projectId)) {
      this.projectRelationships.set(relationship.projectId, new Set());
    }
    this.projectRelationships.get(relationship.projectId)!.add(id);

    // Index by parent dataset
    if (!this.datasetRelationships.has(relationship.parentDatasetId)) {
      this.datasetRelationships.set(relationship.parentDatasetId, new Set());
    }
    this.datasetRelationships.get(relationship.parentDatasetId)!.add(id);

    // Index by child dataset
    if (!this.datasetRelationships.has(relationship.childDatasetId)) {
      this.datasetRelationships.set(relationship.childDatasetId, new Set());
    }
    this.datasetRelationships.get(relationship.childDatasetId)!.add(id);

    return entity;
  }

  async update(id: string, data: Partial<Omit<RelationshipEntity, 'id' | 'projectId' | 'parentDatasetId' | 'childDatasetId' | 'createdAt'>>): Promise<RelationshipEntity> {
    const existing = this.relationships.get(id);
    if (!existing) {
      throw new Error('Relationship not found');
    }

    const updated = new RelationshipEntity(
      existing.id,
      existing.projectId,
      existing.parentDatasetId,
      existing.childDatasetId,
      data.relationshipType ?? existing.relationshipType,
      data.parentColumn ?? existing.parentColumn,
      data.childColumn ?? existing.childColumn,
      data.cardinality ?? existing.cardinality,
      data.enabled ?? existing.enabled,
      existing.createdAt,
      Date.now()
    );

    this.relationships.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const relationship = this.relationships.get(id);
    if (!relationship) {
      return;
    }

    this.relationships.delete(id);

    // Remove from project index
    const projectRels = this.projectRelationships.get(relationship.projectId);
    if (projectRels) {
      projectRels.delete(id);
    }

    // Remove from dataset indexes
    const parentRels = this.datasetRelationships.get(relationship.parentDatasetId);
    if (parentRels) {
      parentRels.delete(id);
    }

    const childRels = this.datasetRelationships.get(relationship.childDatasetId);
    if (childRels) {
      childRels.delete(id);
    }
  }

  async findById(id: string): Promise<RelationshipEntity | null> {
    return this.relationships.get(id) || null;
  }

  async listByProject(projectId: string): Promise<RelationshipEntity[]> {
    const relIds = this.projectRelationships.get(projectId);
    if (!relIds) {
      return [];
    }

    return Array.from(relIds)
      .map(id => this.relationships.get(id))
      .filter((rel): rel is RelationshipEntity => rel !== undefined);
  }

  async listByDataset(datasetId: string): Promise<RelationshipEntity[]> {
    const relIds = this.datasetRelationships.get(datasetId);
    if (!relIds) {
      return [];
    }

    return Array.from(relIds)
      .map(id => this.relationships.get(id))
      .filter((rel): rel is RelationshipEntity => rel !== undefined);
  }

  async findRelationship(parentDatasetId: string, childDatasetId: string, parentColumn: string, childColumn: string): Promise<RelationshipEntity | null> {
    const rels = await this.listByProject('');
    return rels.find(
      rel => rel.parentDatasetId === parentDatasetId &&
             rel.childDatasetId === childDatasetId &&
             rel.parentColumn === parentColumn &&
             rel.childColumn === childColumn
    ) || null;
  }

  async exists(parentDatasetId: string, childDatasetId: string, parentColumn: string, childColumn: string): Promise<boolean> {
    const rel = await this.findRelationship(parentDatasetId, childDatasetId, parentColumn, childColumn);
    return rel !== null;
  }

  async checkCircularReference(datasetId: string, targetDatasetId: string): Promise<boolean> {
    // Check if adding a relationship would create a cycle
    const visited = new Set<string>();
    const queue = [targetDatasetId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current === datasetId) {
        return true; // Circular reference found
      }

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      // Find all relationships where current dataset is a parent
      const rels = await this.listByDataset(current);
      for (const rel of rels) {
        if (rel.parentDatasetId === current && rel.enabled) {
          queue.push(rel.childDatasetId);
        }
      }
    }

    return false;
  }
}

export default RelationshipRepository;