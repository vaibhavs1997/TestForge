// UpdateKnowledgeFlow - Application Use Case
import { KnowledgeFlowRepository } from '../../domain/knowledge/KnowledgeFlowRepository';
import { KnowledgeFlowEntity, FlowStatus, FlowStep } from '../../domain/knowledge/KnowledgeFlowEntity';

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

    if (params.name !== undefined && !params.name.trim()) {
      throw new Error('Flow Name cannot be empty');
    }

    if (params.name && params.name.trim() !== existing.name) {
      const exists = await this.knowledgeFlowRepository.existsByName(params.name.trim(), existing.projectId);
      if (exists) {
        throw new Error(`Flow with name "${params.name}" already exists in this project`);
      }
    }

    const updateData: any = {};
    if (params.name !== undefined) updateData.name = params.name.trim();
    if (params.description !== undefined) updateData.description = params.description.trim();
    if (params.tags !== undefined) updateData.tags = params.tags.map((t: string) => t.trim()).filter((t: string) => t.length > 0);
    if (params.status !== undefined) updateData.status = params.status;
    if (params.steps !== undefined) updateData.steps = params.steps;

    return this.knowledgeFlowRepository.update(params.id, updateData);
  }
}

export default UpdateKnowledgeFlow;