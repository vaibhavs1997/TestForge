import { ExecutePlan } from '../execution/ExecutePlan';
import { TestSuiteRepository } from '../../infrastructure/suite/TestSuiteRepository';
import { ExecutionPlanRepository } from '../../infrastructure/requirements/ExecutionPlanRepository';

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
  ) {
    const suite = await this.suiteRepository.findById(suiteId);
    if (!suite) throw new Error('Test suite not found');
    if (suite.status !== 'Active') throw new Error('Only active test suites can be executed');
    if (suite.executionPlans.length === 0) throw new Error('Test suite has no execution plans');

    const mode = failureMode ?? (suite.executionPolicy === 'FailFast' ? 'StopOnFailure' : 'ContinueOnFailure');
    const selectedPlanIds = [...new Set([...suite.executionPlans].sort((a, b) => a.order - b.order).map((item) => item.executionPlanId))];
    if (this.executionPlanRepository) {
      return this.executePlan.executeCombined(selectedPlanIds, mode, executionProfileId, suite.id);
    }
    // Compatibility fallback for callers that have not supplied the repository.
    return this.executePlan.execute(selectedPlanIds[0], mode, executionProfileId);
  }
}

export default ExecuteSuite;
