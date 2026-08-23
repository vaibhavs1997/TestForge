// GetAnalysis - Application Use Case
import { requireById } from '../shared/crudHelpers.js';
import { AnalysisRepository } from '../../domain/analysis/AnalysisRepository.js';
import { AnalysisEntity } from '../../domain/analysis/AnalysisEntity.js';

export class GetAnalysis {
  constructor(private readonly analysisRepository: AnalysisRepository) {}

  async execute(id: string): Promise<AnalysisEntity> {
    return requireById(this.analysisRepository, id, 'Analysis');
  }
}

export default GetAnalysis;
