// ExecutionPlanRepository - Domain Repository Interface for Execution Planner
export interface ExecutionPlanRepository {
  create(plan: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<any>;
  findByRequirement(requirementId: string): Promise<any[]>;
  findByTestDesign(testDesignId: string): Promise<any | null>;
  findByProject(projectId: string): Promise<any[]>;
  list(): Promise<any[]>;
}

export default ExecutionPlanRepository;