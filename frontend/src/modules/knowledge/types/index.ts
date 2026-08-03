// Knowledge Hub domain types
export type FlowStatus = 'Draft' | 'Confirmed' | 'Deprecated';
export type RuleSeverity = 'High' | 'Medium' | 'Low';
export type VariableScope = 'Global' | 'Project' | 'Environment' | 'Flow';
export type DependencyType = 'Service' | 'Database' | 'Queue' | 'Cache' | 'External' | 'Token' | 'Config';

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

export interface BusinessRule {
  id: string;
  projectId: string;
  name: string;
  description: string;
  ruleType: string;
  condition: string;
  expectedOutcome: string;
  severity: RuleSeverity;
  linkedApiOperationIds: string[];
  linkedRequirementIds: string[];
  tags: string[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BusinessRuleFormData {
  id?: string;
  projectId: string;
  name: string;
  description: string;
  ruleType: string;
  condition: string;
  expectedOutcome: string;
  severity: RuleSeverity;
  linkedApiOperationIds: string[];
  linkedRequirementIds: string[];
  tags: string[];
  isActive: boolean;
}

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

export interface RuntimeVariableFormData {
  id?: string;
  projectId: string;
  name: string;
  description: string;
  scope: VariableScope;
  defaultValue: string;
  isSensitive: boolean;
  linkedApiOperationIds: string[];
  linkedRequirementIds: string[];
  tags: string[];
}

export interface Dependency {
  id: string;
  projectId: string;
  name: string;
  description: string;
  dependencyType: DependencyType;
  target: string;
  version: string;
  isRequired: boolean;
  linkedApiOperationIds: string[];
  linkedRequirementIds: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface DependencyFormData {
  id?: string;
  projectId: string;
  name: string;
  description: string;
  dependencyType: DependencyType;
  target: string;
  version: string;
  isRequired: boolean;
  linkedApiOperationIds: string[];
  linkedRequirementIds: string[];
  tags: string[];
}

export interface Documentation {
  id: string;
  projectId: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  linkedApiOperationIds: string[];
  linkedRequirementIds: string[];
  author: string;
  version: string;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentationFormData {
  id?: string;
  projectId: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  linkedApiOperationIds: string[];
  linkedRequirementIds: string[];
  author: string;
  version: string;
}

export type KnowledgeSection = 'flows' | 'rules' | 'dependencies' | 'variables' | 'documentation';