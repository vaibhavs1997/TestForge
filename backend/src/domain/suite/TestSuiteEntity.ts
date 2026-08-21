// TestSuiteEntity - Domain Entity for Test Suite Management
// A Test Suite is a reusable collection of Execution Plans.
// It does NOT execute tests itself. It prepares reusable execution collections.

export type SuiteExecutionPolicy = 'Sequential' | 'FailFast' | 'ContinueOnError';

export type SuiteStatus = 'Draft' | 'Active' | 'Archived';

export interface SuiteTag {
  id: string;
  name: string;
}

export interface TestSuiteItem {
  executionPlanId: string;
  order: number;
}

export class TestSuiteEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public name: string,
    public description: string,
    public tags: SuiteTag[],
    public executionPlans: TestSuiteItem[],
    public defaultEnvironmentId: string,
    public executionPolicy: SuiteExecutionPolicy,
    public estimatedDuration: number,
    public status: SuiteStatus,
    public readonly createdAt: number,
    public updatedAt: number,
    /** Incremented whenever an active suite is re-approved. */
    public version: number = 0,
    /** The moment this executable suite version was approved. */
    public approvedAt: number | null = null
  ) {}
}

export default TestSuiteEntity;
