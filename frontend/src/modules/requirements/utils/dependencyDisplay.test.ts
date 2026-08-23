import { describe, expect, it } from 'vitest';
import { buildDependencyChain } from './dependencyDisplay';

describe('requirement dependency display', () => {
  it('renders a transitive chain without duplicate edges', () => {
    const designs: any[] = [
      { id: 'a', operationId: 'op-a', dependencies: [] },
      { id: 'b', operationId: 'op-b', dependencies: [{ sourceOperationId: 'op-a', targetOperationId: 'op-b' }] },
      { id: 'c', operationId: 'op-c', dependencies: [{ sourceOperationId: 'op-b', targetOperationId: 'op-c' }, { sourceOperationId: 'op-a', targetOperationId: 'op-b' }] },
    ];
    expect(buildDependencyChain(designs, designs[2])).toEqual([
      { sourceOperationId: 'op-a', targetOperationId: 'op-b' },
      { sourceOperationId: 'op-b', targetOperationId: 'op-c' },
    ]);
  });

  it('handles cycles defensively', () => {
    const designs: any[] = [{ id: 'a', operationId: 'op-a', dependencies: [{ sourceOperationId: 'op-b', targetOperationId: 'op-a' }] }, { id: 'b', operationId: 'op-b', dependencies: [{ sourceOperationId: 'op-a', targetOperationId: 'op-b' }] }];
    expect(buildDependencyChain(designs, designs[0])).toHaveLength(2);
  });
});
