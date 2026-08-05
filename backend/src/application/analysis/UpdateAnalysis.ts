// UpdateAnalysis - Application Use Case
import { AnalysisRepository } from '../../domain/analysis/AnalysisRepository';
import { AnalysisEntity, AnalysisStatus } from '../../domain/analysis/AnalysisEntity';

export class UpdateAnalysis {
  constructor(private readonly analysisRepository: AnalysisRepository) {}

  async execute(params: {
    id: string;
    title?: string;
    description?: string;
    category?: string;
    confidence?: number;
    relatedOperations?: string[];
    relatedFlows?: string[];
    relatedDatasets?: string[];
    relatedRuntimeVariables?: string[];
    status?: AnalysisStatus;
  }): Promise<AnalysisEntity> {
    const existing = await this.analysisRepository.findById(params.id);
    if (!existing) {
      throw new Error(`Analysis with id ${params.id} not found`);
    }

    if (params.title !== undefined && !params.title.trim()) {
      throw new Error('Analysis title cannot be empty');
    }

    const updateData: any = {};
    if (params.title !== undefined) updateData.title = params.title.trim();
    if (params.description !== undefined) updateData.description = params.description.trim();
    if (params.category !== undefined) updateData.category = params.category.trim();
    if (params.confidence !== undefined) updateData.confidence = params.confidence;
    if (params.relatedOperations !== undefined) updateData.relatedOperations = params.relatedOperations;
    if (params.relatedFlows !== undefined) updateData.relatedFlows = params.relatedFlows;
    if (params.relatedDatasets !== undefined) updateData.relatedDatasets = params.relatedDatasets;
    if (params.relatedRuntimeVariables !== undefined) updateData.relatedRuntimeVariables = params.relatedRuntimeVariables;
    if (params.status !== undefined) updateData.status = params.status;

    return this.analysisRepository.update(params.id, updateData);
  }
}

export default UpdateAnalysis;