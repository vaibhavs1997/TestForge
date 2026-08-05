// Dataset Relationship types

export interface Relationship {
  id: string;
  projectId: string;
  parentDatasetId: string;
  childDatasetId: string;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  parentColumn: string;
  childColumn: string;
  cardinality: '1:1' | '1:N' | 'N:1';
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateRelationshipInput {
  parentDatasetId: string;
  childDatasetId: string;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  parentColumn: string;
  childColumn: string;
  cardinality: '1:1' | '1:N' | 'N:1';
  enabled?: boolean;
}

export interface UpdateRelationshipInput {
  relationshipType?: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  parentColumn?: string;
  childColumn?: string;
  cardinality?: '1:1' | '1:N' | 'N:1';
  enabled?: boolean;
}