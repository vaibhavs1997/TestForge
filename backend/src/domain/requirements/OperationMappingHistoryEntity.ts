// OperationMappingHistoryEntity - Domain Entity for tracking API operation mapping corrections
// Used for few-shot learning to improve AI suggestions over time

export interface OperationMappingHistoryEntry {
  id: string;
  projectId: string;
  requirementId: string;
  requirementText: string;
  requirementTokens: string[];
  suggestedOperationId: string;
  selectedOperationId: string;
  accepted: boolean;
  confidenceScore: number;
  category?: string;
  createdAt: number;
}

export interface OperationMappingHistoryFilters {
  projectId?: string;
  requirementId?: string;
  operationId?: string;
  accepted?: boolean;
  category?: string;
  limit?: number;
}

export default OperationMappingHistoryEntry;