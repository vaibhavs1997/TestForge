// ListKnowledgeFlows - Application Use Case
import { KnowledgeFlowRepository } from '../../domain/knowledge/KnowledgeFlowRepository.js';
import { KnowledgeFlowEntity } from '../../domain/knowledge/KnowledgeFlowEntity.js';

export class ListKnowledgeFlows {
  constructor(private readonly knowledgeFlowRepository: KnowledgeFlowRepository) {}

  async execute(params: {
    projectId?: string;
  }): Promise<KnowledgeFlowEntity[]> {
    if (params.projectId) {
      return this.knowledgeFlowRepository.findByProject(params.projectId);
    }
    return this.knowledgeFlowRepository.list();
  }
}

export default ListKnowledgeFlows;