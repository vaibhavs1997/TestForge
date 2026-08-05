// TestStrategyRepository - Domain Repository Interface for Test Strategy Planning
export interface TestStrategyRepository {
  create(strategy: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<any>;
  findByRequirement(requirementId: string): Promise<any>;
  findByProject(projectId: string): Promise<any[]>;
  list(): Promise<any[]>;
}

export default TestStrategyRepository;