// ExecutionRunRepository - Domain Repository Interface for Execution Engine
export interface ExecutionRunRepository {
  create(run: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  deleteByProject(projectId: string): Promise<number>;
  findById(id: string): Promise<any>;
  findByProject(projectId: string): Promise<any[]>;
  findByRequirement(requirementId: string): Promise<any[]>;
  list(): Promise<any[]>;
}

export default ExecutionRunRepository;
