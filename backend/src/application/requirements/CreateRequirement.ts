// CreateRequirement - Application Use Case
import { randomUUID } from 'node:crypto';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import { RequirementEntity, RequirementSource, ReviewStatus, ApprovalStatus, AcceptanceCriterion } from '../../domain/requirements/RequirementEntity';

export class CreateRequirement {
  constructor(private readonly requirementRepository: RequirementRepository) {}

  async execute(params: {
    projectId: string;
    title: string;
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
    if (!params.title || !params.title.trim()) {
      throw new Error('Requirement title is required');
    }

    const now = Date.now();
    const requirement = new RequirementEntity(
      randomUUID(),
      params.projectId,
      params.title.trim(),
      params.description?.trim() || '',
      params.category?.trim() || 'General',
      params.confidence ?? 0,
      params.source || 'Manual',
      params.projectAnalysisId ?? null,
      params.reviewStatus || 'Pending',
      params.approvalStatus || 'Suggested',
      params.relatedOperations || [],
      params.relatedFlows || [],
      params.relatedDatasets || [],
      params.acceptanceCriteria || [],
      now,
      now
    );

    return this.requirementRepository.create(requirement);
  }
}

export default CreateRequirement;