// GetKnowledgeFlow - Application Use Case
import { KnowledgeFlowRepository } from '../../domain/knowledge/KnowledgeFlowRepository';
import { KnowledgeFlowEntity } from '../../domain/knowledge/KnowledgeFlowEntity';

export class GetKnowledgeFlow {
  constructor(private readonly knowledgeFlowRepository: KnowledgeFlowRepository) {}

  async execute(id: string): Promise<KnowledgeFlowEntity> {
    const flow = await this.knowledgeFlowRepository.findById(id);
    if (!flow) {
      throw new Error(`Flow with id ${id} not found`);
    }
    return flow;
  }
}

export default GetKnowledgeFlow;