import type { ExecutionPlan } from '../../requirements/types';
import type { ApiOperationOption } from '../../requirements/utils/operationDisplay';
import { resolveOperationLabel } from '../../requirements/utils/operationDisplay';

export function resolveExecutionPlanOperationLabel(
  executionPlanId: string,
  plans: ExecutionPlan[],
  operations: ApiOperationOption[],
): string {
  const plan = plans.find((candidate) => candidate.id === executionPlanId);
  if (!plan) return `Plan ${executionPlanId.slice(0, 8)}`;
  const operationLabel = resolveOperationLabel(operations, plan.operationId);
  return operationLabel === 'Not mapped' ? `Plan ${executionPlanId.slice(0, 8)}` : operationLabel;
}

export function explainBlockedPrerequisites(
  prerequisitePlanIds: string[],
  failedPlanIds: Set<string>,
  plans: ExecutionPlan[],
  operations: ApiOperationOption[],
): string {
  const failed = prerequisitePlanIds.filter((id) => failedPlanIds.has(id));
  const ids = failed.length > 0 ? failed : prerequisitePlanIds;
  const labels = ids.map((id) => resolveExecutionPlanOperationLabel(id, plans, operations));
  return labels.length > 0 ? `Blocked because prerequisite ${labels.join(' and ')} failed or was blocked.` : 'Blocked because a required prerequisite failed or was blocked.';
}
