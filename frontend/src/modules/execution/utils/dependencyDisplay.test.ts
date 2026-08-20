import { describe, expect, it } from 'vitest';
import { explainBlockedPrerequisites, resolveExecutionPlanOperationLabel } from './dependencyDisplay';

const plans: any[] = [{ id: 'plan-a', operationId: 'op-a' }, { id: 'plan-b', operationId: 'op-b' }];
const operations: any[] = [
  { id: 'op-a', method: 'POST', path: '/a', name: 'Create A' },
  { id: 'op-b', method: 'GET', path: '/b', name: 'Read B' },
];

describe('execution dependency display', () => {
  it('resolves plan id through plan and operation catalog', () => {
    expect(resolveExecutionPlanOperationLabel('plan-a', plans, operations)).toBe('POST /a');
  });

  it('explains one and multiple blocked prerequisites', () => {
    expect(explainBlockedPrerequisites(['plan-a'], new Set(['plan-a']), plans, operations)).toContain('POST /a');
    expect(explainBlockedPrerequisites(['plan-a', 'plan-b'], new Set(['plan-a', 'plan-b']), plans, operations)).toContain('POST /a and GET /b');
  });
});
