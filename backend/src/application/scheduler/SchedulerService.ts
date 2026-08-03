// SchedulerService - Evaluates schedules, determines due executions, and invokes the existing Execution Engine.
// Reuses the existing ExecutePlan execution flow - does NOT duplicate execution logic.
import { ScheduleEntity } from '../../domain/scheduler/ScheduleEntity';
import type { ScheduleRepository } from '../../domain/scheduler/ScheduleRepository';
import { TestSuiteRepository } from '../../domain/suite/TestSuiteRepository';
import { ExecutePlan } from '../execution/ExecutePlan';
import { CronExpression } from './CronExpression';
import { EventBus } from '../../domain/events/EventBus';

export class SchedulerService {
  private runningSchedules: Set<string> = new Set();
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly suiteRepository: TestSuiteRepository,
    private readonly executePlan: ExecutePlan,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Evaluate all enabled schedules and determine which are due for execution.
   * For each due schedule, invoke the existing Execution Engine with the
   * schedule's suite, profile, and optional environment override.
   */
  async evaluate(): Promise<ScheduleEntity[]> {
    const schedules = await this.scheduleRepository.list();
    const now = Date.now();
    const executed: ScheduleEntity[] = [];

    for (const schedule of schedules) {
      if (!schedule.enabled) continue;
      if (this.runningSchedules.has(schedule.id)) continue;

      // Determine if this schedule is due
      const isDue = schedule.nextRun !== null && schedule.nextRun <= now;
      if (!isDue) continue;

      // Execute the schedule
      try {
        await this.executeDueSchedule(schedule);
        executed.push(schedule);
      } catch (error: any) {
        // Mark lastStatus as failed on error
        await this.scheduleRepository.update(schedule.id, {
          lastStatus: 'failed',
          lastRun: now,
        });
        console.error(`Schedule ${schedule.id} execution failed:`, error.message);
      }
    }

    return executed;
  }

  /**
   * Execute a specific schedule immediately (Run Now).
   */
  async runNow(scheduleId: string): Promise<ScheduleEntity> {
    const schedule = await this.scheduleRepository.findById(scheduleId);
    if (!schedule) {
      throw new Error(`Schedule with id ${scheduleId} not found`);
    }
    if (this.runningSchedules.has(schedule.id)) {
      throw new Error(`Schedule "${schedule.name}" is already running`);
    }

    await this.executeDueSchedule(schedule);
    return schedule;
  }

  /**
   * Start a background polling loop that evaluates schedules periodically.
   */
  start(intervalMs: number = 60000): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.evaluate().catch(err => console.error('Scheduler evaluation error:', err));
    }, intervalMs);
    // Run an initial evaluation shortly after start
    setTimeout(() => {
      this.evaluate().catch(err => console.error('Initial scheduler evaluation error:', err));
    }, 1000);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async executeDueSchedule(schedule: ScheduleEntity): Promise<void> {
    this.runningSchedules.add(schedule.id);

    try {
      // Verify the suite still exists and is active
      const suite = await this.suiteRepository.findById(schedule.suiteId);
      if (!suite) {
        throw new Error(`Test Suite with id ${schedule.suiteId} not found`);
      }
      if (suite.status !== 'Active') {
        throw new Error(`Cannot execute schedule - suite "${suite.name}" is not Active`);
      }

      // Update schedule to running state
      await this.scheduleRepository.update(schedule.id, {
        lastStatus: 'running',
      });

      const runStartedAt = Date.now();

      // Invoke the existing Execution Engine.
      // ExecutePlan expects an executionPlanId. A suite contains multiple execution plans,
      // so we iterate through the suite's execution plans and execute each one,
      // passing the schedule's executionProfileId and environment override.
      const executionResults = [];
      for (const item of suite.executionPlans) {
        const run = await this.executePlan.execute(
          item.executionPlanId,
          undefined as any, // failureMode - let the profile determine it
          schedule.executionProfileId
        );
        executionResults.push(run);
      }

      // Determine overall status
      const allPassed = executionResults.length > 0 && executionResults.every(r => r.status === 'Completed');
      const anyFailed = executionResults.some(r => r.status === 'Failed');
      const overallStatus: ScheduleEntity['lastStatus'] = anyFailed ? 'failed' : (allPassed ? 'passed' : 'skipped');

      // Update nextRun, lastRun, lastStatus
      let nextRun: number | null = null;
      if (schedule.enabled) {
        try {
          const cron = new CronExpression(schedule.cronExpression);
          nextRun = cron.nextRun(new Date());
        } catch {
          nextRun = null;
        }
      }

      await this.scheduleRepository.update(schedule.id, {
        nextRun,
        lastRun: runStartedAt,
        lastStatus: overallStatus,
      });

      // Publish event for NotificationService
      const eventType = overallStatus === 'passed' ? 'COMPLETED' : 'FAILED';
      await this.eventBus.publish({
        type: eventType,
        module: 'scheduler' as any,
        entityId: schedule.id,
        projectId: schedule.projectId,
        timestamp: Date.now(),
        payload: { status: overallStatus },
      });
    } finally {
      this.runningSchedules.delete(schedule.id);
    }
  }
}
