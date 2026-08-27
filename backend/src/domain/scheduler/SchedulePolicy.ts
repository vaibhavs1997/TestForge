import { ValidationHelpers } from '../validation/ValidationHelpers.js';
import { ScheduleEntity } from './ScheduleEntity.js';

export interface CreateScheduleDraft {
  projectId: string;
  name: string;
  description: string;
  enabled: boolean;
  suiteId: string;
  executionProfileId: string;
  environmentId: string | null;
  tokenOperationId?: string | null;
  cronExpression: string;
  timezone: string;
  nextRun: number | null;
}

export interface UpdateSchedulePatch {
  name?: string;
  description?: string;
  enabled?: boolean;
  suiteId?: string;
  executionProfileId?: string;
  environmentId?: string | null;
  tokenOperationId?: string | null;
  cronExpression?: string;
  timezone?: string;
  nextRun?: number | null;
}

export function normalizeScheduleName(name: string): string {
  return ValidationHelpers.validateRequired(name, 'Schedule name');
}

export function normalizeScheduleDescription(description: string | null | undefined): string {
  return ValidationHelpers.trimString(description);
}

export function normalizeScheduleTimezone(timezone: string | null | undefined): string {
  return ValidationHelpers.trimString(timezone) || 'UTC';
}

export function assertActiveSuite(suite: { name: string; status: string }): void {
  if (suite.status !== 'Active') {
    throw new Error(`Cannot schedule disabled suite "${suite.name}" - suite must be Active`);
  }
}

export function buildScheduleEntity(
  id: string,
  now: number,
  draft: CreateScheduleDraft
): ScheduleEntity {
  return new ScheduleEntity(
    id,
    draft.projectId,
    draft.name,
    draft.description,
    draft.enabled,
    draft.suiteId,
    draft.executionProfileId,
    draft.environmentId,
    draft.tokenOperationId ?? null,
    draft.cronExpression,
    draft.timezone,
    draft.nextRun,
    null,
    null,
    now,
    now
  );
}

export function buildSchedulePatch(patch: UpdateSchedulePatch): Partial<ScheduleEntity> {
  const updateData: Partial<ScheduleEntity> = {};

  if (patch.name !== undefined) updateData.name = patch.name;
  if (patch.description !== undefined) updateData.description = patch.description;
  if (patch.enabled !== undefined) updateData.enabled = patch.enabled;
  if (patch.suiteId !== undefined) updateData.suiteId = patch.suiteId;
  if (patch.executionProfileId !== undefined) updateData.executionProfileId = patch.executionProfileId;
  if (patch.environmentId !== undefined) updateData.environmentId = patch.environmentId;
  if (patch.tokenOperationId !== undefined) updateData.tokenOperationId = patch.tokenOperationId;
  if (patch.cronExpression !== undefined) updateData.cronExpression = patch.cronExpression;
  if (patch.timezone !== undefined) updateData.timezone = patch.timezone;
  if (patch.nextRun !== undefined) updateData.nextRun = patch.nextRun;

  return updateData;
}
