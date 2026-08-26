import type { RequirementEntity } from '../../domain/requirements/RequirementEntity.js';
import type { StrategyCategory, StrategyPriority } from '../../domain/requirements/TestStrategyEntity.js';
import { getAcceptanceCriteriaFocusText } from './requirementAcceptanceFocus.js';
import {
  formatFieldList,
  inferFieldsFromAcceptanceCriteria,
  type AcceptanceFieldContext,
} from './acceptanceCriteriaFields.js';

export type TestCaseType = 'Positive' | 'Negative' | 'Security';

export interface PlannedScenario {
  category: StrategyCategory;
  testCaseType: TestCaseType;
  title: string;
  reason: string;
  priority: StrategyPriority;
  expectedHttpStatus: number;
  /** When set, payload omits or invalidates this field for the scenario. */
  focusFieldId?: string;
  scenarioKind?: 'missing_field' | 'invalid_field' | 'duplicate' | 'default';
  /** The acceptance criterion that produced this scenario. */
  acceptanceCriterionId?: string;
}

export interface PlanScenariosOptions {
  /** OpenAPI request body schema `required` property names. */
  apiRequiredBodyKeys?: string[];
  /** Sample body keys (fallback when `required` is not declared). */
  apiBodyKeys?: string[];
}

function dedupeKey(s: PlannedScenario): string {
  return `${s.acceptanceCriterionId ?? 'legacy'}|${s.testCaseType}|${s.expectedHttpStatus}|${s.title.toLowerCase()}`;
}

function addAccountRegistrationScenarios(
  add: (scenario: PlannedScenario) => void,
  fields: AcceptanceFieldContext,
  mentionsRegion: boolean,
  lowerNorm: string,
): void {
  const reqList = formatFieldList(fields.requiredFieldLabels);
  const contextSuffix = fields.contextPhrase ? ` (${fields.contextPhrase})` : '';

  add({
    category: 'Positive',
    testCaseType: 'Positive',
    title: `Register a new account with valid ${reqList}${contextSuffix}`.replace(/\s+/g, ' ').trim(),
    reason: `Happy path: all required inputs (${reqList}) are valid.`,
    priority: 'High',
    expectedHttpStatus: 201,
  });

  for (let idx = 0; idx < fields.requiredFieldLabels.length; idx += 1) {
    const label = fields.requiredFieldLabels[idx];
    const fieldId = fields.requiredFieldIds[idx];
    add({
      category: 'Validation',
      testCaseType: 'Negative',
      title: `Reject registration when ${label} is missing from the request`,
      reason: `${label} is required and must be present on account creation.`,
      priority: 'High',
      expectedHttpStatus: 400,
      focusFieldId: fieldId,
      scenarioKind: 'missing_field',
    });
  }

  if (fields.requiredFieldIds.includes('email')) {
    add({
      category: 'Validation',
      testCaseType: 'Negative',
      title: 'Reject registration when email format is invalid',
      reason: 'Malformed email must not be accepted.',
      priority: 'High',
      expectedHttpStatus: 400,
      focusFieldId: 'email',
      scenarioKind: 'invalid_field',
    });
  }

  if (fields.requiredFieldIds.includes('password')) {
    add({
      category: 'Validation',
      testCaseType: 'Negative',
      title: 'Reject registration when password fails validation rules',
      reason: 'Weak or policy-violating passwords must be rejected.',
      priority: 'High',
      expectedHttpStatus: 400,
      focusFieldId: 'password',
      scenarioKind: 'invalid_field',
    });
  }

  const duplicateKey = fields.requiredFieldIds.includes('email')
    ? 'email'
    : fields.requiredFieldIds.includes('username')
      ? 'username'
      : fields.requiredFieldLabels[0];

  if (duplicateKey) {
    add({
      category: 'Negative',
      testCaseType: 'Negative',
      title: `Reject registration when ${duplicateKey} is already registered`,
      reason: 'Duplicate accounts must not be created.',
      priority: 'High',
      expectedHttpStatus: 409,
    });
  }

  if (mentionsRegion || fields.requiredFieldIds.includes('region')) {
    const regionLabel = fields.contextPhrase ?? 'the selected market or region';
    add({
      category: 'Business Rules',
      testCaseType: 'Negative',
      title: `Reject registration when ${regionLabel} is not supported`,
      reason: 'Regional or market constraints from acceptance criteria must be enforced.',
      priority: 'Medium',
      expectedHttpStatus: 403,
    });
  }

  if (/auth|token|credential|permission|protected|role|admin/i.test(lowerNorm)) {
    add({
      category: 'Security',
      testCaseType: 'Security',
      title: 'Reject registration when authentication token is missing or invalid',
      reason: 'Protected registration endpoints must enforce auth when applicable.',
      priority: 'Medium',
      expectedHttpStatus: 401,
    });
  }
}

