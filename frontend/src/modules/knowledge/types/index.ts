// Knowledge Hub domain types
import type {
  BusinessRuleDto,
  DependencyDto,
  DocumentationDto,
  KnowledgeFlowDto,
  KnowledgeFlowStepDto,
  RuntimeVariableDto,
} from '../../../types/moduleContracts';

export type FlowStatus = KnowledgeFlowDto['status'];
export type RuleSeverity = BusinessRuleDto['severity'];
export type VariableScope = RuntimeVariableDto['scope'];
export type DependencyType = DependencyDto['dependencyType'];

export type FlowStep = KnowledgeFlowStepDto;

export type KnowledgeFlow = KnowledgeFlowDto;

export interface KnowledgeFlowFormData {
  id?: string;
  projectId: string;
  name: string;
  description: string;
  tags: string[];
  status: FlowStatus;
  steps: FlowStep[];
}

export type BusinessRule = BusinessRuleDto;

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

export type RuntimeVariable = RuntimeVariableDto;

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

export type Dependency = DependencyDto;

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

export type Documentation = DocumentationDto;

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
