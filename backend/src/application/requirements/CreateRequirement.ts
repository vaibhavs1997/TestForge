// CreateRequirement - Application Use Case
import { randomUUID } from 'node:crypto';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository.js';
import { RequirementEntity, RequirementSource, ReviewStatus, ApprovalStatus, AcceptanceCriterion } from '../../domain/requirements/RequirementEntity.js';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers.js';

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
    acceptanceCriteria?: Array<AcceptanceCriterion | string>;
    jiraIssueKey?: string | null;
    generationPending?: boolean;
    generationExpiresAt?: number | null;
  }): Promise<RequirementEntity> {
    const title = ValidationHelpers.validateRequired(params.title, 'Requirement title');

    const acceptanceCriteria: AcceptanceCriterion[] = (params.acceptanceCriteria || [])
      .map((criterion): AcceptanceCriterion | null => {
        if (typeof criterion === 'string') {
          const text = ValidationHelpers.trimString(criterion);
          return text ? { id: randomUUID(), text } : null;
        }
        if (!criterion || typeof criterion !== 'object') return null;
        const text = ValidationHelpers.trimString(criterion.text);
        return text
          ? { id: ValidationHelpers.trimString(criterion.id) || randomUUID(), text }
          : null;
      })
      .filter((criterion): criterion is AcceptanceCriterion => criterion !== null);

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
      params.approvalStatus || 'Draft',
      ValidationHelpers.trimStringArray(params.relatedOperations),
      ValidationHelpers.trimStringArray(params.relatedFlows),
      ValidationHelpers.trimStringArray(params.relatedDatasets),
      acceptanceCriteria,
      now,
      now,
      Boolean(params.generationPending),
      params.generationExpiresAt ?? null,
    );

    const jiraKey = ValidationHelpers.trimString(params.jiraIssueKey ?? '');
    if (jiraKey) {
      requirement.jiraIssueKey = jiraKey.toUpperCase();
    }

    return this.requirementRepository.create(requirement);
  }
}

export default CreateRequirement;
