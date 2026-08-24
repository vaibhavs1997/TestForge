import { describe, expect, it } from 'vitest';
import { createSafeHtmlReport } from './safeHtmlReport';
import type { Report } from '../types';

const hostile = '<script>window.pwned=true</script><img src=x onerror="window.pwned=true">';

function makeReport(): Report {
  return {
    id: 'report-1', projectId: 'project-1', executionRunId: 'run-1', suiteId: null, requirementIds: [], generatedAt: 0,
    generatedBy: hostile, overallStatus: 'Failed', executionDuration: 0, totalSteps: 1, passedSteps: 0, failedSteps: 1,
    skippedSteps: 0, validationSummary: { total: 1, passed: 0, failed: 1, warnings: 0 },
    recommendationSummary: { total: 0, high: 0, medium: 0, low: 0 },
    environment: { environmentId: 'env-1', baseUrl: hostile, name: hostile }, reportVersion: '1',
    sections: {
      overview: { title: hostile, description: '<img onerror=alert(1)>API response</img>', generatedAt: 0, overallStatus: 'Failed' },
      executionSummary: { totalSteps: 1, passedSteps: 0, failedSteps: 1, skippedSteps: 0, duration: 0, status: 'Failed' },
      requirementsCovered: [], executionPlansExecuted: [],
      stepResults: [{ name: hostile, request: { body: hostile }, response: { body: hostile }, error: hostile }],
      validationResults: [], recommendations: [], environmentInfo: { environmentId: 'env-1', baseUrl: hostile, name: hostile },
      runtimeVariablesCaptured: { response: hostile }, failures: [{ message: hostile }], executionTimeline: [],
    },
  };
}

describe('createSafeHtmlReport', () => {
  it('renders hostile report values as text rather than executable markup', () => {
    const html = createSafeHtmlReport(makeReport());
    expect(html).toContain("Content-Security-Policy");
    expect(html).toContain("script-src 'none'");
    expect(html).toContain('&lt;script&gt;window.pwned=true&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=&quot;window.pwned=true&quot;&gt;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain(escapeForExpectation(hostile));
  });
});

function escapeForExpectation(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
