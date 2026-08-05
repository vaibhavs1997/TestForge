// DatasetRowRepository - Repository interface for Dataset Row

import { DatasetRowEntity } from './DatasetRowEntity';

export interface IDatasetRowRepository {
  create(row: Omit<DatasetRowEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatasetRowEntity>;
  update(id: string, data: Partial<Omit<DatasetRowEntity, 'id' | 'projectId' | 'datasetId' | 'createdAt'>>): Promise<DatasetRowEntity>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<DatasetRowEntity | null>;
  list(datasetId: string): Promise<DatasetRowEntity[]>;
  listByProject(projectId: string): Promise<DatasetRowEntity[]>;
  existsByName(name: string, projectId: string): Promise<boolean>;
}

export default IDatasetRowRepository;