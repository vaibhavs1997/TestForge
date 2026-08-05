// Pipeline types for the frontend
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

export interface PipelineEntity {
  id: string;
  projectId: string;
  currentStage: PipelineStage;
  status: PipelineStatus;
  stages: StageResult[];
  startedAt: number;
  completedAt: number | null;
  error: string | null;
}

export interface StartPipelineRequest {
  projectId: string;
}

export interface RestartStageRequest {
  stage: PipelineStage;
}