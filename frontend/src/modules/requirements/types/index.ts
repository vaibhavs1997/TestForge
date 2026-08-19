// Requirement Workspace domain types
import type { ExecutionPlanDto } from '../../../types/moduleContracts';

export type RequirementSource = 'ProjectAnalysis' | 'Manual' | 'Jira';
export type ReviewStatus = 'Pending' | 'Reviewed';
export type ApprovalStatus = 'Draft' | 'Suggested' | 'Approved' | 'Rejected' | 'Archived';

export interface AcceptanceCriterion {
  id: string;
  text: string;
}

export interface Requirement {
  id: string;
  projectId: string;
  title: string;
  description: string;
  category: string;
  confidence: number;
  source: RequirementSource;
  projectAnalysisId: string | null;
  reviewStatus: ReviewStatus;
  approvalStatus: ApprovalStatus;
  relatedOperations: string[];
  relatedFlows: string[];
  relatedDatasets: string[];
  acceptanceCriteria: AcceptanceCriterion[];
  jiraIssueKey?: string | null;
  createdAt: number;
  updatedAt: number;
  generationPending?: boolean;
  generationExpiresAt?: number | null;
}

export interface RequirementFormData {
  id?: string;
  projectId: string;
  title: string;
  description: string;
  category: string;
  confidence: number;
  source: RequirementSource;
  projectAnalysisId?: string | null;
  reviewStatus: ReviewStatus;
  approvalStatus: ApprovalStatus;
  relatedOperations: string[];
  relatedFlows: string[];
  relatedDatasets: string[];
  acceptanceCriteria: AcceptanceCriterion[];
  generationPending?: boolean;
  generationExpiresAt?: number | null;
}

export type ValidationStatus = 'READY' | 'MISSING' | 'WARNING' | 'INCOMPLETE';

export interface ValidationCategory {
  name: string;
  status: ValidationStatus;
  details: string[];
}

export interface ValidationReport {
  requirementId: string;
  requirementTitle: string;
  categories: ValidationCategory[];
  overallStatus: ValidationStatus;
}

export type StrategyCategory = 
  | 'Positive'
  | 'Negative'
  | 'Boundary'
  | 'Business Rules'
  | 'Security'
  | 'Validation'
  | 'Error Handling'
  | 'Integration'
  | 'Regression'
  | 'Performance'
  | 'Accessibility'
  | 'Localization';

export type StrategyPriority = 'High' | 'Medium' | 'Low';
export type StrategyStatus = 'Enabled' | 'Disabled';

export interface StrategyItem {
  id: string;
  title: string;
  reason: string;
  relatedApis: string[];
  relatedData: string[];
  priority: StrategyPriority;
  status: StrategyStatus;
}

export interface StrategyCategorySection {
  category: StrategyCategory;
  items: StrategyItem[];
}

export interface TestStrategy {
  id: string;
  requirementId: string;
  projectId: string;
  sections: StrategyCategorySection[];
  createdAt: number;
  updatedAt: number;
}

export type DesignPriority = 'High' | 'Medium' | 'Low';
export type DesignStatus = 'Draft' | 'Ready' | 'Disabled';
export type TestCaseType = 'Positive' | 'Negative' | 'Security';

export interface RequestOverride {
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: any;
}

export interface RuntimeBinding {
  variable: string;
  source: 'request' | 'response' | 'environment';
  path?: string;
}

export interface Assertion {
  type: 'status' | 'body' | 'header' | 'jsonPath';
  operator: 'equals' | 'contains' | 'matches' | 'exists';
  path: string;
  expected: any;
}

export interface AssertionReference {
  assertionId: string;
  enabled: boolean;
}

export interface CleanupStep {
  type: 'api' | 'dataset' | 'environment';
  action: string;
  target: string;
}

export interface RequirementMappingContext {
  requirementId: string;
  lowConfidence: boolean;
  mappingConfidencePercent: number;
  primaryOperationId: string | null;
  rankedOperations: Array<{
    operationId: string;
    serviceId: string;
    name: string;
    method: string;
    path: string;
    score: number;
  }>;
  message: string;
}

export interface TestDesign {
  id: string;
  projectId: string;
  requirementId: string;
  strategyItemId: string;
  title?: string;
  operationId: string;
  environmentId: string;
  datasetId: string;
  datasetRowReference: string;
  requestOverrides: RequestOverride;
  runtimeBindings: RuntimeBinding[];
  assertions: Assertion[];
  cleanup: CleanupStep[];
  priority: DesignPriority;
  status: DesignStatus;
  createdAt: number;
  updatedAt: number;
  assertionIds: AssertionReference[];
  testCaseType?: TestCaseType;
  expectedHttpStatus?: number;
}

export type ExecutionPlanStatus = 'Pending' | 'Ready' | 'Disabled';

export interface RequestTemplate {
  method: string;
  path: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: any;
}

export type ExecutionPlan = ExecutionPlanDto;
