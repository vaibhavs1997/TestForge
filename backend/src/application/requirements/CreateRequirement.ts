// CreateRequirement - Application Use Case
import { randomUUID } from 'node:crypto';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import { RequirementEntity, RequirementSource, ReviewStatus, ApprovalStatus, AcceptanceCriterion } from '../../domain/requirements/RequirementEntity';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';

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
    const title = ValidationHelpers.validateRequired(params.title, 'Requirement title');

    const now = Date.now();
    const requirement = new RequirementEntity(
      randomUUID(),
      params.projectId,
      title,
      ValidationHelpers.trimString(params.description),
      ValidationHelpers.trimString(params.category) || 'General',
      params.confidence ?? 0,
      params.source || 'Manual',
      params.projectAnalysisId ?? null,
      params.reviewStatus || 'Pending',
      params.approvalStatus || 'Suggested',
      ValidationHelpers.trimStringArray(params.relatedOperations),
      ValidationHelpers.trimStringArray(params.relatedFlows),
      ValidationHelpers.trimStringArray(params.relatedDatasets),
      params.acceptanceCriteria || [],
      now,
      now
    );

    return this.requirementRepository.create(requirement);
  }
}

export default CreateRequirement;
