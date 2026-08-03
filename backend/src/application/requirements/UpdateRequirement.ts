// UpdateRequirement - Application Use Case
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import { RequirementEntity, RequirementSource, ReviewStatus, ApprovalStatus, AcceptanceCriterion } from '../../domain/requirements/RequirementEntity';

export class UpdateRequirement {
  constructor(private readonly requirementRepository: RequirementRepository) {}

  async execute(params: {
    id: string;
    title?: string;
    description?: string;
    category?: string;
    confidence?: number;
    source?: RequirementSource;
    projectAnalysisId?: string | null;
    reviewStatus?: ReviewStatus;
    approvalStatus?: ApprovalStatus;
    relatedOperations?: string[];
    relatedFlows?: string[];
    relatedDatasets?: string[];
    acceptanceCriteria?: AcceptanceCriterion[];
  }): Promise<RequirementEntity> {
    const existing = await this.requirementRepository.findById(params.id);
    if (!existing) {
      throw new Error(`Requirement with id ${params.id} not found`);
    }

    if (params.title !== undefined && !params.title.trim()) {
      throw new Error('Requirement title cannot be empty');
    }

    const updateData: any = {};
    if (params.title !== undefined) updateData.title = params.title.trim();
    if (params.description !== undefined) updateData.description = params.description.trim();
    if (params.category !== undefined) updateData.category = params.category.trim();
    if (params.confidence !== undefined) updateData.confidence = params.confidence;
    if (params.source !== undefined) updateData.source = params.source;
    if (params.projectAnalysisId !== undefined) updateData.projectAnalysisId = params.projectAnalysisId;
    if (params.reviewStatus !== undefined) updateData.reviewStatus = params.reviewStatus;
    if (params.approvalStatus !== undefined) updateData.approvalStatus = params.approvalStatus;
    if (params.relatedOperations !== undefined) updateData.relatedOperations = params.relatedOperations;
    if (params.relatedFlows !== undefined) updateData.relatedFlows = params.relatedFlows;
    if (params.relatedDatasets !== undefined) updateData.relatedDatasets = params.relatedDatasets;
    if (params.acceptanceCriteria !== undefined) updateData.acceptanceCriteria = params.acceptanceCriteria;

    return this.requirementRepository.update(params.id, updateData);
  }
}

export default UpdateRequirement;