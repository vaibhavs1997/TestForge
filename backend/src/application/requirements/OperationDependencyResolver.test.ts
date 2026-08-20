import { describe, expect, it } from 'vitest';
import { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';
import { OperationDependencyResolver } from './OperationDependencyResolver';

const op = (id: string) => new ApiOperationEntity(id, 'p', 's', id, 'POST', `/${id}`, '', 'None', 'Active', 0, 0);

describe('OperationDependencyResolver', () => {
  const resolver = new OperationDependencyResolver();

  it('resolves generic ordered flow prerequisites without method or name rules', () => {
    const result = resolver.resolveForDesign(
      { operationId: 'c', runtimeBindings: [] },
      [{ operationId: 'a', runtimeBindings: [] }, { operationId: 'b', runtimeBindings: [] }, { operationId: 'c', runtimeBindings: [] }],
      [{ id: 'flow', projectId: 'p', name: 'flow', description: '', tags: [], status: 'Confirmed', steps: [
        { id: '1', title: 'first', linkedApiOperationId: 'a', description: '', expectedResult: '', notes: '' },
        { id: '2', title: 'second', linkedApiOperationId: 'b', description: '', expectedResult: '', notes: '' },
        { id: '3', title: 'third', linkedApiOperationId: 'c', description: '', expectedResult: '', notes: '' },
      ], createdAt: 0, updatedAt: 0 }], [], [], [op('a'), op('b'), op('c')],
    );
    expect(result.dependencies.map((item) => item.sourceOperationId)).toEqual(['a', 'b']);
  });

  it('resolves a unique runtime response producer and rejects ambiguous producers', () => {
    const unique = resolver.resolveForDesign(
      { operationId: 'target', runtimeBindings: [{ variable: 'value', source: 'response', path: '$.value' }] },
      [{ operationId: 'source', runtimeBindings: [{ variable: 'value', source: 'response', path: '$.id' }] }], [], [], [], [op('source'), op('target')],
    );
    expect(unique.dependencies[0]).toMatchObject({ sourceOperationId: 'source', sourceResponsePath: '$.id', targetRequestPath: '$.value' });

    const ambiguous = resolver.resolveForDesign(
      { operationId: 'target', runtimeBindings: [{ variable: 'value', source: 'response', path: '$.value' }] },
      [{ operationId: 'one', runtimeBindings: [{ variable: 'value', source: 'response' }] }, { operationId: 'two', runtimeBindings: [{ variable: 'value', source: 'response' }] }], [], [], [], [op('one'), op('two'), op('target')],
    );
    expect(ambiguous.dependencies).toHaveLength(0);
    expect(ambiguous.warnings.some((warning) => warning.includes('Ambiguous producer'))).toBe(true);
  });

  it('handles missing operations and cycles without throwing', () => {
    const result = resolver.resolveForDesign(
      { operationId: 'b', runtimeBindings: [] },
      [{ operationId: 'a', runtimeBindings: [] }, { operationId: 'b', runtimeBindings: [] }],
      [{ id: 'cycle', projectId: 'p', name: 'cycle', description: '', tags: [], status: 'Confirmed', steps: [
        { id: '1', title: 'a', linkedApiOperationId: 'a', description: '', expectedResult: '', notes: '' },
        { id: '2', title: 'missing', linkedApiOperationId: 'missing', description: '', expectedResult: '', notes: '' },
        { id: '3', title: 'b', linkedApiOperationId: 'b', description: '', expectedResult: '', notes: '' },
      ], createdAt: 0, updatedAt: 0 }, { id: 'reverse', projectId: 'p', name: 'reverse', description: '', tags: [], status: 'Confirmed', steps: [
        { id: '4', title: 'b', linkedApiOperationId: 'b', description: '', expectedResult: '', notes: '' },
        { id: '5', title: 'a', linkedApiOperationId: 'a', description: '', expectedResult: '', notes: '' },
      ], createdAt: 0, updatedAt: 0 }], [], [], [op('a'), op('b')],
    );
    expect(result.dependencies).toHaveLength(1);
    expect(result.warnings.some((warning) => warning.includes('missing operation'))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes('cycle'))).toBe(true);
  });
});
