// RelationshipRepository - Repository interface for Dataset Relationships

import { RelationshipEntity } from './RelationshipEntity';

export interface IRelationshipRepository {
  create(relationship: Omit<RelationshipEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<RelationshipEntity>;
  update(id: string, data: Partial<Omit<RelationshipEntity, 'id' | 'projectId' | 'parentDatasetId' | 'childDatasetId' | 'createdAt'>>): Promise<RelationshipEntity>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<RelationshipEntity | null>;
  listByProject(projectId: string): Promise<RelationshipEntity[]>;
  listByDataset(datasetId: string): Promise<RelationshipEntity[]>;
  findRelationship(parentDatasetId: string, childDatasetId: string, parentColumn: string, childColumn: string): Promise<RelationshipEntity | null>;
  exists(parentDatasetId: string, childDatasetId: string, parentColumn: string, childColumn: string): Promise<boolean>;
  checkCircularReference(datasetId: string, targetDatasetId: string): Promise<boolean>;
}

export default IRelationshipRepository;