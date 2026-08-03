// Requirement Workspace domain types
export type RequirementSource = 'ProjectAnalysis' | 'Manual';
export type ReviewStatus = 'Pending' | 'Reviewed';
export type ApprovalStatus = 'Suggested' | 'Approved' | 'Rejected' | 'Archived';

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
  createdAt: number;
  updatedAt: number;
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

export interface CleanupStep {
  type: 'api' | 'dataset' | 'environment';
  action: string;
  target: string;
}

export interface TestDesign {
  id: string;
  projectId: string;
  requirementId: string;
  strategyItemId: string;
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
}
