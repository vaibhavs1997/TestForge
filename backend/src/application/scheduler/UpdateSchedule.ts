// UpdateSchedule - Application Use Case for updating a scheduled execution
import { ScheduleEntity } from '../../domain/scheduler/ScheduleEntity.js';
import type { ScheduleRepository } from '../../domain/scheduler/ScheduleRepository.js';
import {
  assertActiveSuite,
  buildSchedulePatch,
  normalizeScheduleDescription,
  normalizeScheduleName,
  normalizeScheduleTimezone,
} from '../../domain/scheduler/SchedulePolicy.js';
import { TestSuiteRepository } from '../../domain/suite/TestSuiteRepository.js';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers.js';
import { CronExpression } from './CronExpression.js';

export interface UpdateScheduleInput {
  id: string;
  projectId: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  suiteId?: string;
  executionProfileId?: string;
  environmentId?: string | null;
  cronExpression?: string;
  timezone?: string;
}

export class UpdateSchedule {
  constructor(
    private readonly scheduleRepository: ScheduleRepository,
    private readonly suiteRepository: TestSuiteRepository
  ) {}

  async execute(input: UpdateScheduleInput): Promise<ScheduleEntity> {
    const existing = await this.scheduleRepository.findById(input.id);
    if (!existing) {
      throw new Error(`Schedule with id ${input.id} not found`);
    }

    let nextRun: number | null | undefined;
    let normalizedName: string | undefined;
    let normalizedDescription: string | undefined;
    let normalizedEnabled: boolean | undefined;
    let normalizedSuiteId: string | undefined;
    let normalizedExecutionProfileId: string | undefined;
    let normalizedEnvironmentId: string | null | undefined;
    let normalizedCronExpression: string | undefined;
    let normalizedTimezone: string | undefined;

    if (input.name !== undefined) {
      normalizedName = normalizeScheduleName(input.name);
      if (normalizedName.toLowerCase() !== existing.name.toLowerCase()) {
        try {
          await ValidationHelpers.validateUniqueName(
            this.scheduleRepository,
            normalizedName,
            input.projectId
          );
        } catch (error) {
          if (error instanceof Error && error.message === `Resource with name "${normalizedName}" already exists in this project`) {
            throw new Error(`Schedule with name "${normalizedName}" already exists in this project`);
          }
          throw error;
        }
      }
    }

    if (input.description !== undefined) {
      normalizedDescription = normalizeScheduleDescription(input.description);
    }

    if (input.enabled !== undefined) {
      normalizedEnabled = input.enabled;
    }

    if (input.suiteId !== undefined) {
      const suiteId = ValidationHelpers.validateRequired(input.suiteId, 'Test Suite');
      const suite = await this.suiteRepository.findById(suiteId);
      if (!suite) {
        throw new Error(`Test Suite with id ${suiteId} not found`);
      }
      assertActiveSuite(suite);
      normalizedSuiteId = suiteId;
    }

    if (input.executionProfileId !== undefined) {
      normalizedExecutionProfileId = ValidationHelpers.validateRequired(input.executionProfileId, 'Execution Profile');
    }

    if (input.environmentId !== undefined) {
      normalizedEnvironmentId = input.environmentId;
    }

    if (input.cronExpression !== undefined) {
      const cronExpression = ValidationHelpers.validateRequired(input.cronExpression, 'Cron expression');
      if (!CronExpression.validate(input.cronExpression)) {
        throw new Error(`Invalid cron expression "${input.cronExpression}"`);
      }
      normalizedCronExpression = cronExpression;
    }

    if (input.timezone !== undefined) {
      normalizedTimezone = normalizeScheduleTimezone(input.timezone);
    }

    const recomputeNext = input.cronExpression !== undefined || input.enabled !== undefined;
    if (recomputeNext) {
      const cronExpr = input.cronExpression || existing.cronExpression;
      const isEnabled = input.enabled !== undefined ? input.enabled : existing.enabled;
      if (isEnabled) {
        try {
          const cron = new CronExpression(cronExpr);
          nextRun = cron.nextRun(new Date());
        } catch {
          nextRun = null;
        }
      } else {
        nextRun = null;
      }
    }

    const updateData = buildSchedulePatch({
      name: normalizedName,
      description: normalizedDescription,
      enabled: normalizedEnabled,
      suiteId: normalizedSuiteId,
      executionProfileId: normalizedExecutionProfileId,
      environmentId: normalizedEnvironmentId,
      cronExpression: normalizedCronExpression,
      timezone: normalizedTimezone,
      nextRun,
    });

    return this.scheduleRepository.update(input.id, updateData);
  }
}

export default UpdateSchedule;
