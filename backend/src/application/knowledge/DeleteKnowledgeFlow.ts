// DeleteKnowledgeFlow - Application Use Case
import { KnowledgeFlowRepository } from '../../domain/knowledge/KnowledgeFlowRepository.js';

export class DeleteKnowledgeFlow {
  constructor(private readonly knowledgeFlowRepository: KnowledgeFlowRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.knowledgeFlowRepository.findById(id);
    if (!existing) {
      throw new Error(`Flow with id ${id} not found`);
    }
    await this.knowledgeFlowRepository.delete(id);
  }
}

export default DeleteKnowledgeFlow;