import { describe, expect, it } from 'vitest';
import { ApiOperationEntity } from '../../domain/api/ApiOperationEntity.js';
import { RequirementEntity } from '../../domain/requirements/RequirementEntity.js';
import {
  getOperationMatchDiagnostics,
  pickOperationForCategory,
} from './RequirementOperationMatcher.js';

const operation = (id: string, name: string, path: string, method = 'POST') =>
  new ApiOperationEntity(
    id,
    'project-1',
    'service-1',
    name,
    method,
    path,
    name,
    'None',
    'Active',
    Date.now(),
    Date.now(),
  );

const requirement = (title: string, criteria = title) =>
  new RequirementEntity(
    'requirement-1',
    'project-1',
    title,
    '',
    'General',
    0,
    'Manual',
    null,
    'Pending',
    'Suggested',
    [],
    [],
    [],
    [{ id: 'criterion-1', text: criteria }],
    Date.now(),
    Date.now(),
  );

describe('RequirementOperationMatcher', () => {
  it('selects registration instead of a password-reset POST', () => {
    const registration = operation('register', 'Register user', '/users/register');
    const reset = operation('reset', 'Forgot password', '/password/reset');
    const diagnostics = getOperationMatchDiagnostics(requirement('User should be able to create an account'), [reset, registration]);

    expect(diagnostics.ranked[0]?.operation.id).toBe('register');
    expect(pickOperationForCategory(requirement('User should be able to create an account'), [reset, registration], 'Positive')).toBe('register');
  });

  it('reports strong explicit registration intent as confident', () => {
    const registration = operation('register', 'Registration', '/auth/signup');
    const diagnostics = getOperationMatchDiagnostics(requirement('User can create an account'), [registration]);

    expect(diagnostics.lowConfidence).toBe(false);
  });

  it('keeps the best available endpoint when confidence is low', () => {
    const reset = operation('reset', 'Forgot password', '/password/reset');

    expect(pickOperationForCategory(requirement('User should be able to create an account'), [reset], 'Positive'))
      .toBe('reset');
  });

  it('allows generation to continue when no operations are imported', () => {
    expect(pickOperationForCategory(requirement('A customer can create an order'), [], 'Positive')).toBe('');
  });

  it('maps a generic resource action without account-specific rules', () => {
    const createOrder = operation('create-order', 'Create order', '/orders', 'POST');
    const listOrders = operation('list-orders', 'List orders', '/orders', 'GET');

    expect(
      pickOperationForCategory(
        requirement('A customer should be able to create a new order'),
        [listOrders, createOrder],
        'Positive',
      ),
    ).toBe('create-order');
  });

  it('maps a password recovery requirement to the recovery operation', () => {
    const reset = operation('reset', 'Reset password', '/password/reset');
    const login = operation('login', 'Authenticate user', '/auth/login', 'POST');
    expect(
      pickOperationForCategory(
        requirement('Account access support', 'Given a registered user\nWhen they request a reset link'),
        [login, reset],
        'Positive',
      ),
    ).toBe('reset');
  });

  it('does not confirm a mapping that has only a generic action match', () => {
    const createCustomer = operation('customer', 'Create customer', '/customers');
    const diagnostics = getOperationMatchDiagnostics(
      requirement('Create a subscription', 'A customer can create a subscription'),
      [createCustomer],
    );

    expect(diagnostics.lowConfidence).toBe(true);
    expect(diagnostics.ranked[0]?.reasons.some((reason) => reason.startsWith('Business entity match:'))).toBe(false);
  });
});
