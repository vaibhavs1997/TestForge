// CreateSchedule - Application Use Case for creating a scheduled execution
import { ScheduleEntity } from '../../domain/scheduler/ScheduleEntity';
import type { ScheduleRepository } from '../../domain/scheduler/ScheduleRepository';
import { TestSuiteRepository } from '../../domain/suite/TestSuiteRepository';
import { CronExpression } from './CronExpression';

export interface CreateScheduleInput {
  projectId: string;
  name: string;
  description: string;
  suiteId: string;
  executionProfileId: string;
  environmentId?: string | null;
  cronExpression: string;
  timezone: string;
  enabled?: boolean;
}

export class CreateSchedule {
  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly suiteRepository: TestSuiteRepository
  ) {}

  async execute(input: CreateScheduleInput): Promise<ScheduleEntity> {
    if (!input.name || !input.name.trim()) {
      throw new Error('Schedule name is required');
    }
    if (!input.suiteId) {
      throw new Error('Test Suite is required');
    }
    if (!input.executionProfileId) {
      throw new Error('Execution Profile is required');
    }
    if (!input.cronExpression || !input.cronExpression.trim()) {
      throw new Error('Cron expression is required');
    }
    if (!CronExpression.validate(input.cronExpression)) {
      throw new Error(`Invalid cron expression "${input.cronExpression}"`);
    }

    // Prevent duplicate schedule names within a project
    const exists = await this.scheduleRepository.existsByName(input.name.trim(), input.projectId);
    if (exists) {
      throw new Error(`Schedule with name "${input.name}" already exists in this project`);
    }

    // Validate the suite exists and is active
    const suite = await this.suiteRepository.findById(input.suiteId);
    if (!suite) {
      throw new Error(`Test Suite with id ${input.suiteId} not found`);
    }
    if (suite.status !== 'Active') {
      throw new Error(`Cannot schedule disabled suite "${suite.name}" - suite must be Active`);
    }

    const now = Date.now();
    const timezone = input.timezone || 'UTC';

    // Compute next run
    let nextRun: number | null = null;
    try {
      const cron = new CronExpression(input.cronExpression);
      nextRun = cron.nextRun(new Date());
    } catch {
      // If we can't compute, still allow creation but nextRun stays null
    }

    const schedule = new ScheduleEntity(
      crypto.randomUUID(),
      input.projectId,
      input.name.trim(),
      input.description || '',
      input.enabled !== undefined ? input.enabled : true,
      input.suiteId,
      input.executionProfileId,
      input.environmentId ?? null,
      input.cronExpression.trim(),
      timezone,
      nextRun,
      null,
      null,
      now,
      now
    );

    return this.scheduleRepository.create(schedule);
  }
}

export default CreateSchedule;