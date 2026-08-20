import { describe, expect, it } from 'vitest';
import { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';
import { RequirementEntity } from '../../domain/requirements/RequirementEntity';
import { RequirementEndpointMappingService } from './RequirementEndpointMappingService';
import { matchesGeneratedScenario } from './GenerateRequirementTestCases';

const operation = (id: string, name: string, method: string, path: string) =>
  new ApiOperationEntity(id, 'project-1', 'service-1', name, method, path, name, 'None', 'Active', 0, 0);

const requirement = (title: string, criteria: string[] = [title]) =>
  new RequirementEntity('r1', 'project-1', title, '', 'General', 0, 'Manual', null, 'Pending', 'Suggested', [], [], [], criteria.map((text, i) => ({ id: `c${i}`, text })), 0, 0);

describe('RequirementEndpointMappingService', () => {
  const service = new RequirementEndpointMappingService();

  it('keeps CRUD candidates distinct and ranks create for a create requirement', () => {
    const operations = [
      operation('get', 'List orders', 'GET', '/orders'),
      operation('post', 'Create order', 'POST', '/orders'),
      operation('put', 'Update order', 'PUT', '/orders/{id}'),
      operation('delete', 'Delete order', 'DELETE', '/orders/{id}'),
    ];
    const req = requirement('Create an order', ['User can create a new order']);
    const decision = service.resolveFallback(req, operations, 'Positive');
    expect(decision.operationId).toBe('post');
    expect(service.rankCandidates(req, operations).map((candidate) => candidate.id)).toContain('post');
  });

  it('marks ambiguous similar operations for review', () => {
    const operations = [
      operation('one', 'Create customer profile', 'POST', '/customers'),
      operation('two', 'Create customer account', 'POST', '/accounts'),
    ];
    const decision = service.resolveFallback(requirement('Create customer', ['Create a customer']), operations, 'Positive');
    expect(decision.state).toBe('review');
    expect(decision.provenance).toBe('matcher');
  });

  it('never replaces a user-confirmed operation', () => {
    const operations = [operation('one', 'Create customer', 'POST', '/customers'), operation('two', 'Create account', 'POST', '/accounts')];
    const decision = service.preserveExisting(
      { operationId: 'two', mappingProvenance: 'user', mappingState: 'confirmed', mappingConfidence: 100 },
      requirement('Create customer'),
      operations,
      'Positive',
    );
    expect(decision).toEqual({ operationId: 'two', provenance: 'user', state: 'confirmed', confidence: 100 });
  });

  it('falls back when an AI operation is outside the candidate set', () => {
    const operations = [operation('valid', 'Create customer', 'POST', '/customers')];
    const decision = service.preserveExisting(
      { operationId: 'invented', mappingProvenance: 'ai', mappingState: 'confirmed', mappingConfidence: 95 },
      requirement('Create customer'),
      operations,
      'Positive',
    );
    expect(decision.operationId).toBe('valid');
    expect(decision.provenance).toBe('matcher');
  });

  it('preserves a user mapping when AI changes wording but keeps scenarioId', () => {
    expect(matchesGeneratedScenario(
      { title: 'Create account', operationId: 'one', acceptanceCriterionId: 'ac-1', scenarioId: 'ac-1:scenario:0' },
      { title: 'Register a new profile successfully', acceptanceCriterionId: 'ac-1', scenarioId: 'ac-1:scenario:0', strategyItemId: 'new-item' },
    )).toBe(true);
  });

  it('does not match identical titles when scenario identities differ', () => {
    expect(matchesGeneratedScenario(
      { title: 'Validate request', operationId: 'one', acceptanceCriterionId: 'ac-1', scenarioId: 'ac-1:scenario:0' },
      { title: 'Validate request', acceptanceCriterionId: 'ac-2', scenarioId: 'ac-2:scenario:0', strategyItemId: 'new-item' },
    )).toBe(false);
  });

  it('keeps two scenarios under one criterion distinct by scenarioId', () => {
    expect(matchesGeneratedScenario(
      { title: 'Validate request', operationId: 'one', acceptanceCriterionId: 'ac-1', scenarioId: 'ac-1:scenario:0' },
      { title: 'Validate request', acceptanceCriterionId: 'ac-1', scenarioId: 'ac-1:scenario:1', strategyItemId: 'new-item' },
    )).toBe(false);
  });

  it('supports legacy designs through title fallback', () => {
    expect(matchesGeneratedScenario(
      { title: 'Legacy scenario', operationId: 'one' },
      { title: 'Legacy scenario', strategyItemId: 'new-item' },
    )).toBe(true);
  });

  it('ranks each acceptance criterion independently', () => {
    const operations = [
      operation('read', 'Read invoice', 'GET', '/invoices/{id}'),
      operation('cancel', 'Cancel invoice', 'POST', '/invoices/{id}/cancel'),
    ];
    const req = requirement('Invoice management', ['User can read an invoice', 'User can cancel an invoice']);
    const read = service.rankCandidatesForScenario(req, operations, 'c0', 'Read an invoice');
    const cancel = service.rankCandidatesForScenario(req, operations, 'c1', 'Cancel an invoice');
    expect(read[0]?.id).toBe('read');
    expect(cancel[0]?.id).toBe('cancel');
  });

  it('keeps multiple scenarios for one criterion on the same criterion-scoped candidates', () => {
    const operations = [operation('profile', 'Update profile', 'PATCH', '/profiles/{id}'), operation('settings', 'Update settings', 'PATCH', '/settings/{id}')];
    const req = requirement('Profile changes', ['User can update profile fields']);
    const first = service.rankCandidatesForScenario(req, operations, 'c0', 'Update profile email');
    const second = service.rankCandidatesForScenario(req, operations, 'c0', 'Update profile phone');
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id));
  });
});
