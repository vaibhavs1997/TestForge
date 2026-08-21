import { JiraClient } from '../../infrastructure/jira/JiraClient.js';
import { ReportRepository } from '../../domain/report/ReportRepository.js';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository.js';
import type { ReportEntity } from '../../domain/report/ReportEntity.js';
import { sensitiveDataRedactor } from '../../infrastructure/security/SensitiveDataRedactionService.js';
import { defaultEvidenceGovernance } from '../../infrastructure/security/EvidenceGovernanceService.js';

export class PublishReportToJira {
  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly requirementRepository: RequirementRepository,
    private readonly jiraClient?: JiraClient,
  ) {}

  async execute(params: { reportId: string; issueKey?: string }): Promise<{ issueKey: string }> {
    const report = await this.reportRepository.findById(params.reportId);
    if (!report) {
      throw new Error(`Report with id ${params.reportId} not found`);
    }

    const requirementId = report.requirementIds?.[0];
    if (!requirementId) {
      throw new Error('Report is not linked to a requirement');
    }

    const requirement = await this.requirementRepository.findById(requirementId);
    const linkedKey = (requirement as { jiraIssueKey?: string | null })?.jiraIssueKey?.trim();
    const issueKey = (params.issueKey?.trim() || linkedKey || '').toUpperCase();

    if (!issueKey) {
      throw new Error('No Jira issue key on this requirement. Import from Jira or set jiraIssueKey.');
    }

    const client = this.jiraClient ?? new JiraClient();
    const message = formatReportComment(report, issueKey);
    await client.addComment(issueKey, message);

    return { issueKey };
  }
}

export function formatReportComment(report: ReportEntity, issueKey: string): string {
  const safeReport = defaultEvidenceGovernance.protect(sensitiveDataRedactor.redact(report), 'jira') as ReportEntity;
  const overview = safeReport.sections?.overview;
  const summary = safeReport.sections?.executionSummary;
  const appUrl = process.env.TESTFORGE_PUBLIC_URL?.trim();

  const lines = [
    `TestForge execution report (${report.overallStatus})`,
    `Issue: ${issueKey}`,
    `Report ID: ${report.id}`,
    overview?.title ? `Suite: ${overview.title}` : '',
    summary
      ? `Steps: ${summary.passedSteps}/${summary.totalSteps} passed, ${summary.failedSteps} failed, ${summary.skippedSteps} skipped (${summary.duration}ms)`
      : `Steps: ${report.passedSteps}/${report.totalSteps} passed`,
    appUrl ? `View in TestForge: ${appUrl}/projects/${report.projectId}/reports/${report.id}` : '',
    '',
    overview?.description ?? '',
  ].filter(Boolean);

  return lines.join('\n');
}

export default PublishReportToJira;
