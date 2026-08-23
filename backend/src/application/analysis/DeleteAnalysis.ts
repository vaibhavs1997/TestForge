// DeleteAnalysis - Application Use Case
import { deleteById } from '../shared/crudHelpers.js';
import { AnalysisRepository } from '../../domain/analysis/AnalysisRepository.js';

export class DeleteAnalysis {
  constructor(private readonly analysisRepository: AnalysisRepository) {}

  async execute(id: string): Promise<void> {
    await deleteById(this.analysisRepository, id, 'Analysis');
  }
}

export default DeleteAnalysis;
