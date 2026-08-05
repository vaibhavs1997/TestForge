// Test Data Library row types
export interface DatasetRow {
  id: string;
  projectId: string;
  datasetId: string;
  values: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface CreateRowInput {
  projectId: string;
  datasetId: string;
  values: Record<string, any>;
}

export interface ColumnInfo {
  id?: string;
  datasetId: string;
  name: string;
  displayName: string;
  dataType: string;
  required: boolean;
  unique: boolean;
  nullable: boolean;
  description: string;
}