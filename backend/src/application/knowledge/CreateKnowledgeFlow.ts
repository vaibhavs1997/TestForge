// CreateKnowledgeFlow - Application Use Case
import { randomUUID } from 'node:crypto';
import { KnowledgeFlowRepository } from '../../domain/knowledge/KnowledgeFlowRepository';
import { KnowledgeFlowEntity, FlowStatus, FlowStep } from '../../domain/knowledge/KnowledgeFlowEntity';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';

export class CreateKnowledgeFlow {
  constructor(private readonly knowledgeFlowRepository: KnowledgeFlowRepository) {}

  async execute(params: {
    projectId: string;
    name: string;
    description?: string;
    tags?: string[];
    status?: FlowStatus;
    steps?: FlowStep[];
  }): Promise<KnowledgeFlowEntity> {
    const name = ValidationHelpers.validateRequired(params.name, 'Flow Name');

    try {
      await ValidationHelpers.validateUniqueName(
        this.knowledgeFlowRepository,
        params.name,
        params.projectId
      );
    } catch (error) {
      if (error instanceof Error && error.message === `Resource with name "${params.name}" already exists in this project`) {
        throw new Error(`Flow with name "${params.name}" already exists in this project`);
      }
      throw error;
    }

    const now = Date.now();
    const flow = new KnowledgeFlowEntity(
      randomUUID(),
      params.projectId,
      name,
      ValidationHelpers.trimString(params.description),
      ValidationHelpers.trimStringArray(params.tags),
      params.status || 'Draft',
      params.steps || [],
      now,
      now
    );

    return this.knowledgeFlowRepository.create(flow);
  }
}

export default CreateKnowledgeFlow;
