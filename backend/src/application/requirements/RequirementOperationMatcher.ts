import type { RequirementEntity } from '../../domain/requirements/RequirementEntity';
import type { ApiOperationEntity } from '../../domain/api/ApiOperationEntity';
import type { StrategyCategory } from '../../domain/requirements/TestStrategyEntity';

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
  const ac = requirement.acceptanceCriteria?.map((c) => c.text).join(' ') ?? '';
  return `${requirement.title} ${requirement.description ?? ''} ${ac}`;
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

export function rankOperationsForRequirement(
  requirement: RequirementEntity,
  operations: ApiOperationEntity[],
): ApiOperationEntity[] {
  if (operations.length === 0) return [];
  const corpus = requirementCorpus(requirement).toLowerCase();
  const tokens = tokenize(corpus);
  const ranked = [...operations].sort((a, b) => scoreOperation(b, tokens, corpus) - scoreOperation(a, tokens, corpus));
  const topScore = scoreOperation(ranked[0], tokens, corpus);
  if (topScore === 0) {
    const post = operations.find((o) => o.method === 'POST');
    return post ? [post, ...operations.filter((o) => o.id !== post.id)] : operations;
  }
  return ranked;
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
): Record<string, unknown> {
  const sample = operation?.sampleRequestBody;
  if (sample && typeof sample === 'object' && !Array.isArray(sample) && Object.keys(sample).length > 0) {
    return mutateSampleForCategory(category, { ...sample });
  }

  const path = (operation?.path ?? '').toLowerCase();
  const accountLike = path.includes('account') || path.includes('user') || path.includes('register');

  switch (category) {
    case 'Negative':
    case 'Validation':
      if (accountLike) {
        return { email: 'not-an-email', password: 'short', firstName: '', lastName: '' };
      }
      return { invalid: true };
    case 'Security':
      return {};
    case 'Boundary':
      if (accountLike) {
        return {
          email: `${'a'.repeat(200)}@example.com`,
          password: 'ValidPass123!',
          firstName: 'A',
          lastName: 'B',
        };
      }
      return { boundary: true };
    case 'Positive':
    default:
      if (accountLike) {
        return {
          email: `testforge.${Date.now()}@example.com`,
          password: 'ValidPass123!',
          firstName: 'Test',
          lastName: 'Forge',
        };
      }
      return {};
  }
}

function mutateSampleForCategory(
  category: StrategyCategory,
  body: Record<string, unknown>,
): Record<string, unknown> {
  switch (category) {
    case 'Negative':
    case 'Validation': {
      if ('email' in body) body.email = 'not-an-email';
      if ('password' in body) body.password = 'x';
      const stringKey = Object.keys(body).find((k) => typeof body[k] === 'string');
      if (stringKey) body[stringKey] = '';
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
