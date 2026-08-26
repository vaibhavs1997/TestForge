import { describe, expect, it } from 'vitest';
import { FieldDataAnalyzer } from './FieldDataAnalyzer.js';
import { FieldDataRuleEntity } from '../../domain/test-data/FieldDataRuleEntity.js';
const field = (operationId: string, path: string, schema: any, required = true, location = 'BODY') => ({ input: { operationId, protocol: 'neutral', location, path }, schema, required });
describe('FieldDataAnalyzer', () => {
  it('auto-accepts contract examples, defaults, and single-value enums', () => {
    const analyzer = new FieldDataAnalyzer();
    const result = analyzer.analyze([
      field('create', 'email', { type: 'string', format: 'email', example: 'user@example.com' }),
      field('create', 'role', { type: 'string', enum: ['member'] }),
    ], [], []);
    expect(result.suggestions.every((suggestion) => suggestion.status === 'AUTO_ACCEPTABLE')).toBe(true);
    expect(result.suggestions.map((suggestion) => suggestion.strategy)).toEqual(['CONTRACT_DEFAULT', 'CONTRACT_DEFAULT']);
  });

  it('auto-accepts optional fields as omissions and marks ambiguous values for review', () => {
    const analyzer = new FieldDataAnalyzer();
    const result = analyzer.analyze([
      field('create', 'nickname', { type: 'string' }, false),
      field('create', 'customValue', { type: 'custom' }),
    ], [], []);
    expect(result.suggestions[0]).toMatchObject({ status: 'AUTO_ACCEPTABLE', optionalFieldPolicy: 'OMIT' });
    expect(result.suggestions[1]).toMatchObject({ status: 'UNRESOLVED' });
  });

  it('keeps same email input operation-specific', () => { const result = new FieldDataAnalyzer().analyze([field('register', 'email', { type: 'string', format: 'email' }), field('login', 'email', { type: 'string', format: 'email' })], [], [{ operationId: 'register', path: 'email', schemaType: 'string' }]); expect(result.suggestions[0].strategy).toBe('GENERATE'); expect(result.suggestions[1].strategy).toBe('LINKED_RESPONSE'); });
  it('detects semantic formats, optional omission, defaults, and ambiguous producers', () => { const result = new FieldDataAnalyzer().analyze([field('a', 'id', { type: 'string', format: 'uuid' }), field('a', 'flag', { type: 'boolean' }, false), field('a', 'kind', { type: 'string', default: 'basic' }), field('a', 'userId', { type: 'string' })], [], [{ operationId: 'x', path: 'userId', schemaType: 'string' }, { operationId: 'y', path: 'userId', schemaType: 'string' }]); expect(result.suggestions[0].semanticType).toBe('uuid'); expect(result.suggestions[1].optionalFieldPolicy).toBe('OMIT'); expect(result.suggestions[2].strategy).toBe('CONTRACT_DEFAULT'); expect(result.suggestions[3].status).toBe('REVIEW_REQUIRED'); });
  it('preserves accepted rules and detects refresh changes/removals for REST and GraphQL inputs', () => { const accepted = new FieldDataRuleEntity('r', 'p', field('rest', 'email', { type: 'string' }).input, 'email', true, 'REUSE', 'EACH_EXECUTION', 'REUSABLE', 'POPULATE', null, 'ALLOW', 'ACCEPTED', 0, 0); const current = [field('rest', 'email', { type: 'string', format: 'email' }), field('gql', 'input.id', { type: 'integer' }, true, 'VARIABLE')]; const result = new FieldDataAnalyzer().analyze(current, [accepted], [], [field('rest', 'email', { type: 'string' }), field('gone', 'x', { type: 'string' })]); expect(result.suggestions[0].reusedExistingRule).toBe(true); expect(result.rulesRequiringReview).toContain('r'); expect(result.summary.totalInputs).toBe(2); });
});
