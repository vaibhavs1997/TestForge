// GenerateReport - Application Use Case for Reporting Module
// Generates a report from a completed Execution Run.
// Reuses existing execution and validation results. Does NOT recompute execution.
import { randomUUID } from 'node:crypto';
import { ReportEntity, ReportStatus, ReportSection, ReportValidationSummary, ReportRecommendationSummary, ReportEnvironment } from '../../domain/report/ReportEntity';
import { ReportRepository } from '../../domain/report/ReportRepository';
import { ExecutionRunRepository } from '../../domain/execution/ExecutionRunRepository';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository';
import { RecommendationEngine } from '../recommendation/RecommendationEngine';
import { EventPublisher } from '../EventPublisher';

const REPORT_VERSION = '1.0.0';

// Sensitive variable name patterns to mask
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
];

export class GenerateReport {
  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly executionRunRepository: ExecutionRunRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly recommendationEngine: RecommendationEngine,
    private readonly eventPublisher?: EventPublisher
  ) {}

  async generate(executionRunId: string, suiteId?: string | null): Promise<ReportEntity> {
    // 1. Fetch the execution run
    const run = await this.executionRunRepository.findById(executionRunId);
    if (!run) {
      throw new Error(`Execution Run with id ${executionRunId} not found`);
    }

    // 2. Verify execution is completed
    if (run.status !== 'Completed' && run.status !== 'Failed') {
      throw new Error(`Execution Run must be completed or failed to generate a report. Current status: ${run.status}`);
    }

    // 3. Check if a report already exists for this execution run
    const existingReport = await this.reportRepository.findByExecutionRun(executionRunId);
    if (existingReport) {
      return existingReport;
    }

    // 4. Fetch environment info
    const environments = await this.environmentRepository.findByProject(run.projectId);
    const environment = environments.find(e => e.id === run.context.environmentId) || environments[0];
    const reportEnvironment: ReportEnvironment = {
      environmentId: run.context.environmentId,
      baseUrl: run.context.baseUrl,
      name: environment?.name || 'Unknown',
    };

    // 5. Fetch recommendations for the project
    let recommendations: any[] = [];
    try {
      recommendations = await this.recommendationEngine.analyzeProject(run.projectId);
    } catch {
      // Recommendations are optional; continue without them
      recommendations = [];
    }

    // 6. Build report sections from execution run data (reuse, do NOT recompute)
    const stepResults = run.stepResults || [];
    const validationResults = this.extractValidationResults(stepResults);
    const failures = stepResults.filter((s: any) => s.status === 'Failed');
    const executionTimeline = [...stepResults].sort((a, b) => a.startedAt - b.startedAt);
    const runtimeVariablesCaptured = this.maskSensitiveVariables(run.context.runtimeVariables || {});

    // 7. Calculate summaries
    const validationSummary: ReportValidationSummary = {
      total: validationResults.length,
      passed: validationResults.filter(v => v.status === 'Passed').length,
      failed: validationResults.filter(v => v.status === 'Failed').length,
      warnings: validationResults.filter(v => v.status === 'Warning').length,
    };

    const recommendationSummary: ReportRecommendationSummary = {
      total: recommendations.length,
      high: recommendations.filter(r => r.priority === 'High').length,
      medium: recommendations.filter(r => r.priority === 'Medium').length,
      low: recommendations.filter(r => r.priority === 'Low').length,
    };

    // 8. Determine overall status
    const overallStatus: ReportStatus = this.determineOverallStatus(run, validationSummary);

    // 9. Build report sections
    const sections: ReportSection = {
      overview: {
        title: `Test Report - ${run.executionPlanId}`,
        description: `Report generated from execution run ${run.id} for project ${run.projectId}`,
        generatedAt: Date.now(),
        overallStatus,
      },
      executionSummary: {
        totalSteps: run.summary.totalSteps,
        passedSteps: run.summary.passed,
        failedSteps: run.summary.failed,
        skippedSteps: run.summary.skipped,
        blockedSteps: run.summary.blocked,
        duration: run.summary.duration,
        status: run.status,
      },
      requirementsCovered: [run.requirementId],
      executionPlansExecuted: run.executionPlanIds?.length ? run.executionPlanIds : [run.executionPlanId],
      dependencyGraph: run.dependencyGraph || [],
      stepResults,
      validationResults,
      recommendations,
      environmentInfo: reportEnvironment,
      runtimeVariablesCaptured,
      failures,
      executionTimeline,
    };

    // 10. Create report entity
    const now = Date.now();
    const report = new ReportEntity(
      randomUUID(),
      run.projectId,
      run.id,
      run.suiteId || suiteId || null,
      [run.requirementId],
      now,
      'System',
      overallStatus,
      run.summary.duration,
      run.summary.totalSteps,
      run.summary.passed,
      run.summary.failed,
      run.summary.skipped,
      validationSummary,
      recommendationSummary,
      reportEnvironment,
      REPORT_VERSION,
      sections,
      run.summary.blocked
    );

    // 11. Persist report
    const createdReport = await this.reportRepository.create(report);

    // Publish through central EventPublisher — triggers audit, notification,
    // cache invalidation, recommendation refresh, and pipeline refresh.
    if (this.eventPublisher) {
      await this.eventPublisher.generated('report', createdReport.id, createdReport.projectId, 'Report', createdReport as any);
    }

    return createdReport;
  }

  private extractValidationResults(stepResults: any[]): any[] {
    const results: any[] = [];
    for (const step of stepResults) {
      if (step.validations) {
        results.push(...step.validations);
      }
    }
    return results;
  }

  private maskSensitiveVariables(variables: Record<string, any>): Record<string, any> {
    const masked: Record<string, any> = {};
    for (const [key, value] of Object.entries(variables)) {
      if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
        masked[key] = '********';
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  private determineOverallStatus(run: any, validationSummary: ReportValidationSummary): ReportStatus {
    if (run.status === 'Failed' && run.summary.failed > 0) {
      return 'Failed';
    }
    if (validationSummary.failed > 0) {
      return 'Partial';
    }
    if (run.summary.skipped > 0) {
      return 'Partial';
    }
    return 'Passed';
  }
}

export default GenerateReport;
