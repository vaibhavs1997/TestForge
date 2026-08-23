import { describe, expect, it } from 'vitest';
import { Validators } from './Validators.js';

const response = { status: 200, duration: 12, headers: { 'x-id': 'abc' }, data: { user: { name: 'Ada', tags: ['a', 'b'], age: 31 }, token: 'secret-token' } };
const rule = (definition: any) => ({ id: 'r', executionPlanId: 'p', name: 'custom', type: 'Custom Assertion' as const, config: { expected: definition } });
const run = (definition: any) => Validators.validateCustomAssertion(rule(definition), response, { runtimeVariables: { id: 7 } });

describe('declarative custom assertion runtime', () => {
  it.each([
    [{ path: '$.user.name', operator: 'equals', expected: 'Ada' }],
    [{ path: '$.user.name', operator: 'not equals', expected: 'Bob' }],
    [{ path: '$.user.name', operator: 'exists' }],
    [{ path: '$.missing', operator: 'not exists' }],
    [{ path: '$.user.tags', operator: 'contains', expected: 'b' }],
    [{ path: '$.user.name', operator: 'matches', expected: '^A' }],
    [{ path: '$.user.age', operator: 'greater than', expected: 30 }],
    [{ path: '$.user.age', operator: 'less than', expected: 40 }],
    [{ path: '$.user.tags', operator: 'type', expected: 'array' }],
    [{ path: '$.user.tags', operator: 'array length', expected: 2 }],
    [{ target: 'header', path: 'x-id', operator: 'equals', expected: 'abc' }],
    [{ target: 'status', operator: 'equals', expected: 200 }],
    [{ path: '$.user', operator: 'schema', expected: { name: 'string', tags: 'array' } }],
  ])('supports %#', (definition) => expect(run(definition).status).toBe('Passed'));

  it('fails malformed definitions and bad regexes structurally', () => {
    expect(run({ path: '$.user.name', operator: 'matches', expected: '[' }).status).toBe('Failed');
    expect(run({ path: '$.user.name', operator: 'javascript', expected: 'x' }).error).toContain('Invalid custom assertion');
  });

  it('does not expose sensitive literal values in results', () => {
    const result = run({ path: '$.token', operator: 'equals', expected: 'wrong' });
    expect(result.actual).toBe('[REDACTED]');
    expect(result.error).not.toContain('secret-token');
  });
});
