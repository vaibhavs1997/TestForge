// ExecutePlan - Execution Engine
// Executes an existing Execution Plan. Does NOT generate plans or reports.
// For every execution step: Resolve Environment → Resolve Dataset Values →
// Resolve Runtime Variables → Apply Request Overrides → Execute HTTP Request →
// Validate Assertions → Capture Runtime Variables → Store Step Result → Continue.
import axios from 'axios';
import { ExecutionRunEntity, ExecutionContext, ExecutionStepResult, ExecutionSummary, FailureMode, RunStatus, StepStatus } from '../../domain/execution/ExecutionRunEntity';
import { ExecutionRunRepository } from '../../domain/execution/ExecutionRunRepository';
import { ExecutionPlanRepository } from '../../domain/requirements/ExecutionPlanRepository';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';
import { ValidationEngine } from '../../domain/validation/ValidationEngine';
import { ValidationRule, StepValidationResult } from '../../domain/validation/ValidationRuleEntity';

export class ExecutePlan {
  constructor(
    private readonly executionRunRepository: ExecutionRunRepository,
    private readonly executionPlanRepository: ExecutionPlanRepository,
    private readonly requirementRepository: RequirementRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly datasetRepository: DatasetRepository,
    private readonly apiOperationRepository: ApiOperationRepository
  ) {}

  async execute(executionPlanId: string, failureMode: FailureMode = 'StopOnFailure'): Promise<ExecutionRunEntity> {
    // Get the execution plan
    const plans = await this.executionPlanRepository.findByProject('');
    const plan = plans.find(p => p.id === executionPlanId);
    if (!plan) {
      // Try finding by ID directly
      const planById = await this.executionPlanRepository.findById(executionPlanId);
      if (!planById) {
        throw new Error(`Execution Plan with id ${executionPlanId} not found`);
      }
      return this.executePlan(planById, failureMode);
    }
    return this.executePlan(plan, failureMode);
  }

