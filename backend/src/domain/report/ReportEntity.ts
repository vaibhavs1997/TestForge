// ReportEntity - Domain Entity for Reporting Module
// Reports are generated from completed Execution Runs.
// A report represents the complete testing outcome for a Requirement, Test Suite, or Project.
// Does NOT recompute execution. Reuses existing execution and validation results.

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

export class ReportEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly executionRunId: string,
    public readonly suiteId: string | null,
    public readonly requirementIds: string[],
    public readonly generatedAt: number,
    public readonly generatedBy: string,
    public overallStatus: ReportStatus,
    public readonly executionDuration: number,
    public readonly totalSteps: number,
    public readonly passedSteps: number,
    public readonly failedSteps: number,
    public readonly skippedSteps: number,
    public validationSummary: ReportValidationSummary,
    public recommendationSummary: ReportRecommendationSummary,
    public readonly environment: ReportEnvironment,
    public readonly reportVersion: string,
    public readonly sections: ReportSection
  ) {}
}

export default ReportEntity;