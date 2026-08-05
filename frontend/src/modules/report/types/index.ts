// Report module types
export type ReportStatus = 'Passed' | 'Failed' | 'Partial' | 'Completed';

export interface ReportValidationSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
}

export interface ReportRecommendationSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
}

export interface ReportEnvironment {
  environmentId: string;
  baseUrl: string;
  name: string;
}

export interface ReportSection {
  overview: {
    title: string;
    description: string;
    generatedAt: number;
    overallStatus: ReportStatus;
  };
  executionSummary: {
    totalSteps: number;
    passedSteps: number;
    failedSteps: number;
    skippedSteps: number;
    duration: number;
    status: string;
  };
  requirementsCovered: string[];
  executionPlansExecuted: string[];
  stepResults: any[];
  validationResults: any[];
  recommendations: any[];
  environmentInfo: ReportEnvironment;
  runtimeVariablesCaptured: Record<string, any>;
  failures: any[];
  executionTimeline: any[];
}

export interface Report {
  id: string;
  projectId: string;
  executionRunId: string;
  suiteId: string | null;
  requirementIds: string[];
  generatedAt: number;
  generatedBy: string;
  overallStatus: ReportStatus;
  executionDuration: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  validationSummary: ReportValidationSummary;
  recommendationSummary: ReportRecommendationSummary;
  environment: ReportEnvironment;
  reportVersion: string;
  sections: ReportSection;
}

export interface ReportGeneratePayload {
  executionRunId: string;
  suiteId?: string;
}