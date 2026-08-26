import { describe, expect, it } from 'vitest';
import { parseAcceptanceCriteriaText } from './parseAcceptanceCriteria';

describe('parseAcceptanceCriteriaText', () => {
  it('keeps separately entered lines as independent criteria', () => {
    const criteria = parseAcceptanceCriteriaText('User can log in.\nUser can update their profile.');

    expect(criteria.map((criterion) => criterion.text)).toEqual([
      'User can log in.',
      'User can update their profile.',
    ]);
  });

  it('splits complete sentences pasted as one paragraph into independent criteria', () => {
    const criteria = parseAcceptanceCriteriaText(
      'User should be able to login. User should be able to update his profile. User should be able to logout successfully.',
    );

    expect(criteria.map((criterion) => criterion.text)).toEqual([
      'User should be able to login.',
      'User should be able to update his profile.',
      'User should be able to logout successfully.',
    ]);
  });
});