function addAuthScenarios(add: (scenario: PlannedScenario) => void, fields: AcceptanceFieldContext): void {
  const loginFields = formatFieldList(
    fields.requiredFieldLabels.length > 0 ? fields.requiredFieldLabels : ['email', 'password'],
  );

  add({
    category: 'Positive',
    testCaseType: 'Positive',
    title: `Authenticate successfully with valid ${loginFields}`,
    reason: 'Valid credentials satisfy the acceptance criteria.',
    priority: 'High',
    expectedHttpStatus: 200,
  });

  const loginFieldIds = fields.requiredFieldIds.length > 0
    ? fields.requiredFieldIds
    : ['email', 'password'];
  const loginFieldLabels = fields.requiredFieldLabels.length > 0
    ? fields.requiredFieldLabels
    : ['email', 'password'];
  for (let index = 0; index < loginFieldLabels.length; index += 1) {
    const label = loginFieldLabels[index];
    add({
      category: 'Validation',
      testCaseType: 'Negative',
      title: `Reject login when ${label} is missing`,
      reason: `${label} is required for authentication.`,
      priority: 'High',
      expectedHttpStatus: 400,
      focusFieldId: loginFieldIds[index],
      scenarioKind: 'missing_field',
    });
  }

  add({
    category: 'Negative',
    testCaseType: 'Negative',
    title: `Reject login when ${loginFields} are incorrect`,
    reason: 'Invalid credentials must not grant access.',
    priority: 'High',
    expectedHttpStatus: 401,
  });
}

function addGenericScenarios(
  add: (scenario: PlannedScenario) => void,
  acText: string,
  fields: AcceptanceFieldContext,
): void {
  const summary = acText.length > 120 ? `${acText.slice(0, 117).trim()}…` : acText;
  const reqList = formatFieldList(fields.requiredFieldLabels);

  add({
    category: 'Positive',
    testCaseType: 'Positive',
    title:
      fields.requiredFieldLabels.length > 0
        ? `Complete the flow successfully with valid ${reqList}`
        : summary,
    reason: 'Primary success path derived from acceptance criteria.',
    priority: 'High',
    expectedHttpStatus: 200,
  });

  if (fields.requiredFieldLabels.length > 0) {
    for (let index = 0; index < fields.requiredFieldLabels.length; index += 1) {
      const label = fields.requiredFieldLabels[index];
      add({
        category: 'Validation',
        testCaseType: 'Negative',
        title: `Reject the request when required field ${label} is missing`,
        reason: `${label} is required per the acceptance criteria.`,
        priority: 'High',
        expectedHttpStatus: 400,
        focusFieldId: fields.requiredFieldIds[index],
        scenarioKind: 'missing_field',
      });
    }
    add({
      category: 'Validation',
      testCaseType: 'Negative',
      title: `Reject the request when ${reqList} fail validation`,
      reason: 'Invalid field values must be rejected.',
      priority: 'High',
      expectedHttpStatus: 400,
    });
  } else {
    add({
      category: 'Negative',
      testCaseType: 'Negative',
      title: 'Reject the request when required input is missing or invalid',
      reason: 'Invalid or incomplete requests must be rejected.',
      priority: 'High',
      expectedHttpStatus: 400,
    });
  }

  add({
    category: 'Negative',
    testCaseType: 'Negative',
    title: 'Return not found when the requested resource does not exist',
    reason: 'Missing resources should not return success.',
    priority: 'Medium',
    expectedHttpStatus: 404,
  });
}

