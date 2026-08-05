// TestDesignRepository - Domain Repository Interface for Test Design
export interface TestDesignRepository {
  create(design: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<any>;
  findByRequirement(requirementId: string): Promise<any[]>;
  findByStrategyItem(strategyItemId: string): Promise<any | null>;
  findByProject(projectId: string): Promise<any[]>;
  list(): Promise<any[]>;
}

export default TestDesignRepository;