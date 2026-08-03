// CreateKnowledgeFlow - Application Use Case
import { KnowledgeFlowRepository } from '../../domain/knowledge/KnowledgeFlowRepository';
import { KnowledgeFlowEntity, FlowStatus, FlowStep } from '../../domain/knowledge/KnowledgeFlowEntity';

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
    if (!params.name || !params.name.trim()) {
      throw new Error('Flow Name is required');
    }

    const trimmedName = params.name.trim();
    const exists = await this.knowledgeFlowRepository.existsByName(trimmedName, params.projectId);
    if (exists) {
      throw new Error(`Flow with name "${params.name}" already exists in this project`);
    }

    const now = Date.now();
    const flow = new KnowledgeFlowEntity(
      crypto.randomUUID(),
      params.projectId,
      trimmedName,
      params.description?.trim() || '',
      params.tags?.map(t => t.trim()).filter(t => t.length > 0) || [],
      params.status || 'Draft',
      params.steps || [],
      now,
      now
    );

    return this.knowledgeFlowRepository.create(flow);
  }
}

export default CreateKnowledgeFlow;