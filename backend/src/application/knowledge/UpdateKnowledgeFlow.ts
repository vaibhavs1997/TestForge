// UpdateKnowledgeFlow - Application Use Case
import { KnowledgeFlowRepository } from '../../domain/knowledge/KnowledgeFlowRepository';
import { KnowledgeFlowEntity, FlowStatus, FlowStep } from '../../domain/knowledge/KnowledgeFlowEntity';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';

export class UpdateKnowledgeFlow {
  constructor(private readonly knowledgeFlowRepository: KnowledgeFlowRepository) {}

  async execute(params: {
    id: string;
    name?: string;
    description?: string;
    tags?: string[];
    status?: FlowStatus;
    steps?: FlowStep[];
  }): Promise<KnowledgeFlowEntity> {
    const existing = await this.knowledgeFlowRepository.findById(params.id);
    if (!existing) {
      throw new Error(`Flow with id ${params.id} not found`);
    }

    if (params.name !== undefined) {
      ValidationHelpers.validateNotEmpty(params.name, 'Flow Name');
    }

    if (params.name && params.name.trim() !== existing.name) {
      try {
        await ValidationHelpers.validateUniqueName(
          this.knowledgeFlowRepository,
          params.name,
          existing.projectId,
          existing.name
        );
      } catch (error) {
        if (error instanceof Error && error.message === `Resource with name "${params.name}" already exists in this project`) {
          throw new Error(`Flow with name "${params.name}" already exists in this project`);
        }
        throw error;
      }
    }

    const updateData: any = {};
    if (params.name !== undefined) updateData.name = ValidationHelpers.trimString(params.name);
    if (params.description !== undefined) updateData.description = ValidationHelpers.trimString(params.description);
    if (params.tags !== undefined) updateData.tags = ValidationHelpers.trimStringArray(params.tags);
    if (params.status !== undefined) updateData.status = params.status;
    if (params.steps !== undefined) updateData.steps = params.steps;

    return this.knowledgeFlowRepository.update(params.id, updateData);
  }
}

export default UpdateKnowledgeFlow;
