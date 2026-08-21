import { describe, expect, it } from 'vitest';
import { formatReportComment } from './PublishReportToJira.js';

describe('formatReportComment', () => {
  it('does not publish sensitive report evidence to Jira', () => {
    const comment = formatReportComment({
      id: 'report-1', projectId: 'project-1', overallStatus: 'Passed', passedSteps: 1, totalSteps: 1,
      sections: { overview: { title: 'API', description: 'authorization=Bearer secret-token' } },
    } as any, 'TEST-1');
    expect(comment).toContain('[REDACTED]');
    expect(comment).not.toContain('secret-token');
  });
});
