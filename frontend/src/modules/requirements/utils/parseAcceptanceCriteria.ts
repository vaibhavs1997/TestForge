import type { AcceptanceCriterion } from '../types';

/** Turn pasted bullets / numbered lines into acceptance criteria. */
export function parseAcceptanceCriteriaText(text: string): AcceptanceCriterion[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => ({
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `ac-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    text: line.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, ''),
  }));
}
