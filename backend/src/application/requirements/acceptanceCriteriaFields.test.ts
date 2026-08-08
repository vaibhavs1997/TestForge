import { describe, expect, it } from 'vitest';
import { formatFieldList, inferFieldsFromAcceptanceCriteria } from './acceptanceCriteriaFields';

describe('inferFieldsFromAcceptanceCriteria', () => {
  it('defaults to email and password for account registration flows', () => {
    const ctx = inferFieldsFromAcceptanceCriteria(
      'User should be able to create an account on dewalt us',
      { flowKind: 'account' },
    );
    expect(ctx.requiredFieldLabels).toEqual(['email', 'password']);
    expect(ctx.contextPhrase?.toLowerCase()).toContain('dewalt');
  });

  it('uses only OpenAPI required fields for mandatory list, not optional sample properties', () => {
    const ctx = inferFieldsFromAcceptanceCriteria('Register a new customer', {
      flowKind: 'account',
      apiRequiredBodyKeys: ['email', 'password'],
      apiBodyKeys: ['email', 'password', 'firstName', 'lastName', 'marketingOptIn'],
    });
    expect(ctx.requiredFieldIds).toEqual(['email', 'password']);
    expect(ctx.requiredFieldLabels).not.toContain('first name');
  });

  it('falls back to core fields from sample when OpenAPI required is missing', () => {
    const ctx = inferFieldsFromAcceptanceCriteria('Create account', {
      flowKind: 'account',
      apiBodyKeys: ['email', 'password', 'firstName'],
    });
    expect(ctx.requiredFieldIds).toEqual(['email', 'password']);
  });

  it('formats field lists for titles', () => {
    expect(formatFieldList(['email', 'password'])).toBe('email and password');
    expect(formatFieldList(['email', 'password', 'phone number'])).toBe(
      'email, password, and phone number',
    );
  });
});
