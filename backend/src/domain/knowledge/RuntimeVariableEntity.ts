// RuntimeVariableEntity - Domain Entity for Runtime Variables in Knowledge Hub
// Tracks runtime variables such as tokens, IDs, and credentials.

export type VariableScope = 'Global' | 'Project' | 'Environment' | 'Flow';

export interface RuntimeVariable {
  id: string;
  projectId: string;
  name: string;
  description: string;
  scope: VariableScope;
  defaultValue: string;
  isSensitive: boolean;
  linkedApiOperationIds: string[];
  linkedRequirementIds: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export default RuntimeVariable;