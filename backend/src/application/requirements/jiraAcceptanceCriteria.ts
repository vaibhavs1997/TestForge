import { randomUUID } from 'node:crypto';
import type { AcceptanceCriterion } from '../../domain/requirements/RequirementEntity';

const BULLET_LINE = /^\s*(?:[-*•]|\d+[.)])\s+(.+)$/;

export function parseAcceptanceCriteriaFromText(text: string): AcceptanceCriterion[] {
  if (!text?.trim()) return [];

  const lines = text.split(/\r?\n/);
  const criteria: AcceptanceCriterion[] = [];

  for (const line of lines) {
    const match = line.match(BULLET_LINE);
    if (match?.[1]?.trim()) {
      criteria.push({ id: randomUUID(), text: match[1].trim() });
    }
  }

  if (criteria.length === 0) {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 10);
    for (const p of paragraphs.slice(0, 8)) {
      criteria.push({ id: randomUUID(), text: p.replace(/\s+/g, ' ') });
    }
  }

  return criteria;
}