  private async executePlan(plan: any, failureMode: FailureMode): Promise<ExecutionRunEntity> {
    const requirement = await this.requirementRepository.findById(plan.requirementId);
    if (!requirement) {
      throw new Error(`Requirement with id ${plan.requirementId} not found`);
    }

    // Resolve environment
    const environments = await this.environmentRepository.findByProject(plan.projectId);
    const environment = environments.find(e => e.id === plan.environmentId) || environments[0];
    if (!environment) {
      throw new Error('No environment configured for this project');
    }

    // Resolve dataset values
    let datasetValues: Record<string, any> = {};
    if (plan.datasetId) {
      const dataset = await this.datasetRepository.findById(plan.datasetId);
      if (dataset) {
        // Use dataset properties as test data values
        datasetValues = {
          name: dataset.name,
          category: dataset.category,
          rowCount: dataset.rowCount,
        };
      }
    }

    // Initialize execution context
    const context: ExecutionContext = {
      environmentId: environment.id,
      baseUrl: environment.baseUrl,
      environmentVariables: environment.variables || {},
      datasetValues,
      runtimeVariables: {},
      responses: {},
      headers: {},
    };

    // Add auth headers if environment has authentication
    if (environment.authentication) {
      if (environment.authentication.type === 'bearer') {
        context.headers['Authorization'] = `Bearer ${environment.authentication.token}`;
      } else if (environment.authentication.type === 'basic') {
        context.headers['Authorization'] = `Basic ${Buffer.from(`${environment.authentication.username}:${environment.authentication.password}`).toString('base64')}`;
      }
    }

    const now = Date.now();
    const run = new ExecutionRunEntity(
      crypto.randomUUID(),
      plan.projectId,
      plan.requirementId,
      plan.id,
      failureMode,
      'Running',
      context,
      [],
      [],
      { totalSteps: 0, passed: 0, failed: 0, skipped: 0, duration: 0, validationPassed: 0, validationFailed: 0, validationWarnings: 0 },
      now,
      now,
      null
    );

    // Persist initial run
    const persistedRun = await this.executionRunRepository.create(run);

    // Execute each step
    const sortedPlans = [plan]; // Single plan for now, but could be multiple
    const stepResults: ExecutionStepResult[] = [];
    let shouldSkipDependents = false;
    const failedStepIds: Set<string> = new Set();

    for (const currentPlan of sortedPlans) {
      if (shouldSkipDependents && currentPlan.prerequisiteDesignIds?.some((id: string) => failedStepIds.has(id))) {
        // Skip this step because a prerequisite failed
        const skippedResult: ExecutionStepResult = {
          stepId: currentPlan.id,
          executionOrder: currentPlan.executionOrder,
          status: 'Skipped',
          request: { method: '', url: '', headers: {} },
          response: null,
          assertions: [],
          capturedVariables: {},
          error: 'Skipped due to prerequisite failure',
          startedAt: Date.now(),
          completedAt: Date.now(),
          validations: [],
        };
        stepResults.push(skippedResult);
        continue;
      }

      const stepResult = await this.executeStep(currentPlan, context);
      stepResults.push(stepResult);

      if (stepResult.status === 'Failed') {
        failedStepIds.add(currentPlan.id);
        if (failureMode === 'StopOnFailure') {
          shouldSkipDependents = true;
          break;
        }
      }
    }

    // Calculate summary
    const summary: ExecutionSummary = {
      totalSteps: stepResults.length,
      passed: stepResults.filter(r => r.status === 'Passed').length,
      failed: stepResults.filter(r => r.status === 'Failed').length,
      skipped: stepResults.filter(r => r.status === 'Skipped').length,
      duration: Date.now() - now,
      validationPassed: 0,
      validationFailed: 0,
      validationWarnings: 0,
    };

    // Determine final status
    const finalStatus: RunStatus = summary.failed > 0
      ? (failureMode === 'StopOnFailure' ? 'Failed' : 'Completed')
      : 'Completed';

    // Update run with results
    const updatedRun = new ExecutionRunEntity(
      persistedRun.id,
      persistedRun.projectId,
      persistedRun.requirementId,
      persistedRun.executionPlanId,
      persistedRun.failureMode,
      finalStatus,
      context,
      stepResults,
      [],
      summary,
      persistedRun.createdAt,
      Date.now(),
      Date.now()
    );

    return this.executionRunRepository.update(persistedRun.id, updatedRun);
  }

