import type { AcceptanceCriterion } from '../../domain/requirements/RequirementEntity';

/** Text used for matching APIs and AI prompts — acceptance criteria only, with description fallback. */
export function getAcceptanceCriteriaFocusText(requirement: {
  acceptanceCriteria?: AcceptanceCriterion[] | unknown[];
  description?: string;
}): string {
  const raw = requirement.acceptanceCriteria ?? [];
  const lines = raw
    .map((c) => {
      if (typeof c === 'string') return c.trim();
      if (c && typeof c === 'object' && 'text' in c) {
        const text = (c as AcceptanceCriterion).text;
        return typeof text === 'string' ? text.trim() : '';
      }
      return '';
    })
    .filter(Boolean);
  if (lines.length > 0) {
    return lines.join('\n');
  }
  return (requirement.description ?? '').trim();
}

/** Slim requirement payload for LLM prompts (no title — tests derive from acceptance criteria). */
export function toRequirementPromptPayload(requirement: {
  id: string;
  acceptanceCriteria?: AcceptanceCriterion[];
  description?: string;
}): { id: string; acceptanceCriteria: { id: string; text: string }[] } {
  const acceptanceCriteria =
    requirement.acceptanceCriteria
      ?.map((c) => ({ id: c.id, text: c.text.trim() }))
      .filter((c) => c.text.length > 0) ?? [];

  if (acceptanceCriteria.length > 0) {
    return { id: requirement.id, acceptanceCriteria };
  }

  const fallback = (requirement.description ?? '').trim();
  return {
    id: requirement.id,
    acceptanceCriteria: fallback ? [{ id: 'description-fallback', text: fallback }] : [],
  };
}
