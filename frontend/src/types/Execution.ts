// Type definitions for Execution domain

export interface ExecutionResult {
  id: string;
  scenarioId: string;
  status: string;
  startTime: string;
  endTime: string;
  duration: number;
  steps: ExecutionStepResult[];
}

export interface ExecutionStepResult {
  stepId: string;
  status: string;
  message: string;
  duration: number;
}
