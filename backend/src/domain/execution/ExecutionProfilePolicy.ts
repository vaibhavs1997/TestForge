import { ExecutionProfileEntity } from './ExecutionProfileEntity';
import { ValidationHelpers } from '../validation/ValidationHelpers';

export interface ExecutionProfileCreateDraft {
  projectId: string;
  name: string;
  description: string;
  defaultEnvironmentId: string;
  failureMode: 'StopOnFailure' | 'ContinueOnFailure';
  retryPolicy: {
    enabled: boolean;
    maxRetries: number;
    retryDelay: number;
  };
  timeout: number;
  parallelism: {
    enabled: boolean;
    maxConcurrent: number;
  };
  assertionMode: 'all' | 'failFast' | 'skipOnFailure';
  runtimeVariableReset: boolean;
  datasetSelectionStrategy: 'first' | 'random' | 'sequential';
  tags: string[];
  enabled: boolean;
  isDefault: boolean;
}

export function normalizeExecutionProfileName(name: string): string {
  return ValidationHelpers.validateRequired(name, 'Profile name');
}

export function buildExecutionProfileEntity(
  id: string,
  now: number,
  draft: ExecutionProfileCreateDraft
): ExecutionProfileEntity {
  return new ExecutionProfileEntity(
    id,
    draft.projectId,
    draft.name,
    draft.description,
    draft.defaultEnvironmentId,
    draft.failureMode,
    draft.retryPolicy,
    draft.timeout,
    draft.parallelism,
    draft.assertionMode,
    draft.runtimeVariableReset,
    draft.datasetSelectionStrategy,
    draft.tags,
    draft.enabled,
    draft.isDefault,
    now,
    now
  );
}

export function buildExecutionProfileDuplicate(
  existing: ExecutionProfileEntity,
  id: string,
  name: string,
  now: number
): ExecutionProfileEntity {
  return new ExecutionProfileEntity(
    id,
    existing.projectId,
    name,
    existing.description,
    existing.defaultEnvironmentId,
    existing.failureMode,
    existing.retryPolicy,
    existing.timeout,
    existing.parallelism,
    existing.assertionMode,
    existing.runtimeVariableReset,
    existing.datasetSelectionStrategy,
    [...existing.tags, 'duplicate'],
    true,
    false,
    now,
    now
  );
}
