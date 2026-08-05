// ExecutionRunRepository - Domain Repository Interface for Execution Engine
export interface ExecutionRunRepository {
  create(run: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  findById(id: string): Promise<any>;
  findByProject(projectId: string): Promise<any[]>;
  findByRequirement(requirementId: string): Promise<any[]>;
  list(): Promise<any[]>;
}

export default ExecutionRunRepository;