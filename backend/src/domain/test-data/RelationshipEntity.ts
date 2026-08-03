// RelationshipEntity - Domain Entity for Dataset Relationships
// Defines relationships between datasets for relational data

export class RelationshipEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public parentDatasetId: string,
    public childDatasetId: string,
    public relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many',
    public parentColumn: string,
    public childColumn: string,
    public cardinality: '1:1' | '1:N' | 'N:1',
    public enabled: boolean,
    public readonly createdAt: number,
    public updatedAt: number
  ) {}
}

export default RelationshipEntity;