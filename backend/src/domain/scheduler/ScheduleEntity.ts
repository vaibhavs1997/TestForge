// ScheduleEntity - Domain Entity for the Scheduler Module
// A Schedule defines WHEN a Test Suite should execute automatically.
// It references the existing Test Suite, Execution Profile, and optional Environment,
// and reuses the existing Execution Engine for actual execution.

export type ScheduleStatus = 'idle' | 'running' | 'passed' | 'failed' | 'skipped';

export class ScheduleEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public name: string,
    public description: string,
    public enabled: boolean,
    public suiteId: string,
    public executionProfileId: string,
    public environmentId: string | null,
    public tokenOperationId: string | null,
    public cronExpression: string,
    public timezone: string,
    public nextRun: number | null,
    public lastRun: number | null,
    public lastStatus: ScheduleStatus | null,
    public readonly createdAt: number,
    public updatedAt: number
  ) {}
}

export default ScheduleEntity;
