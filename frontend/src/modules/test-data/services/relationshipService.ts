// Relationship service for Dataset Relationships

import { ApiClient } from '../../../services/ApiClient';
import type { Relationship, CreateRelationshipInput } from '../types/relationship';
import type { RelationshipDto } from '../../../types/moduleContracts';
import { normalizeRelationship } from '../../../utils/moduleAdapters';

class RelationshipService extends ApiClient<RelationshipDto> {
  constructor() {
    super('/projects/:projectId/relationships');
  }

  async listByProject(projectId: string): Promise<Relationship[]> {
    return (await this.list(projectId)).map(normalizeRelationship);
  }

  async listByDataset(projectId: string, datasetId: string): Promise<Relationship[]> {
    const path = `/projects/${projectId}/datasets/${datasetId}/relationships`;
    return (await this.getCustom<RelationshipDto[]>(path)).map(normalizeRelationship);
  }

  async createRelationship(projectId: string, input: CreateRelationshipInput): Promise<Relationship> {
    return normalizeRelationship(await this.create(projectId, input));
  }

  async updateRelationship(projectId: string, relationshipId: string, updates: Partial<CreateRelationshipInput>): Promise<Relationship> {
    return normalizeRelationship(await this.patch(projectId, relationshipId, updates));
  }

  async deleteRelationship(projectId: string, relationshipId: string): Promise<void> {
    return this.delete(projectId, relationshipId);
  }
}

export const relationshipService = new RelationshipService();

export default relationshipService;
