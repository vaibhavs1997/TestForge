import type { AcceptanceCriterion } from '../types';

function createCriterion(text: string): AcceptanceCriterion {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `ac-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    text,
  };
}

/**
 * Turn pasted bullets, numbered lines, and sentence-separated paragraphs into
 * individual acceptance criteria. A paragraph is common when copied from a
 * ticket, so each complete sentence is independently planned.
 */
export function parseAcceptanceCriteriaText(text: string): AcceptanceCriterion[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.flatMap((line) => line
    .replace(/^[\s*\-\u2022]+/, '')
    .replace(/^\d+[.)]\s*/, '')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map(createCriterion));
}
