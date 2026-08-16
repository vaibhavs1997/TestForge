// Test Data Library row types
import type { DatasetRowDto } from '../../../types/moduleContracts';

export type DatasetRow = DatasetRowDto;

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
