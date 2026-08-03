// ListAnalysis - Application Use Case
import { AnalysisRepository } from '../../domain/analysis/AnalysisRepository';
import { AnalysisEntity } from '../../domain/analysis/AnalysisEntity';

export class ListAnalysis {
  constructor(private readonly analysisRepository: AnalysisRepository) {}

  async execute(params: {
    projectId?: string;
  }): Promise<AnalysisEntity[]> {
    if (params.projectId) {
      return this.analysisRepository.findByProject(params.projectId);
    }
    return this.analysisRepository.list();
  }
}

export default ListAnalysis;