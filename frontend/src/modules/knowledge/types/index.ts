// Knowledge Hub domain types
export type FlowStatus = 'Draft' | 'Confirmed' | 'Deprecated';

export interface FlowStep {
  id: string;
  title: string;
  linkedApiOperationId?: string;
  description: string;
  expectedResult: string;
  notes: string;
}

export interface KnowledgeFlow {
  id: string;
  projectId: string;
  name: string;
  description: string;
  tags: string[];
  status: FlowStatus;
  steps: FlowStep[];
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeFlowFormData {
  id?: string;
  projectId: string;
  name: string;
  description: string;
  tags: string[];
  status: FlowStatus;
  steps: FlowStep[];
}

export type KnowledgeSection = 'flows' | 'rules' | 'dependencies' | 'variables' | 'documentation';