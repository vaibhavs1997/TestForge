import type { RequirementEntity } from '../../domain/requirements/RequirementEntity';
import type { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';
import type { StrategyCategory } from '../../domain/requirements/TestStrategyEntity';
import { getAcceptanceCriteriaFocusText } from './requirementAcceptanceFocus';
import { expandRequirementWithSynonyms, expandOperationWithSynonyms, getSynonymReasoning } from './OperationMappingSynonyms';

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
  return `${expandedBase}${knowledgeContext}`;
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
  if (CREATE_HINTS.some((h) => corpus.includes(h) && (hay.includes(h) || hay.includes('post')))) {
    if (op.method === 'POST') {
      score += 5;
      reasons.push(`Requirement suggests "create" action and operation is POST (+5)`);
    }
  }
  if (READ_HINTS.some((h) => corpus.includes(h)) && op.method === 'GET') {
    score += 3;
    reasons.push(`Requirement suggests "read" action and operation is GET (+3)`);
  }
  if (UPDATE_HINTS.some((h) => corpus.includes(h)) && (op.method === 'PUT' || op.method === 'PATCH')) {
    score += 3;
    reasons.push(`Requirement suggests "update" action and operation is ${op.method} (+3)`);
  }
  if (DELETE_HINTS.some((h) => corpus.includes(h)) && op.method === 'DELETE') {
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
  let ranked = scored;
    if (topScore === 0) {
      const post = operations.find((o) => o.method === 'POST');
      if (post) {
        const rest = scored.filter((s) => s.operation.id !== post.id);
        ranked = [{ operation: post, score: 0, reasons: ['No text match found; fallback to POST'] }, ...rest];
      }
    }

  const secondScore = ranked[1]?.score ?? 0;
  const lowConfidence =
    topScore === 0 || (topScore > 0 && topScore < 4) || (topScore > 0 && topScore - secondScore < 2);

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
 * Pick the best operation for a test category with validation.
 * Throws if no suitable operation exists for the category.
 */
export function pickOperationForCategory(
  requirement: RequirementEntity,
  operations: ApiOperationEntity[],
  category: StrategyCategory,
): string {
  const ranked = rankOperationsForRequirement(requirement, operations);
  if (ranked.length === 0) {
    throw new Error(`No API operations available for requirement "${requirement.title}"`);
  }

  let selected: ApiOperationEntity | undefined;

  switch (category) {
    case 'Negative':
    case 'Validation':
      selected = ranked.find((o) => o.method === 'POST' || o.method === 'PUT' || o.method === 'PATCH');
      if (!selected) {
        // Fallback: any non-GET method
        selected = ranked.find((o) => o.method !== 'GET') ?? ranked[0];
      }
      break;
    case 'Security':
      selected = ranked.find((o) => o.authenticationType && o.authenticationType !== 'None');
      if (!selected) {
        throw new Error(
          `No authenticated API operation found for Security test on requirement "${requirement.title}". ` +
          `Expected an operation with authentication (Bearer, Basic, API Key, OAuth).`,
        );
      }
      break;
    case 'Positive':
    case 'Boundary':
    case 'Business Rules':
      selected = ranked.find((o) => o.method === 'POST');
      if (!selected) {
        // For non-POST operations, warn but allow (e.g., GET for read-only positive tests)
        selected = ranked.find((o) => o.method === 'GET') ?? ranked[0];
      }
      break;
    default:
      selected = ranked[0];
  }

  if (!selected) {
    throw new Error(`Could not select an API operation for category "${category}" on requirement "${requirement.title}"`);
  }

  return selected.id;
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
