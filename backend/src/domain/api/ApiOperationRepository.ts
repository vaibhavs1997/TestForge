export interface ApiOperationRepository {
  create(operation: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<any>;
  findByService(serviceId: string): Promise<any[]>;
  findByProject(projectId: string): Promise<any[]>;
  findByProjectAndService(projectId: string, serviceId: string): Promise<any[]>;
  deleteByServiceId(projectId: string, serviceId: string): Promise<void>;
  deleteByProject(projectId: string): Promise<number>;
  list(): Promise<any[]>;
}
