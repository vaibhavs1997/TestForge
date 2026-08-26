import { describe, expect, it } from 'vitest';
import { RequirementEntity } from '../../domain/requirements/RequirementEntity.js';
import { planScenariosFromAcceptanceCriteria } from './acceptanceCriteriaScenarios.js';

function makeRequirement(ac: string | { id: string; text: string }[]): RequirementEntity {
  return new RequirementEntity(
    'req-1',
    'proj-1',
    'UUP',
    '',
    'General',
    80,
    'Manual',
    null,
    'Pending',
    'Suggested',
    [],
    [],
    [],
    typeof ac === 'string' ? [{ id: 'ac-1', text: ac }] : ac,
    Date.now(),
    Date.now(),
  );
}

describe('planScenariosFromAcceptanceCriteria', () => {
  it('mentions email and password explicitly for account registration', () => {
    const scenarios = planScenariosFromAcceptanceCriteria(
      makeRequirement('User should be able to create an account on dewalt us'),
    );

    expect(scenarios.some((s) => /valid email and password/i.test(s.title))).toBe(true);
    expect(scenarios.some((s) => /email is missing/i.test(s.title))).toBe(true);
    expect(scenarios.some((s) => /password is missing/i.test(s.title))).toBe(true);
    expect(scenarios.some((s) => /email format is invalid/i.test(s.title))).toBe(true);
    expect(scenarios.some((s) => /password fails validation/i.test(s.title))).toBe(true);
    for (const s of scenarios) {
      expect(s.title.toLowerCase()).not.toContain('uup');
    }
    const titles = scenarios.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('does not create missing-field cases for optional API properties', () => {
    const scenarios = planScenariosFromAcceptanceCriteria(
      makeRequirement('User should be able to create an account on dewalt us'),
      {
        apiRequiredBodyKeys: ['email', 'password'],
        apiBodyKeys: ['email', 'password', 'firstName', 'lastName'],
      },
    );
    expect(scenarios.some((s) => /first name is missing/i.test(s.title))).toBe(false);
    expect(scenarios.some((s) => /last name is missing/i.test(s.title))).toBe(false);
    expect(scenarios.some((s) => /email is missing/i.test(s.title))).toBe(true);
    expect(scenarios.some((s) => /password is missing/i.test(s.title))).toBe(true);
  });

  it('plans scenarios for every acceptance-criteria line instead of only the first flow', () => {
    const scenarios = planScenariosFromAcceptanceCriteria(makeRequirement([
      { id: 'ac-login', text: 'User should be able to login.' },
      { id: 'ac-profile', text: 'User should be able to update his profile.' },
      { id: 'ac-logout', text: 'User should be able to logout successfully.' },
    ]));

    expect(scenarios.some((scenario) => scenario.acceptanceCriterionId === 'ac-login' && /authenticate successfully/i.test(scenario.title))).toBe(true);
    expect(scenarios.some((scenario) => scenario.acceptanceCriterionId === 'ac-profile' && /update his profile/i.test(scenario.title))).toBe(true);
    expect(scenarios.some((scenario) => scenario.acceptanceCriterionId === 'ac-logout' && /logout successfully/i.test(scenario.title))).toBe(true);
    expect(new Set(scenarios.map((scenario) => scenario.acceptanceCriterionId))).toEqual(
      new Set(['ac-login', 'ac-profile', 'ac-logout']),
    );
  });

  it('plans each recognized action in a compound acceptance criterion', () => {
    const scenarios = planScenariosFromAcceptanceCriteria(
      makeRequirement('User should be able to login and update their profile.'),
    );

    expect(scenarios.some((scenario) => /authenticate successfully/i.test(scenario.title))).toBe(true);
    expect(scenarios.some((scenario) => /update their profile/i.test(scenario.title))).toBe(true);
  });
});
