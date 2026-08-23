import type { Requirement, TestDesign } from '../types';

/** Human-readable label for a test design (title is generated from acceptance criteria, not the requirement title). */
export function getTestCaseLabel(
  design: TestDesign,
  _requirementTitle: string,
  index: number,
): string {
  if (design.title?.trim()) {
    return design.title.trim();
  }

  const statusAssertion = design.assertions?.find((a) => a.type === 'status');
  const scenario = inferScenario(design);

  if (statusAssertion) {
    return `${scenario} (expect HTTP ${statusAssertion.expected})`;
  }

  return `Test case ${index + 1}: ${scenario}`;
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

