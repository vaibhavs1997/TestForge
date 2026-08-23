import { ExecutePlan } from '../execution/ExecutePlan.js';
import { TestSuiteRepository } from '../../infrastructure/suite/TestSuiteRepository.js';
import { ExecutionPlanRepository } from '../../infrastructure/requirements/ExecutionPlanRepository.js';
import type { ExecutionRunEntity } from '../../domain/execution/ExecutionRunEntity.js';

/** Executes every ordered execution plan attached to an active suite. */
export class ExecuteSuite {
  constructor(
    private readonly suiteRepository: TestSuiteRepository,
    private readonly executePlan: ExecutePlan,
    private readonly executionPlanRepository?: ExecutionPlanRepository,
  ) {}

  async execute(
    suiteId: string,
    failureMode?: 'ContinueOnFailure' | 'StopOnFailure',
    executionProfileId?: string,
    environmentOverrideId?: string,
    onRunCreated?: (run: ExecutionRunEntity) => Promise<void> | void,
    existingRunId?: string,
  ) {
    const suite = await this.suiteRepository.findById(suiteId);
    if (!suite) throw new Error('Test suite not found');
    if (suite.status !== 'Active') throw new Error('Only active test suites can be executed');
    if (suite.executionPlans.length === 0) throw new Error('Test suite has no execution plans');

    const mode = failureMode ?? (suite.executionPolicy === 'FailFast' ? 'StopOnFailure' : 'ContinueOnFailure');
    const selectedPlanIds = [...new Set([...suite.executionPlans].sort((a, b) => a.order - b.order).map((item) => item.executionPlanId))];
    if (this.executionPlanRepository) {
      const plans = await Promise.all(selectedPlanIds.map((id) => this.executionPlanRepository!.findById(id)));
      if (plans.some((plan) => !plan || plan.status !== 'Ready')) {
        throw new Error('All suite plans must be ready before the suite can be executed');
      }
      const snapshot = JSON.parse(JSON.stringify({
        suite: {
          id: suite.id,
          name: suite.name,
          version: suite.version || 1,
          approvedAt: suite.approvedAt,
          executionPolicy: suite.executionPolicy,
          executionPlans: suite.executionPlans,
        },
        plans,
      }));
      return onRunCreated || existingRunId
        ? this.executePlan.executeCombined(selectedPlanIds, mode, executionProfileId, suite.id, snapshot, environmentOverrideId, onRunCreated, existingRunId)
        : this.executePlan.executeCombined(selectedPlanIds, mode, executionProfileId, suite.id, snapshot, environmentOverrideId);
    }
    // Compatibility fallback for callers that have not supplied the repository.
    return onRunCreated || environmentOverrideId || existingRunId
      ? this.executePlan.execute(selectedPlanIds[0], mode, executionProfileId, environmentOverrideId, onRunCreated, existingRunId)
      : this.executePlan.execute(selectedPlanIds[0], mode, executionProfileId);
  }
}

export default ExecuteSuite;
