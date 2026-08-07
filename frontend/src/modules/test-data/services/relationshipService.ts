// Relationship service for Dataset Relationships

import { ApiClient } from '../../../services/ApiClient';
import type { Relationship, CreateRelationshipInput } from '../types/relationship';

class RelationshipService extends ApiClient<Relationship> {
  constructor() {
    super('/projects/:projectId/relationships');
  }

  async listByProject(projectId: string): Promise<Relationship[]> {
    return this.list(projectId);
  }

  async listByDataset(projectId: string, datasetId: string): Promise<Relationship[]> {
    const path = `/projects/${projectId}/datasets/${datasetId}/relationships`;
    return this.getCustom(path);
  }

  async createRelationship(projectId: string, input: CreateRelationshipInput): Promise<Relationship> {
    return this.create(projectId, input);
  }

  async updateRelationship(projectId: string, relationshipId: string, updates: Partial<CreateRelationshipInput>): Promise<Relationship> {
    return this.patch(projectId, relationshipId, updates);
  }

  async deleteRelationship(projectId: string, relationshipId: string): Promise<void> {
    return this.delete(projectId, relationshipId);
  }
}

export const relationshipService = new RelationshipService();

export default relationshipService;