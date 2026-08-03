// CreateAnalysis - Application Use Case
import { AnalysisRepository } from '../../domain/analysis/AnalysisRepository';
import { AnalysisEntity, AnalysisStatus } from '../../domain/analysis/AnalysisEntity';

export class CreateAnalysis {
  constructor(private readonly analysisRepository: AnalysisRepository) {}

  async execute(params: {
    projectId: string;
    title: string;
    description?: string;
    category?: string;
    confidence?: number;
    relatedOperations?: string[];
    relatedFlows?: string[];
    relatedDatasets?: string[];
    relatedRuntimeVariables?: string[];
    status?: AnalysisStatus;
  }): Promise<AnalysisEntity> {
    if (!params.title || !params.title.trim()) {
      throw new Error('Analysis title is required');
    }

    const now = Date.now();
    const analysis = new AnalysisEntity(
      crypto.randomUUID(),
      params.projectId,
      params.title.trim(),
      params.description?.trim() || '',
      params.category?.trim() || 'General',
      params.confidence ?? 0,
      params.relatedOperations || [],
      params.relatedFlows || [],
      params.relatedDatasets || [],
      params.relatedRuntimeVariables || [],
      params.status || 'Pending',
      now,
      now
    );

    return this.analysisRepository.create(analysis);
  }
}

export default CreateAnalysis;