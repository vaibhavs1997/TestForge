// Scheduler module types
export type ScheduleStatus = 'idle' | 'running' | 'passed' | 'failed' | 'skipped';

export interface Schedule {
  id: string;
  projectId: string;
  name: string;
  description: string;
  enabled: boolean;
  suiteId: string;
  executionProfileId: string;
  environmentId: string | null;
  cronExpression: string;
  timezone: string;
  nextRun: number | null;
  lastRun: number | null;
  lastStatus: ScheduleStatus | null;
  createdAt: number;
  updatedAt: number;
}

export interface ScheduleFormData {
  name: string;
  description: string;
  suiteId: string;
  executionProfileId: string;
  environmentId?: string | null;
  cronExpression: string;
  timezone: string;
  enabled?: boolean;
}