// GetAnalysis - Application Use Case
import { requireById } from '../shared/crudHelpers';
import { AnalysisRepository } from '../../domain/analysis/AnalysisRepository';
import { AnalysisEntity } from '../../domain/analysis/AnalysisEntity';

export class GetAnalysis {
  constructor(private readonly analysisRepository: AnalysisRepository) {}

  async execute(id: string): Promise<AnalysisEntity> {
    return requireById(this.analysisRepository, id, 'Analysis');
  }
}

export default GetAnalysis;
