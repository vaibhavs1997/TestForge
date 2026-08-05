// GetAnalysis - Application Use Case
import { AnalysisRepository } from '../../domain/analysis/AnalysisRepository';
import { AnalysisEntity } from '../../domain/analysis/AnalysisEntity';

export class GetAnalysis {
  constructor(private readonly analysisRepository: AnalysisRepository) {}

  async execute(id: string): Promise<AnalysisEntity> {
    const analysis = await this.analysisRepository.findById(id);
    if (!analysis) {
      throw new Error(`Analysis with id ${id} not found`);
    }
    return analysis;
  }
}

export default GetAnalysis;