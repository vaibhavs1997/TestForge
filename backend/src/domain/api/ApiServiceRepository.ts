export interface ApiServiceRepository {
  create(service: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  deleteInProject(projectId: string, id: string): Promise<boolean>;
  deleteByProject(projectId: string): Promise<number>;
  findById(id: string): Promise<any>;
  findByProject(projectId: string): Promise<any[]>;
  existsByName(name: string, projectId: string): Promise<boolean>;
  list(): Promise<any[]>;
}
