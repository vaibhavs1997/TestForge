// CreateSchedule - Application Use Case for creating a scheduled execution
import { randomUUID } from 'node:crypto';
import { ScheduleEntity } from '../../domain/scheduler/ScheduleEntity.js';
import type { ScheduleRepository } from '../../domain/scheduler/ScheduleRepository.js';
import {
  assertActiveSuite,
  buildScheduleEntity,
  normalizeScheduleDescription,
  normalizeScheduleName,
  normalizeScheduleTimezone,
} from '../../domain/scheduler/SchedulePolicy.js';
import { TestSuiteRepository } from '../../domain/suite/TestSuiteRepository.js';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers.js';
import { CronExpression } from './CronExpression.js';

export interface CreateScheduleInput {
  projectId: string;
  name: string;
  description: string;
  suiteId: string;
  executionProfileId: string;
  environmentId?: string | null;
  tokenOperationId?: string | null;
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
    const name = normalizeScheduleName(input.name);
    const suiteId = ValidationHelpers.validateRequired(input.suiteId, 'Test Suite');
    const executionProfileId = ValidationHelpers.validateRequired(input.executionProfileId, 'Execution Profile');
    const cronExpression = ValidationHelpers.validateRequired(input.cronExpression, 'Cron expression');
    const description = normalizeScheduleDescription(input.description);
    const timezone = normalizeScheduleTimezone(input.timezone);

    if (!CronExpression.validate(input.cronExpression)) {
      throw new Error(`Invalid cron expression "${input.cronExpression}"`);
    }

    try {
      await ValidationHelpers.validateUniqueName(
        this.scheduleRepository,
        name,
        input.projectId
      );
    } catch (error) {
      if (error instanceof Error && error.message === `Resource with name "${name}" already exists in this project`) {
        throw new Error(`Schedule with name "${name}" already exists in this project`);
      }
      throw error;
    }

    const suite = await this.suiteRepository.findById(suiteId);
    if (!suite) {
      throw new Error(`Test Suite with id ${suiteId} not found`);
    }
    assertActiveSuite(suite);

    const now = Date.now();

    let nextRun: number | null = null;
    try {
      const cron = new CronExpression(input.cronExpression);
      nextRun = cron.nextRun(new Date());
    } catch {
    }

    const schedule = buildScheduleEntity(randomUUID(), now, {
      projectId: input.projectId,
      name,
      description,
      enabled: input.enabled !== undefined ? input.enabled : true,
      suiteId,
      executionProfileId,
      environmentId: input.environmentId ?? null,
      tokenOperationId: input.tokenOperationId ?? null,
      cronExpression,
      timezone,
      nextRun,
    });

    return this.scheduleRepository.create(schedule);
  }
}

export default CreateSchedule;
