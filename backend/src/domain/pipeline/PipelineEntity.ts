// PipelineEntity - Domain Entity for Pipeline Orchestration
// Represents the state of a project pipeline execution

export type PipelineStage =
  | 'API Import'
  | 'Environment Detection'
  | 'Project Analysis'
  | 'Requirement Generation'
  | 'Requirement Readiness Validation'
  | 'Test Strategy'
  | 'Test Design'
  | 'Execution Planning';

export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface StageResult {
  stage: PipelineStage;
  status: PipelineStatus;
  startedAt: number | null;
  completedAt: number | null;
  error: string | null;
  artifacts: Record<string, unknown> | null;
}

export class PipelineEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly currentStage: PipelineStage,
    public readonly status: PipelineStatus,
    public readonly stages: StageResult[],
    public readonly startedAt: number,
    public readonly completedAt: number | null,
    public readonly error: string | null
  ) {}
}

export default PipelineEntity;