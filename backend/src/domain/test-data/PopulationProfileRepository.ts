export interface PopulationProfileRepository {
  create(profile: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<any>;
  findByDataset(datasetId: string): Promise<any[]>;
  findByColumn(columnId: string): Promise<any | null>;
  list(): Promise<any[]>;
}