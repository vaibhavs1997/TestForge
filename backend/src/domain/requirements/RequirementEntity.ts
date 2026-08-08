// RequirementEntity - Domain Entity for Requirement Workspace
// Requirements originate from Project Analysis or Manual entry.
// Only Approved requirements proceed to future AI Test Generation.

export type RequirementSource = 'ProjectAnalysis' | 'Manual' | 'Jira';
export type ReviewStatus = 'Pending' | 'Reviewed';
export type ApprovalStatus = 'Draft' | 'Suggested' | 'Approved' | 'Rejected' | 'Archived';

export interface AcceptanceCriterion {
  id: string;
  text: string;
}

export class RequirementEntity {
  /** Linked Jira issue key when imported from Jira (e.g. PROJ-123). */
  jiraIssueKey: string | null = null;

  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public title: string,
    public description: string,
    public category: string,
    public confidence: number,
    public source: RequirementSource,
    public projectAnalysisId: string | null,
    public reviewStatus: ReviewStatus,
    public approvalStatus: ApprovalStatus,
    public relatedOperations: string[],
    public relatedFlows: string[],
    public relatedDatasets: string[],
    public acceptanceCriteria: AcceptanceCriterion[],
    public readonly createdAt: number,
    public updatedAt: number
  ) {}
}

// Extension interface for relatedRuntimeVariables (not in original entity)
export interface RequirementWithRuntimeVariables extends RequirementEntity {
  relatedRuntimeVariables?: string[];
}

export default RequirementEntity;