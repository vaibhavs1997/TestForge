import type { Requirement, TestDesign } from '../types';

/** Human-readable label for a test design (new designs store `title` on the entity). */
export function getTestCaseLabel(
  design: TestDesign,
  requirementTitle: string,
  index: number,
): string {
  if (design.title?.trim()) {
    return design.title.trim();
  }

  const statusAssertion = design.assertions?.find((a) => a.type === 'status');
  const scenario = inferScenario(design);

  if (statusAssertion) {
    return `Verify ${requirementTitle} — ${scenario} (expect HTTP ${statusAssertion.expected})`;
  }

  return `Test case ${index + 1}: ${requirementTitle} (${scenario})`;
}

function inferScenario(design: TestDesign): string {
  const body = design.requestOverrides?.body;
  if (body && typeof body === 'object' && (body as { invalid?: boolean }).invalid) {
    return 'invalid inputs';
  }
  if (design.requestOverrides?.headers?.Authorization) {
    return 'unauthorized or invalid credentials';
  }
  if (body && typeof body === 'object' && (body as { boundary?: boolean }).boundary) {
    return 'boundary values';
  }
  return 'happy path';
}

export function getRequirementReviewDisplay(requirement: Requirement) {
  const normalize = (value: string) => value.trim().toLowerCase();
  const title = requirement.title.trim();
  const description = requirement.description?.trim() ?? '';
  const showDescription = description.length > 0 && normalize(description) !== normalize(title);

  const criteria = requirement.acceptanceCriteria.filter((ac) => {
    const text = ac.text.trim();
    if (!text) return false;
    const n = normalize(text);
    if (n === normalize(title)) return false;
    if (showDescription && n === normalize(description)) return false;
    if (!showDescription && description && n === normalize(description)) return false;
    return true;
  });

  return { showDescription, description, criteria };
}