const ACTION_START = '(?:log(?:\\s|-)?(?:in|out)|sign(?:\\s|-)?(?:in|out|up)|authenticate|register|create|update|edit|change|delete|remove|view|get|retrieve|reset|forgot|verify|submit|send|add|search|list|upload|download)';
const compoundActionBoundary = new RegExp(
  `\\s+(?:and\\s+then|then|also|and)\\s+(?=${ACTION_START}\\b)`,
  'ig',
);
const actionStart = new RegExp(ACTION_START, 'i');

/**
 * A single criterion can describe several actions (for example, "login and
 * update profile"). Split only conjunctions that introduce another action so
 * field lists such as "email and password" remain one scenario.
 */
function splitCompoundCriterionActions(text: string): string[] {
  const firstAction = actionStart.exec(text);
  const parts = text.split(compoundActionBoundary).map((part) => part.trim()).filter(Boolean);
  if (!firstAction || firstAction.index === undefined || parts.length < 2) return [text];

  const subjectPrefix = text.slice(0, firstAction.index);
  return parts.map((part, index) => (index === 0 ? part : `${subjectPrefix}${part}`.trim()));
}

export function planScenariosFromAcceptanceCriteria(
  requirement: RequirementEntity,
  options: PlanScenariosOptions = {},
): PlannedScenario[] {
  const acText = getAcceptanceCriteriaFocusText(requirement);
  if (!acText) {
    return [
      {
        category: 'Positive',
        testCaseType: 'Positive',
        title: 'Execute the primary API flow with valid input',
        reason: 'No acceptance criteria text was provided.',
        priority: 'High',
        expectedHttpStatus: 200,
      },
    ];
  }

  const scenarios: PlannedScenario[] = [];
  const seen = new Set<string>();

  const add = (scenario: PlannedScenario) => {
    const key = dedupeKey(scenario);
    if (seen.has(key)) return;
    seen.add(key);
    scenarios.push(scenario);
  };

  const criteria = (requirement.acceptanceCriteria ?? [])
    .map((criterion) => ({ id: criterion.id, text: criterion.text.trim() }))
    .filter((criterion) => criterion.text.length > 0);
  const criteriaToPlan = criteria.length > 0
    ? criteria
    : [{ id: undefined, text: acText.trim() }];

  for (const criterion of criteriaToPlan) {
    for (const criterionText of splitCompoundCriterionActions(criterion.text)) {
      const criterionLower = criterionText.toLowerCase();
      const isAccountFlow = /(create|register|sign[\s-]?up|new account|account creation)/i.test(criterionLower);
      const isAuthFlow = /(log[\s-]?in|sign[\s-]?in|authenticate)/i.test(criterionLower);
      const fields = inferFieldsFromAcceptanceCriteria(criterionText, {
        flowKind: isAccountFlow ? 'account' : isAuthFlow ? 'auth' : 'generic',
        apiRequiredBodyKeys: options.apiRequiredBodyKeys,
        apiBodyKeys: options.apiBodyKeys,
      });
      const mentionsRegion = Boolean(fields.contextPhrase) ||
        /\b(region|market|locale|country|site|store|portal|platform|application)\b/i.test(criterionLower);
      const addForCriterion = (scenario: PlannedScenario) => add({
        ...scenario,
        acceptanceCriterionId: criterion.id,
      });

      if (isAccountFlow) {
        addAccountRegistrationScenarios(addForCriterion, fields, mentionsRegion, criterionLower);
      } else if (isAuthFlow) {
        addAuthScenarios(addForCriterion, fields);
      } else {
        addGenericScenarios(addForCriterion, criterionText, fields);
      }

      if (/password|reset|forgot/i.test(criterionLower) && !isAccountFlow) {
        addForCriterion({
          category: 'Positive',
          testCaseType: 'Positive',
          title: 'Initiate password reset with a registered email address',
          reason: 'Password reset flow from acceptance criteria.',
          priority: 'High',
          expectedHttpStatus: 200,
        });
      }
    }
  }

  return scenarios;
}
