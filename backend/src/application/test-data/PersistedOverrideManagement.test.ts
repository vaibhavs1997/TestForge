import { describe, expect, it } from 'vitest';
import { FieldDataRuleEntity } from '../../domain/test-data/FieldDataRuleEntity.js';
import { FieldDataResolutionService } from './FieldDataResolutionService.js';
import { TestCaseVersionService } from '../requirements/TestCaseVersionService.js';

const input = (operationId: string, path = 'email', semanticType = 'email', location = 'BODY') => ({ operationId, location, path, semanticType });
const rule = (id: string, operationId: string, strategy: any, value: unknown, scopeKind: any = 'OPERATION', semanticType = 'email') => new FieldDataRuleEntity(
  id, 'project', input(operationId, scopeKind === 'PROJECT_FALLBACK' ? '*' : 'email', semanticType), semanticType, true, strategy, 'EACH_EXECUTION', 'REUSABLE', 'POPULATE', { type: 'value', value }, 'ALLOW', 'ACCEPTED', 0, 0, scopeKind,
);

describe('persisted override management', () => {
  it('creates a new review-required TestCase version for an exact-version override and preserves approval history', () => {
    const service = new TestCaseVersionService();
    const [version] = service.reconcile('project', [{ requirementId: 'req', operationId: 'op', scenarioIntent: 'scenario', payload: {}, assertions: [], mapping: {} }]);
    service.review(version.id, 'APPROVED', 'reviewer');
    const next = service.edit(version.id, { dataOverrides: { 'op|BODY|email': 'saved@example.test' } });

    expect(version.lifecycle).toBe('APPROVED');
    expect(version.content.dataOverrides).toBeUndefined();
    expect(next.lifecycle).toBe('REVIEW_REQUIRED');
    expect(next.content.dataOverrides).toEqual({ 'op|BODY|email': 'saved@example.test' });
  });

  it('uses an operation rule only for its exact canonical input', async () => {
    const resolver = new FieldDataResolutionService();
    const operationRule = rule('operation', 'register', 'FIXED', 'register@example.test');
    const register = await resolver.resolve(input('register'), operationRule, { projectId: 'project' });
    const login = await resolver.resolve(input('login'), null, { projectId: 'project' });

    expect(register.value).toBe('register@example.test');
    expect(login.value).toBeUndefined();
  });

  it('uses compatible project fallbacks but never lets them override an operation rule', async () => {
    const resolver = new FieldDataResolutionService();
    const fallback = rule('fallback', '__PROJECT_DEFAULT__', 'FIXED', 'fallback@example.test', 'PROJECT_FALLBACK');
    const operationRule = rule('operation', 'register', 'FIXED', 'operation@example.test');

    expect((await resolver.resolve(input('login'), null, { projectId: 'project', projectFallbackRules: [fallback] })).value).toBe('fallback@example.test');
    expect((await resolver.resolve(input('register'), operationRule, { projectId: 'project', projectFallbackRules: [fallback] })).value).toBe('operation@example.test');
  });

  it('does not match a project fallback by same raw field name when semantic metadata differs', async () => {
    const resolver = new FieldDataResolutionService();
    const fallback = rule('fallback', '__PROJECT_DEFAULT__', 'FIXED', 'fallback@example.test', 'PROJECT_FALLBACK', 'email');
    const result = await resolver.resolve(input('other-operation', 'email', 'identifier'), null, { projectId: 'project', projectFallbackRules: [fallback] });
    expect(result.value).toBeUndefined();
  });

  it('retains saved generator and linked-response strategies through resolution', async () => {
    const resolver = new FieldDataResolutionService();
    const generator = rule('generator', 'create', 'GENERATE', undefined);
    const linked = new FieldDataRuleEntity('linked', 'project', input('consume', 'createdId', 'identifier'), 'identifier', true, 'LINKED_RESPONSE', 'EACH_EXECUTION', 'REUSABLE', 'POPULATE', { type: 'producer', field: 'producerId' }, 'ALLOW', 'ACCEPTED', 0, 0);
    expect((await resolver.resolve(input('create'), generator, { projectId: 'project', generator: () => 'generated-value' })).value).toBe('generated-value');
    expect((await resolver.resolve(input('consume', 'createdId', 'identifier'), linked, { projectId: 'project', linkedValues: { producerId: 'linked-value' } })).value).toBe('linked-value');
  });

  it('keeps temporary overrides transient and ahead of persisted values', async () => {
    const resolver = new FieldDataResolutionService();
    const saved = rule('operation', 'register', 'FIXED', 'saved@example.test');
    const result = await resolver.resolve(input('register'), saved, { projectId: 'project', manualOverrides: { 'register|BODY|email': 'temporary@example.test' } });
    expect(result.value).toBe('temporary@example.test');
    expect(saved.sourceReference?.value).toBe('saved@example.test');
  });
});