  private async executeStep(plan: any, context: ExecutionContext): Promise<ExecutionStepResult> {
    const startedAt = Date.now();
    const stepResult: ExecutionStepResult = {
      stepId: plan.id,
      executionOrder: plan.executionOrder,
      status: 'Running',
      request: { method: '', url: '', headers: {} },
      response: null,
      assertions: [],
      capturedVariables: {},
      error: null,
      startedAt,
      completedAt: null,
      validations: [],
    };

    try {
      // Resolve runtime variables in request template
      const requestTemplate = plan.requestTemplate || { method: 'GET', path: '/' };
      const method = requestTemplate.method || 'GET';
      let path = requestTemplate.path || '/';

      // Substitute runtime variables in path
      path = this.substituteVariables(path, context);

      // Build URL
      const url = `${context.baseUrl}${path}`;

      // Build headers (merge environment headers with request overrides)
      const headers: Record<string, string> = {
        ...context.headers,
        ...(requestTemplate.headers || {}),
      };

      // Resolve runtime variables in headers
      for (const [key, value] of Object.entries(headers)) {
        headers[key] = this.substituteVariables(value, context);
      }

      // Build body (resolve runtime variables)
      let body = requestTemplate.body;
      if (body) {
        body = this.resolveObject(body, context);
      }

      // Apply dataset values to body if body is empty
      if (!body && Object.keys(context.datasetValues).length > 0) {
        body = context.datasetValues;
      }

      stepResult.request = { method, url, headers, body };

      // Execute HTTP request
      const requestStart = Date.now();
      const response = await axios({
        method: method.toLowerCase(),
        url,
        headers,
        data: body,
        timeout: 30000,
        validateStatus: () => true, // Don't throw on any status code
      });
      const duration = Date.now() - requestStart;

      // Store response
      stepResult.response = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        body: response.data,
        duration,
      };

      // Store response in context for future steps
      context.responses[plan.id] = response.data;

      // Validate assertions
      const assertionResults = (plan.assertions || []).map((assertion: any) => {
        const actual = this.extractValue(response, assertion.path, assertion.type);
        const passed = this.validateAssertion(assertion, actual);
        return {
          type: assertion.type,
          operator: assertion.operator,
          path: assertion.path,
          expected: assertion.expected,
          actual,
          passed,
        };
      });
      stepResult.assertions = assertionResults;

      // Run validation engine
      const validationRules: ValidationRule[] = (plan.assertions || []).map((assertion: any, index: number) => ({
        id: `validation-${index}`,
        executionPlanId: plan.id,
        name: `Validation ${index + 1}`,
        type: this.mapAssertionType(assertion.type),
        config: {
          path: assertion.path,
          expected: assertion.expected,
          operator: assertion.operator,
        },
      }));

      const validationContext = {
        response: response,
        runtimeVariables: context.runtimeVariables,
      };

      const validationStepResult: StepValidationResult = ValidationEngine.validateStep(validationRules, validationContext);
      stepResult.validations = validationStepResult.validations;

      // Capture runtime variables
      const capturedVariables: Record<string, any> = {};
      for (const binding of (plan.runtimeBindings || [])) {
        if (binding.source === 'response') {
          const value = this.extractValue(response, binding.path, 'body');
          capturedVariables[binding.variable] = value;
          context.runtimeVariables[binding.variable] = value;
        }
      }
      stepResult.capturedVariables = capturedVariables;

      // Determine step status
      const allPassed = assertionResults.every((a: any) => a.passed);
      stepResult.status = allPassed ? 'Passed' : 'Failed';
      stepResult.completedAt = Date.now();

    } catch (error: any) {
      stepResult.status = 'Failed';
      stepResult.error = error.message || 'Unknown error';
      stepResult.completedAt = Date.now();
    }

    return stepResult;
  }

  private substituteVariables(text: string, context: ExecutionContext): string {
    if (!text) return text;
    // Replace {{variable}} patterns
    return text.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      if (context.runtimeVariables[variable] !== undefined) {
        return String(context.runtimeVariables[variable]);
      }
      if (context.environmentVariables[variable] !== undefined) {
        return String(context.environmentVariables[variable]);
      }
      if (context.datasetValues[variable] !== undefined) {
        return String(context.datasetValues[variable]);
      }
      return match; // Keep original if not found
    });
  }

  private resolveObject(obj: any, context: ExecutionContext): any {
    if (typeof obj === 'string') {
      return this.substituteVariables(obj, context);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveObject(item, context));
    }
    if (obj && typeof obj === 'object') {
      const resolved: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolveObject(value, context);
      }
      return resolved;
    }
    return obj;
  }

  private extractValue(response: any, path: string, type: string): any {
    if (type === 'status') {
      return response.status;
    }
    if (type === 'header') {
      return response.headers?.[path];
    }
    if (type === 'body' || type === 'jsonPath') {
      // Simple JSON path extraction (e.g., "$.data.id")
      if (path.startsWith('$.')) {
        const parts = path.substring(2).split('.');
        let value = response.data;
        for (const part of parts) {
          value = value?.[part];
        }
        return value;
      }
      return response.data?.[path];
    }
    return null;
  }

  private mapAssertionType(type: string): string {
    const typeMap: Record<string, string> = {
      'status': 'HTTP Status',
      'header': 'Header Exists',
      'jsonPath': 'JSON Path Exists',
      'body': 'Response Body Contains',
    };
    return typeMap[type] || 'Custom Assertion';
  }

  private validateAssertion(assertion: any, actual: any): boolean {
    switch (assertion.operator) {
      case 'equals':
        return actual === assertion.expected;
      case 'contains':
        return String(actual).includes(String(assertion.expected));
      case 'matches':
        return new RegExp(assertion.expected).test(String(actual));
      case 'exists':
        return actual !== undefined && actual !== null;
      default:
        return false;
    }
  }
}

export default ExecutePlan;