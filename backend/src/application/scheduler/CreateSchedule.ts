// CreateSchedule - Application Use Case for creating a scheduled execution
import { randomUUID } from 'node:crypto';
import { ScheduleEntity } from '../../domain/scheduler/ScheduleEntity';
import type { ScheduleRepository } from '../../domain/scheduler/ScheduleRepository';
import { TestSuiteRepository } from '../../domain/suite/TestSuiteRepository';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';
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
    const name = ValidationHelpers.validateRequired(input.name, 'Schedule name');
    const suiteId = ValidationHelpers.validateRequired(input.suiteId, 'Test Suite');
    const executionProfileId = ValidationHelpers.validateRequired(input.executionProfileId, 'Execution Profile');
    const cronExpression = ValidationHelpers.validateRequired(input.cronExpression, 'Cron expression');

    if (!CronExpression.validate(input.cronExpression)) {
      throw new Error(`Invalid cron expression "${input.cronExpression}"`);
    }

    try {
      await ValidationHelpers.validateUniqueName(
        this.scheduleRepository,
        input.name,
        input.projectId
      );
    } catch (error) {
      if (error instanceof Error && error.message === `Resource with name "${input.name}" already exists in this project`) {
        throw new Error(`Schedule with name "${input.name}" already exists in this project`);
      }
      throw error;
    }

    const suite = await this.suiteRepository.findById(suiteId);
    if (!suite) {
      throw new Error(`Test Suite with id ${suiteId} not found`);
    }
    if (suite.status !== 'Active') {
      throw new Error(`Cannot schedule disabled suite "${suite.name}" - suite must be Active`);
    }

    const now = Date.now();
    const timezone = input.timezone || 'UTC';

    let nextRun: number | null = null;
    try {
      const cron = new CronExpression(input.cronExpression);
      nextRun = cron.nextRun(new Date());
    } catch {
    }

    const schedule = new ScheduleEntity(
      randomUUID(),
      input.projectId,
      name,
      input.description || '',
      input.enabled !== undefined ? input.enabled : true,
      suiteId,
      executionProfileId,
      input.environmentId ?? null,
      cronExpression,
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
