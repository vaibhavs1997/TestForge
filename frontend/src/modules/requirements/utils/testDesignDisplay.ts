import type { TestDesign } from '../types';

export type TestCaseType = 'Positive' | 'Negative' | 'Security';

export function getExpectedHttpStatus(design: TestDesign): number | undefined {
  if (typeof design.expectedHttpStatus === 'number') {
    return design.expectedHttpStatus;
  }
  const statusAssertion = design.assertions?.find((a) => a.type === 'status');
  if (statusAssertion && typeof statusAssertion.expected === 'number') {
    return statusAssertion.expected;
  }
  return undefined;
}

export function getTestCaseType(design: TestDesign): TestCaseType {
  if (design.testCaseType) {
    return design.testCaseType;
  }
  const status = getExpectedHttpStatus(design);
  if (status === 401 || status === 403) return 'Security';
  if (status !== undefined && status >= 400) return 'Negative';
  return 'Positive';
}

export function getTestCaseTypeBadgeClass(testCaseType: TestCaseType): string {
  switch (testCaseType) {
    case 'Positive':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'Negative':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'Security':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  }
}
