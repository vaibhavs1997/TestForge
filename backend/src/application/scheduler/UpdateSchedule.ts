// UpdateSchedule - Application Use Case for updating a scheduled execution
import { ScheduleEntity } from '../../domain/scheduler/ScheduleEntity';
import type { ScheduleRepository } from '../../domain/scheduler/ScheduleRepository';
import { TestSuiteRepository } from '../../domain/suite/TestSuiteRepository';
import { ValidationHelpers } from '../../domain/validation/ValidationHelpers';
import { CronExpression } from './CronExpression';

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

    const updateData: Partial<ScheduleEntity> = {};

    if (input.name !== undefined) {
      ValidationHelpers.validateNotEmpty(input.name, 'Schedule name');
      if (input.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
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
      }
      updateData.name = input.name.trim();
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.enabled !== undefined) {
      updateData.enabled = input.enabled;
    }

    if (input.suiteId !== undefined) {
      const suiteId = ValidationHelpers.validateRequired(input.suiteId, 'Test Suite');
      const suite = await this.suiteRepository.findById(suiteId);
      if (!suite) {
        throw new Error(`Test Suite with id ${suiteId} not found`);
      }
      if (suite.status !== 'Active') {
        throw new Error(`Cannot schedule disabled suite "${suite.name}" - suite must be Active`);
      }
      updateData.suiteId = suiteId;
    }

    if (input.executionProfileId !== undefined) {
      updateData.executionProfileId = ValidationHelpers.validateRequired(input.executionProfileId, 'Execution Profile');
    }

    if (input.environmentId !== undefined) {
      updateData.environmentId = input.environmentId;
    }

    if (input.cronExpression !== undefined) {
      const cronExpression = ValidationHelpers.validateRequired(input.cronExpression, 'Cron expression');
      if (!CronExpression.validate(input.cronExpression)) {
        throw new Error(`Invalid cron expression "${input.cronExpression}"`);
      }
      updateData.cronExpression = cronExpression;
    }

    if (input.timezone !== undefined) {
      updateData.timezone = input.timezone;
    }

    const recomputeNext = input.cronExpression !== undefined || input.enabled !== undefined;
    if (recomputeNext) {
      const cronExpr = input.cronExpression || existing.cronExpression;
      const isEnabled = input.enabled !== undefined ? input.enabled : existing.enabled;
      if (isEnabled) {
        try {
          const cron = new CronExpression(cronExpr);
          updateData.nextRun = cron.nextRun(new Date());
        } catch {
          updateData.nextRun = null;
        }
      } else {
        updateData.nextRun = null;
      }
    }

    return this.scheduleRepository.update(input.id, updateData);
  }
}

export default UpdateSchedule;
