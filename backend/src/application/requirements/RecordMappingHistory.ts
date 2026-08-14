// RecordMappingHistory - Use Case for recording API operation mapping decisions
// Used for few-shot learning to improve future suggestions

import { randomUUID } from 'node:crypto';
import type { OperationMappingHistoryEntry } from '../../domain/requirements/OperationMappingHistoryEntity';
import type { OperationMappingHistoryRepository } from '../../domain/requirements/OperationMappingHistoryRepository';

export class RecordMappingHistory {
  constructor(private readonly historyRepository: OperationMappingHistoryRepository) {}

  async execute(params: {
    projectId: string;
    requirementId: string;
    requirementText: string;
    requirementTokens: string[];
    suggestedOperationId: string;
    selectedOperationId: string;
    confidenceScore: number;
    category?: string;
  }): Promise<OperationMappingHistoryEntry> {
    const accepted = params.suggestedOperationId === params.selectedOperationId;
    
    const entry: OperationMappingHistoryEntry = {
      id: randomUUID(),
      projectId: params.projectId,
      requirementId: params.requirementId,
      requirementText: params.requirementText,
      requirementTokens: params.requirementTokens,
      suggestedOperationId: params.suggestedOperationId,
      selectedOperationId: params.selectedOperationId,
      accepted,
      confidenceScore: params.confidenceScore,
      category: params.category,
      createdAt: Date.now(),
    };

    return this.historyRepository.create(entry);
  }
}

export default RecordMappingHistory;