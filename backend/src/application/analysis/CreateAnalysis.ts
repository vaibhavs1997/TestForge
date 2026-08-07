// CreateAnalysis - Application Use Case
import { randomUUID } from 'node:crypto';
import { AnalysisRepository } from '../../domain/analysis/AnalysisRepository';
import { AnalysisEntity, AnalysisStatus } from '../../domain/analysis/AnalysisEntity';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';

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
    const title = ValidationHelpers.validateRequired(params.title, 'Analysis title');

    const now = Date.now();
    const analysis = new AnalysisEntity(
      randomUUID(),
      params.projectId,
      title,
      ValidationHelpers.trimString(params.description),
      ValidationHelpers.trimString(params.category) || 'General',
      params.confidence ?? 0,
      ValidationHelpers.trimStringArray(params.relatedOperations),
      ValidationHelpers.trimStringArray(params.relatedFlows),
      ValidationHelpers.trimStringArray(params.relatedDatasets),
      ValidationHelpers.trimStringArray(params.relatedRuntimeVariables),
      params.status || 'Pending',
      now,
      now
    );

    return this.analysisRepository.create(analysis);
  }
}

export default CreateAnalysis;
