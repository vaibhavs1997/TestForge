// OperationMappingHistoryRepository - Repository interface for mapping history

import type { OperationMappingHistoryEntry, OperationMappingHistoryFilters } from './OperationMappingHistoryEntity';

export interface OperationMappingHistoryRepository {
  create(entry: OperationMappingHistoryEntry): Promise<OperationMappingHistoryEntry>;
  findByProject(projectId: string, limit?: number): Promise<OperationMappingHistoryEntry[]>;
  findByRequirement(requirementId: string): Promise<OperationMappingHistoryEntry[]>;
  findByOperation(operationId: string, limit?: number): Promise<OperationMappingHistoryEntry[]>;
  findSimilarPatterns(projectId: string, tokens: string[], limit?: number): Promise<OperationMappingHistoryEntry[]>;
  getAcceptanceRate(projectId?: string): Promise<{ total: number; accepted: number; rate: number }>;
}

export default OperationMappingHistoryRepository;