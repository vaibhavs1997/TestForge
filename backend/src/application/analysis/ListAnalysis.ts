// ListAnalysis - Application Use Case
import { AnalysisRepository } from '../../domain/analysis/AnalysisRepository.js';
import { AnalysisEntity } from '../../domain/analysis/AnalysisEntity.js';

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