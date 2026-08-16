// Dataset Relationship types

import type { RelationshipDto } from '../../../types/moduleContracts';

export type Relationship = RelationshipDto;

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
