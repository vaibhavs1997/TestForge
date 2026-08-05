export interface ApiOperationRepository {
  create(operation: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<any>;
  findByService(serviceId: string): Promise<any[]>;
  list(): Promise<any[]>;
}