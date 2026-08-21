import type { RequirementEntity } from '../../domain/requirements/RequirementEntity';
import type { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';
import type { StrategyCategory } from '../../domain/requirements/TestStrategyEntity';
import { getAcceptanceCriteriaFocusText } from './requirementAcceptanceFocus';
import { expandRequirementWithSynonyms, expandOperationWithSynonyms, getSynonymReasoning } from './OperationMappingSynonyms';

const CREATE_HINTS = ['create', 'register', 'signup', 'sign-up', 'registration', 'enroll', 'onboard'];
const READ_HINTS = ['get', 'list', 'fetch', 'read'];
const UPDATE_HINTS = ['update', 'patch', 'put', 'modify'];
const DELETE_HINTS = ['delete', 'remove'];
const AUTH_HINTS = ['login', 'log in', 'sign in', 'signin', 'authenticate', 'auth'];

const RESET_TERMS = ['forgot password', 'reset password', 'password reset', 'forgotten password'];
const RECOVERY_TERMS = ['reset', 'recover', 'recovery', 'forgot', 'forgotten', 'unlock'];
const REGISTRATION_TERMS = ['register', 'registration', 'signup', 'sign up', 'create account', 'new user', 'user creation'];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function requirementCorpus(requirement: RequirementEntity): string {
  const base = getAcceptanceCriteriaFocusText(requirement);
  // Include knowledge flow names and business rule context if available
  const knowledgeParts: string[] = [];
  if (requirement.relatedFlows && requirement.relatedFlows.length > 0) {
    knowledgeParts.push(`flows: ${requirement.relatedFlows.join(',')}`);
  }
  if ((requirement as any).relatedBusinessRules && (requirement as any).relatedBusinessRules.length > 0) {
    knowledgeParts.push(`rules: ${(requirement as any).relatedBusinessRules.join(',')}`);
  }
  if ((requirement as any).relatedRuntimeVariables && (requirement as any).relatedRuntimeVariables.length > 0) {
    knowledgeParts.push(`variables: ${(requirement as any).relatedRuntimeVariables.join(',')}`);
  }
  // Expand with synonyms to bridge terminology gaps
  const expandedBase = expandRequirementWithSynonyms(requirement);
  const knowledgeContext = knowledgeParts.length > 0 ? ` ${knowledgeParts.join(' ')}` : '';
  // Synonym expansion currently uses title/description. Keep the normalized
  // acceptance-criteria focus in the corpus so the actual requested behavior
  // can drive mapping when the title is generic or Jira-derived.
  return `${expandedBase} ${base}${knowledgeContext}`;
}

function containsTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

function scoreOperation(op: ApiOperationEntity, tokens: string[], corpus: string): { score: number; reasons: string[] } {
  const expandedOpText = expandOperationWithSynonyms(op);
  const hay = expandedOpText.toLowerCase();
  let score = 0;
  const reasons: string[] = [];
  for (const token of tokens) {
    if (hay.includes(token)) {
      score += 2;
      reasons.push(`Matched "${token}" in operation name/path/description`);
    }
  }
  // Add synonym-based reasoning
  const synonymReasons = getSynonymReasoning(op as any, op);
  reasons.push(...synonymReasons);
  const requirementIsRegistration = REGISTRATION_TERMS.some((term) => containsTerm(corpus, term));
  const requirementIsRecovery = RECOVERY_TERMS.some((term) => containsTerm(corpus, term));
  const operationIsReset = RESET_TERMS.some((term) => containsTerm(hay, term)) || /forgot|reset/.test(hay);
  const operationIsRecovery = RECOVERY_TERMS.some((term) => containsTerm(hay, term));
  const operationIsAuthentication = AUTH_HINTS.some((term) => containsTerm(hay, term));
  const operationIsRegistration = REGISTRATION_TERMS.some((term) => containsTerm(hay, term));

  if (requirementIsRegistration && operationIsReset && !RESET_TERMS.some((term) => containsTerm(corpus, term))) {
    score -= 8;
    reasons.push('Rejected password-reset semantics for a registration requirement (-8)');
  }
  if (requirementIsRegistration && operationIsRegistration) {
    score += 6;
    reasons.push('Registration intent matches operation semantics (+6)');
  }
  if (requirementIsRecovery && operationIsRecovery) {
    score += 6;
    reasons.push('Recovery intent matches operation semantics (+6)');
  }
  if (requirementIsRecovery && operationIsAuthentication && !operationIsRecovery) {
    score -= 16;
    reasons.push('Rejected authentication semantics for a recovery requirement (-16)');
  }
  // HTTP method alone is not enough to identify the business operation. A
  // password-reset POST must not win for a registration requirement simply
  // because both actions use POST.
  if (CREATE_HINTS.some((h) => containsTerm(corpus, h) && containsTerm(hay, h))) {
    if (op.method === 'POST') {
      score += 5;
      reasons.push(`Requirement suggests "create" action and operation is POST (+5)`);
    }
  }
  if (READ_HINTS.some((h) => containsTerm(corpus, h)) && op.method === 'GET') {
    score += 3;
    reasons.push(`Requirement suggests "read" action and operation is GET (+3)`);
  }
  if (UPDATE_HINTS.some((h) => containsTerm(corpus, h)) && (op.method === 'PUT' || op.method === 'PATCH')) {
    score += 3;
    reasons.push(`Requirement suggests "update" action and operation is ${op.method} (+3)`);
  }
  if (DELETE_HINTS.some((h) => containsTerm(corpus, h)) && op.method === 'DELETE') {
    score += 3;
    reasons.push(`Requirement suggests "delete" action and operation is DELETE (+3)`);
  }
  return { score, reasons };
}

export interface OperationMatchScore {
  operation: ApiOperationEntity;
  score: number;
  reasons: string[];
}

export interface OperationMatchDiagnostics {
  ranked: OperationMatchScore[];
  lowConfidence: boolean;
}

export function getOperationMatchDiagnostics(
  requirement: RequirementEntity,
  operations: ApiOperationEntity[],
): OperationMatchDiagnostics {
  if (operations.length === 0) {
    return { ranked: [], lowConfidence: true };
  }
  const corpus = requirementCorpus(requirement).toLowerCase();
  const tokens = tokenize(corpus);
  const scored: OperationMatchScore[] = operations.map((operation) => {
    const { score, reasons } = scoreOperation(operation, tokens, corpus);
    return { operation, score, reasons };
  });
  scored.sort((a, b) => b.score - a.score);

  const topScore = scored[0]?.score ?? 0;
  const ranked = scored;

  const secondScore = ranked[1]?.score ?? 0;
  const strongIntentMatch = Boolean(
    scored[0]?.reasons.some((reason) => reason.includes('intent matches operation semantics')) && topScore >= 8,
  );
  const lowConfidence = !strongIntentMatch &&
    (topScore === 0 || (topScore > 0 && topScore < 4) || (topScore > 0 && topScore - secondScore < 2));

  return { ranked, lowConfidence };
}

/** Calibrated confidence percentage based on actual match quality indicators. */
export function mappingConfidencePercent(
  diagnostics: OperationMatchDiagnostics,
  operationsAvailable: number,
): number {
  if (operationsAvailable === 0) return 0;
  const top = diagnostics.ranked[0];
  if (!top) return 0;

  const topScore = top.score;
  const secondScore = diagnostics.ranked[1]?.score ?? 0;
  const margin = topScore - secondScore;
  const reasonCount = top.reasons.length;
  const strongIntentMatch = top.reasons.some((reason) => reason.includes('intent matches operation semantics')) && topScore >= 8;

  if (strongIntentMatch) {
    return Math.round(Math.min(95, 78 + Math.max(0, margin) * 3));
  }

  // Base score from match quality
  let percent = 0;

  if (topScore === 0) {
    // No semantic match at all — very low confidence
    percent = diagnostics.lowConfidence ? 22 : 35;
  } else if (reasonCount === 0) {
    // Has score but no specific reasons (shouldn't happen, but guard)
    percent = 40;
  } else {
    // Good semantic match
    percent = 45 + topScore * 4 + Math.min(20, margin * 4);
  }

  // Penalty for low confidence heuristics
  if (diagnostics.lowConfidence) {
    percent = Math.min(percent, 52);
  } else {
    // Bonus for strong, well-reasoned matches
    percent = Math.max(percent, reasonCount >= 3 ? 78 : 65);
  }

  return Math.round(Math.min(100, Math.max(0, percent)));
}

export function rankOperationsForRequirement(
  requirement: RequirementEntity,
  operations: ApiOperationEntity[],
): ApiOperationEntity[] {
  return getOperationMatchDiagnostics(requirement, operations).ranked.map((entry) => entry.operation);
}

/**
 * Pick the best available operation for a test category.
 *
 * Mapping confidence is advisory: generation must remain usable so reviewers
 * can inspect and correct the suggested operation in the UI. An empty string
 * is returned when a project has no imported operations yet.
 */
export function pickOperationForCategory(
  requirement: RequirementEntity,
  operations: ApiOperationEntity[],
  category: StrategyCategory,
): string {
  const ranked = rankOperationsForRequirement(requirement, operations);
  if (ranked.length === 0) return '';

  const diagnostics = getOperationMatchDiagnostics(requirement, operations);
  const topMatch = diagnostics.ranked[0];
  let selected: ApiOperationEntity | undefined = topMatch?.operation;

  if (category === 'Security') {
    const topIsAuthenticated = Boolean(
      topMatch?.operation.authenticationType && topMatch.operation.authenticationType !== 'None',
    );
    if (!topIsAuthenticated && selected) selected = topMatch.operation;
  }

  return selected?.id ?? '';
}

export function buildPayloadForScenario(
  category: StrategyCategory,
  operation?: ApiOperationEntity | null,
  scenario?: {
    focusFieldId?: string;
    scenarioKind?: 'missing_field' | 'invalid_field' | 'duplicate' | 'default';
  },
): Record<string, unknown> {
  const sample = operation?.sampleRequestBody;
  let body: Record<string, unknown>;
  if (sample && typeof sample === 'object' && !Array.isArray(sample) && Object.keys(sample).length > 0) {
    body = mutateSampleForCategory(category, { ...sample }, scenario);
  } else {
    const path = (operation?.path ?? '').toLowerCase();
    const accountLike = path.includes('account') || path.includes('user') || path.includes('register');

    switch (category) {
      case 'Negative':
      case 'Validation':
        if (accountLike) {
          body = { email: 'not-an-email', password: 'short', firstName: '', lastName: '' };
        } else {
          body = { invalid: true };
        }
        break;
      case 'Security':
        body = {};
        break;
      case 'Boundary':
        if (accountLike) {
          body = {
            email: `${'a'.repeat(200)}@example.com`,
            password: 'ValidPass123!',
            firstName: 'A',
            lastName: 'B',
          };
        } else {
          body = { boundary: true };
        }
        break;
      case 'Positive':
      default:
        if (accountLike) {
          body = {
            email: `testforge.${Date.now()}@example.com`,
            password: 'ValidPass123!',
            firstName: 'Test',
            lastName: 'Forge',
          };
        } else {
          body = {};
        }
    }
    body = applyScenarioFocus(body, scenario);
  }

  return body;
}

function bodyKeyForFieldId(fieldId: string): string {
  const map: Record<string, string> = {
    email: 'email',
    password: 'password',
    username: 'username',
    phone: 'phone',
    firstName: 'firstName',
    lastName: 'lastName',
    country: 'country',
    region: 'region',
    postalCode: 'postalCode',
    dateOfBirth: 'dateOfBirth',
  };
  return map[fieldId] ?? fieldId;
}

function bodyFieldKind(key: string): 'email' | 'password' | null {
  const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (normalized.includes('password') || normalized === 'pass') return 'password';
  if (normalized.includes('email') || normalized.includes('username')) return 'email';
  return null;
}

function applyScenarioFocus(
  body: Record<string, unknown>,
  scenario?: { focusFieldId?: string; scenarioKind?: string },
): Record<string, unknown> {
  if (!scenario?.focusFieldId) return body;
  const genericKey = bodyKeyForFieldId(scenario.focusFieldId);
  const key = Object.keys(body).find((candidate) =>
    bodyFieldKind(candidate) === scenario.focusFieldId || candidate === genericKey,
  ) || genericKey;
  const next = { ...body };
  if (scenario.scenarioKind === 'missing_field') {
    // Preserve the contract shape in the report while making the targeted
    // value empty. The API can then apply its normal required-field
    // validation and return the expected status for this scenario.
    next[key] = '';
    return next;
  }
  if (scenario.scenarioKind === 'invalid_field') {
    if (scenario.focusFieldId === 'email') next[key] = 'not-an-email';
    else if (scenario.focusFieldId === 'password') next[key] = 'x';
    else if (key in next && typeof next[key] === 'string') next[key] = '';
    return next;
  }
  return next;
}

function mutateSampleForCategory(
  category: StrategyCategory,
  body: Record<string, unknown>,
  scenario?: { focusFieldId?: string; scenarioKind?: string },
): Record<string, unknown> {
  switch (category) {
    case 'Negative':
    case 'Validation': {
      if (scenario?.scenarioKind === 'missing_field' && scenario.focusFieldId) {
        return applyScenarioFocus({ ...body }, scenario);
      }
      if (scenario?.scenarioKind === 'invalid_field' && scenario.focusFieldId) {
        return applyScenarioFocus({ ...body }, scenario);
      }
      // For an unspecified negative scenario, mutate a credential field when
      // one is present; otherwise use the first textual field generically.
      const passwordKey = Object.keys(body).find((key) => bodyFieldKind(key) === 'password');
      if (passwordKey) body[passwordKey] = 'WrongPassword123!';
      const hasCredentialFields = Object.keys(body).some((key) => bodyFieldKind(key) !== null);
      if (!hasCredentialFields) {
        const firstKey = Object.keys(body).find((k) => typeof body[k] === 'string');
        if (firstKey) body[firstKey] = '';
      }
      return body;
    }
    case 'Security':
      return {};
    case 'Boundary': {
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string' && value.length < 200) {
          body[key] = `${'x'.repeat(200)}${value}`;
        }
      }
      return body;
    }
    case 'Positive':
    default: {
      if ('email' in body && typeof body.email === 'string') {
        body.email = `testforge.${Date.now()}@example.com`;
      }
      return body;
    }
  }
}
