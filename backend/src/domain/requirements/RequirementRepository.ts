// RequirementRepository - Domain Repository Interface for Requirement Workspace
export interface RequirementRepository {
  create(requirement: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<any>;
  findByProject(projectId: string): Promise<any[]>;
  list(): Promise<any[]>;
}

export default RequirementRepository;