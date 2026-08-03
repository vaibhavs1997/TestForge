// KnowledgeFlowRepository - Domain Repository Interface for Business Flows
export interface KnowledgeFlowRepository {
  create(flow: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<any>;
  findByProject(projectId: string): Promise<any[]>;
  existsByName(name: string, projectId: string): Promise<boolean>;
  list(): Promise<any[]>;
}

export default KnowledgeFlowRepository;