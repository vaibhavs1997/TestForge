// AnalysisRepository - Domain Repository Interface for AI Project Analysis
export interface AnalysisRepository {
  create(analysis: any): Promise<any>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<any>;
  findByProject(projectId: string): Promise<any[]>;
  list(): Promise<any[]>;
}

export default AnalysisRepository;