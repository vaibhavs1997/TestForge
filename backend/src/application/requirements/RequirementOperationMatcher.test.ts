import { describe, expect, it } from 'vitest';
import { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';
import { RequirementEntity } from '../../domain/requirements/RequirementEntity';
import {
  getOperationMatchDiagnostics,
  pickOperationForCategory,
} from './RequirementOperationMatcher';

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

const requirement = (title: string) =>
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
    [{ id: 'criterion-1', text: title }],
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

  it('does not select an unrelated endpoint when no confident match exists', () => {
    const reset = operation('reset', 'Forgot password', '/password/reset');

    expect(() => pickOperationForCategory(requirement('User should be able to create an account'), [reset], 'Positive'))
      .toThrow(/No confident API mapping/);
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
});
