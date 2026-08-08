import type { RequirementEntity } from '../../domain/requirements/RequirementEntity';
import type { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';
import type { StrategyCategory } from '../../domain/requirements/TestStrategyEntity';
import { getAcceptanceCriteriaFocusText } from './requirementAcceptanceFocus';

const CREATE_HINTS = ['create', 'register', 'signup', 'sign-up', 'account', 'user'];
const READ_HINTS = ['get', 'list', 'fetch', 'read'];
const UPDATE_HINTS = ['update', 'patch', 'put', 'modify'];
const DELETE_HINTS = ['delete', 'remove'];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function requirementCorpus(requirement: RequirementEntity): string {
  return getAcceptanceCriteriaFocusText(requirement);
}

function scoreOperation(op: ApiOperationEntity, tokens: string[], corpus: string): number {
  const hay = `${op.name} ${op.path} ${op.method} ${op.description ?? ''}`.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (hay.includes(token)) score += 2;
  }
  if (CREATE_HINTS.some((h) => corpus.includes(h) && (hay.includes(h) || hay.includes('post')))) {
    if (op.method === 'POST') score += 5;
  }
  if (READ_HINTS.some((h) => corpus.includes(h)) && op.method === 'GET') score += 3;
  if (UPDATE_HINTS.some((h) => corpus.includes(h)) && (op.method === 'PUT' || op.method === 'PATCH')) score += 3;
  if (DELETE_HINTS.some((h) => corpus.includes(h)) && op.method === 'DELETE') score += 3;
  return score;
}

export interface OperationMatchScore {
  operation: ApiOperationEntity;
  score: number;
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
  const scored: OperationMatchScore[] = operations.map((operation) => ({
    operation,
    score: scoreOperation(operation, tokens, corpus),
  }));
  scored.sort((a, b) => b.score - a.score);

  const topScore = scored[0]?.score ?? 0;
  let ranked = scored;
  if (topScore === 0) {
    const post = operations.find((o) => o.method === 'POST');
    if (post) {
      const rest = scored.filter((s) => s.operation.id !== post.id);
      ranked = [{ operation: post, score: 0 }, ...rest];
    }
  }

  const secondScore = ranked[1]?.score ?? 0;
  const lowConfidence =
    topScore === 0 || (topScore > 0 && topScore < 4) || (topScore > 0 && topScore - secondScore < 2);

  return { ranked, lowConfidence };
}

/** 0–100 score aligned with lowConfidence heuristics for UI. */
export function mappingConfidencePercent(
  diagnostics: OperationMatchDiagnostics,
  operationsAvailable: number,
): number {
  if (operationsAvailable === 0) return 0;
  const topScore = diagnostics.ranked[0]?.score ?? 0;
  const secondScore = diagnostics.ranked[1]?.score ?? 0;
  const margin = topScore - secondScore;

  if (topScore === 0) {
    return diagnostics.lowConfidence ? 28 : 40;
  }

  let percent = 32 + topScore * 5 + Math.min(18, margin * 5);
  if (diagnostics.lowConfidence) {
    percent = Math.min(percent, 48);
  } else {
    percent = Math.max(percent, 72);
  }
  return Math.round(Math.min(100, Math.max(0, percent)));
}

export function rankOperationsForRequirement(
  requirement: RequirementEntity,
  operations: ApiOperationEntity[],
): ApiOperationEntity[] {
  return getOperationMatchDiagnostics(requirement, operations).ranked.map((entry) => entry.operation);
}

export function pickOperationForCategory(
  requirement: RequirementEntity,
  operations: ApiOperationEntity[],
  category: StrategyCategory,
): string {
  const ranked = rankOperationsForRequirement(requirement, operations);
  if (ranked.length === 0) return '';

  switch (category) {
    case 'Negative':
    case 'Validation':
      return ranked.find((o) => o.method === 'POST' || o.method === 'PUT' || o.method === 'PATCH')?.id ?? ranked[0].id;
    case 'Security':
      return ranked.find((o) => o.authenticationType && o.authenticationType !== 'None')?.id ?? ranked[0].id;
    case 'Positive':
    case 'Boundary':
    case 'Business Rules':
      return ranked.find((o) => o.method === 'POST')?.id ?? ranked[0].id;
    default:
      return ranked[0].id;
  }
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

function applyScenarioFocus(
  body: Record<string, unknown>,
  scenario?: { focusFieldId?: string; scenarioKind?: string },
): Record<string, unknown> {
  if (!scenario?.focusFieldId) return body;
  const key = bodyKeyForFieldId(scenario.focusFieldId);
  const next = { ...body };
  if (scenario.scenarioKind === 'missing_field') {
    delete next[key];
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
        const base = { ...body };
        if (scenario.focusFieldId === 'email' && 'email' in base) base.email = 'not-an-email';
        else if (scenario.focusFieldId === 'password' && 'password' in base) base.password = 'x';
        else return applyScenarioFocus(base, scenario);
        return base;
      }
      if ('email' in body) body.email = 'not-an-email';
      if ('password' in body) body.password = 'x';
      const stringKey = Object.keys(body).find(
        (k) => typeof body[k] === 'string' && k !== 'email' && k !== 'password',
      );
      if (stringKey) body[stringKey] = '';
      if (!('email' in body) && !('password' in body)) {
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
