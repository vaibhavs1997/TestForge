// UpdateSchedule - Application Use Case for updating a scheduled execution
import { ScheduleEntity } from '../../domain/scheduler/ScheduleEntity';
import type { ScheduleRepository } from '../../domain/scheduler/ScheduleRepository';
import { TestSuiteRepository } from '../../domain/suite/TestSuiteRepository';
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
      if (!input.name.trim()) {
        throw new Error('Schedule name cannot be empty');
      }
      // Check for duplicate names excluding this schedule
      if (input.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
        const exists = await this.scheduleRepository.existsByName(input.name.trim(), input.projectId);
        if (exists) {
          throw new Error(`Schedule with name "${input.name}" already exists in this project`);
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
      if (!input.suiteId) {
        throw new Error('Test Suite is required');
      }
      const suite = await this.suiteRepository.findById(input.suiteId);
      if (!suite) {
        throw new Error(`Test Suite with id ${input.suiteId} not found`);
      }
      if (suite.status !== 'Active') {
        throw new Error(`Cannot schedule disabled suite "${suite.name}" - suite must be Active`);
      }
      updateData.suiteId = input.suiteId;
    }

    if (input.executionProfileId !== undefined) {
      if (!input.executionProfileId) {
        throw new Error('Execution Profile is required');
      }
      updateData.executionProfileId = input.executionProfileId;
    }

    if (input.environmentId !== undefined) {
      updateData.environmentId = input.environmentId;
    }

    if (input.cronExpression !== undefined) {
      if (!input.cronExpression || !input.cronExpression.trim()) {
        throw new Error('Cron expression is required');
      }
      if (!CronExpression.validate(input.cronExpression)) {
        throw new Error(`Invalid cron expression "${input.cronExpression}"`);
      }
      updateData.cronExpression = input.cronExpression.trim();
    }

    if (input.timezone !== undefined) {
      updateData.timezone = input.timezone;
    }

    // Recompute nextRun if cron expression or enabled changed
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