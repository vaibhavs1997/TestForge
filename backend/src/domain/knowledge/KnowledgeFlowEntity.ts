// KnowledgeFlowEntity - Domain Entity for Business Flow
// A Business Flow describes how the project behaves as an ordered sequence of steps.

export type FlowStatus = 'Draft' | 'Confirmed' | 'Deprecated';

export interface FlowStep {
  id: string;
  title: string;
  linkedApiOperationId?: string;
  description: string;
  expectedResult: string;
  notes: string;
}

export class KnowledgeFlowEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public name: string,
    public description: string,
    public tags: string[],
    public status: FlowStatus,
    public steps: FlowStep[],
    public readonly createdAt: number,
    public updatedAt: number
  ) {}
}

export default KnowledgeFlowEntity;