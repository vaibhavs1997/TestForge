export interface DataSourceMappingRepository {
  create(mapping: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<any>;
  findByProject(projectId: string): Promise<any[]>;
  findByOperation(operationId: string): Promise<any[]>;
  existsByField(operationId: string, fieldPath: string): Promise<boolean>;
  list(): Promise<any[]>;
}