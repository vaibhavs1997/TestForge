export interface ColumnRepository {
  create(column: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<any>;
  findByDataset(datasetId: string): Promise<any[]>;
  existsByName(name: string, datasetId: string): Promise<boolean>;
  list(): Promise<any[]>;
}