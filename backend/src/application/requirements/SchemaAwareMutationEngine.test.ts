import { describe, expect, it } from 'vitest';
import { SchemaAwareMutationEngine } from './SchemaAwareMutationEngine.js';

const engine = new SchemaAwareMutationEngine();
const operation: any = {
  responses: { '201': {}, '422': {} },
  requestBody: { content: { 'application/json': { schema: {
    type: 'object', required: ['name', 'count', 'choice', 'nested', 'tags'], properties: {
      name: { type: 'string', minLength: 2, maxLength: 4, pattern: '^[A-Z]+$', format: 'email' },
      count: { type: 'integer', minimum: 1, maximum: 3, exclusiveMaximum: 4 },
      choice: { type: 'string', enum: ['a', 'b'], nullable: true },
      nested: { type: 'object', required: ['value'], properties: { value: { type: 'number', minimum: 2 } } },
      tags: { type: 'array', minItems: 1, maxItems: 2, items: { type: 'string' } },
      composed: { oneOf: [{ type: 'string' }, { type: 'number' }] },
    },
  } } } },
  parameters: [
    { in: 'query', name: 'limit', required: true, schema: { type: 'integer', minimum: 1 } },
    { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
    { in: 'header', name: 'X-Mode', schema: { type: 'string', enum: ['safe'] } },
    { in: 'cookie', name: 'sid', schema: { type: 'string' } },
  ],
};

describe('SchemaAwareMutationEngine', () => {
  it('creates an isolated valid baseline then numeric/string/enum/null/missing mutations', () => {
    const cases = engine.generateOpenApi(operation, 60);
    const base: any = cases[0];
    expect(base.requestOverrides.body).toMatchObject({ name: 'user@example.test', count: 1, choice: 'a', nested: { value: 2 }, tags: ['a'] });
    expect(cases.some((c) => c.provenance.schemaRule === 'minimum')).toBe(true);
    expect(cases.some((c) => c.provenance.schemaRule === 'maxLength')).toBe(true);
    expect(cases.some((c) => c.provenance.strategy === 'enum-violation')).toBe(true);
    expect(cases.some((c) => c.provenance.schemaRule === 'nullable')).toBe(true);
    const missing = cases.find((c) => c.provenance.fieldPath === '$.name' && c.provenance.strategy === 'required-field')!;
    expect((missing.requestOverrides.body as any).name).toBe('');
    expect((missing.requestOverrides.body as any).nested.value).toBe(2);
    expect(missing.requestOverrides.body).toMatchObject({ count: 1, choice: 'a', tags: ['a'] });
  });

  it('handles nested objects, arrays, all composition, and every OpenAPI parameter location', () => {
    const cases = engine.generateOpenApi({ ...operation, requestBody: { content: { 'application/json': { schema: { allOf: [operation.requestBody.content['application/json'].schema, { type: 'object', properties: { extra: { type: 'string' } } }] } } } } }, 60);
    expect(cases.some((c) => c.provenance.fieldPath === '$.nested.value')).toBe(true);
    expect(cases.some((c) => c.provenance.strategy === 'array-boundary')).toBe(true);
    expect(cases.some((c) => c.provenance.schemaRule === 'oneOf' || c.provenance.schemaRule === 'allOf')).toBe(true);
    expect([...new Set(cases.map((c) => c.provenance.location))]).toEqual(expect.arrayContaining(['body', 'query', 'path', 'header', 'cookie']));
  });

  it('supports GraphQL variables, caps deterministic output, and deduplicates equivalent cases', () => {
    const first = engine.generateGraphQLVariables({ input: { type: 'object', required: ['age'], properties: { age: { type: 'integer', minimum: 18 } } } }, 4);
    const second = engine.generateGraphQLVariables({ input: { type: 'object', required: ['age'], properties: { age: { type: 'integer', minimum: 18 } } } }, 4);
    expect(first).toHaveLength(4);
    expect(first).toEqual(second);
    expect(first.every((c) => c.provenance.location === 'graphql-variable')).toBe(true);
    expect(new Set(first.map((c) => JSON.stringify(c.requestOverrides))).size).toBe(first.length);
  });

  it('derives documented negative assertions without assuming HTTP 400', () => {
    const cases = engine.generateOpenApi(operation, 8);
    expect(cases[0].assertions[0].expected).toBe(201);
    expect(cases[1].assertions[0].expected).toBe(422);
    expect(engine.deriveAssertions({ responses: { '200': {} } }, false)[0]).toMatchObject({ operator: 'matches', expected: '^[45]\\d\\d$' });
  });

  it('keeps mutation generation bounded instead of producing a Cartesian product', () => {
    const cases = engine.generateOpenApi(operation, 5);
    expect(cases).toHaveLength(5);
    expect(cases.map((c) => c.provenance.fieldPath)).toContain('$');
  });

  it('preserves baseline fields when mutating a nested field', () => {
    const changed = engine.generateOpenApi(operation, 60).find((c) => c.provenance.fieldPath === '$.nested.value' && c.provenance.schemaRule === 'minimum')!;
    expect(changed.requestOverrides.body).toMatchObject({ name: 'user@example.test', count: 1, choice: 'a', tags: ['a'] });
    expect((changed.requestOverrides.body as any).nested.value).toBe(1);
  });
});
