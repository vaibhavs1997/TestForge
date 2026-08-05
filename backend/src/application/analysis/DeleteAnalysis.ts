// DeleteAnalysis - Application Use Case
import { AnalysisRepository } from '../../domain/analysis/AnalysisRepository';

export class DeleteAnalysis {
  constructor(private readonly analysisRepository: AnalysisRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.analysisRepository.findById(id);
    if (!existing) {
      throw new Error(`Analysis with id ${id} not found`);
    }
    await this.analysisRepository.delete(id);
  }
}

export default DeleteAnalysis;