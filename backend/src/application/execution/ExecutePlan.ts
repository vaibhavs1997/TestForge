// ExecutePlan - Execution Engine
// Executes an existing Execution Plan. Does NOT generate plans or reports.
// For every execution step: Resolve Environment → Resolve Dataset Values →
// Resolve Runtime Variables → Apply Request Overrides → Execute HTTP Request →
// Validate Assertions → Capture Runtime Variables → Store Step Result → Continue.
import { randomUUID } from 'node:crypto';
import axios from 'axios';
import { ExecutionRunEntity, ExecutionContext, ExecutionStepResult, ExecutionSummary, FailureMode, RunStatus, StepStatus, ExecutionProfileMetadata } from '../../domain/execution/ExecutionRunEntity';
import { ExecutionRunRepository } from '../../domain/execution/ExecutionRunRepository';
import { ExecutionPlanRepository } from '../../domain/requirements/ExecutionPlanRepository';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import { TestDesignRepository } from '../../domain/requirements/TestDesignRepository';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository';
import { DataSourceMappingRepository } from '../../infrastructure/test-data/DataSourceMappingRepository';
import { DatasetRowRepository } from '../../infrastructure/test-data/DatasetRowRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';
import { ApiServiceRepository } from '../../infrastructure/api/ApiServiceRepository';
import { ValidationEngine } from '../../domain/validation/ValidationEngine';
import { ValidationRule, StepValidationResult } from '../../domain/validation/ValidationRuleEntity';
import { TestDataResolutionService, ResolutionContext, ResolvedValue } from '../test-data/TestDataResolutionService';
import { AssertionRepository } from '../../infrastructure/assertion/AssertionRepository';
import type { AssertionEntity, AssertionReference } from '../../domain/assertion/AssertionEntity';
import { IExecutionProfileRepository } from '../../domain/execution/ExecutionProfileRepository';
import { ExecutionProfileEntity } from '../../domain/execution/ExecutionProfileEntity';
import { ProviderRepository } from '../../domain/providers/ProviderRepository';
import { ProviderResolutionService } from '../../infrastructure/providers/ProviderResolutionService';
import { EventPublisher } from '../EventPublisher';
import { DEFAULT_TIMEOUT_MS } from '../../constants/defaults';

export class ExecutePlan {
  private loadedProfile: ExecutionProfileEntity | null = null;
  private readonly inFlightPlanIds = new Set<string>();

  constructor(
    private readonly executionRunRepository: ExecutionRunRepository,
    private readonly executionPlanRepository: ExecutionPlanRepository,
    private readonly requirementRepository: RequirementRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly datasetRepository: DatasetRepository,
    private readonly apiOperationRepository: ApiOperationRepository,
    private readonly dataSourceMappingRepository: DataSourceMappingRepository,
    private readonly datasetRowRepository: DatasetRowRepository,
    private readonly testDesignRepository: TestDesignRepository,
    private readonly assertionRepository: AssertionRepository,
    private readonly executionProfileRepository?: IExecutionProfileRepository,
    private readonly eventPublisher?: EventPublisher,
    private readonly apiServiceRepository?: ApiServiceRepository
  ) {
    // Initialize resolution service
    this.testDataResolutionService = new TestDataResolutionService(
      dataSourceMappingRepository,
      datasetRowRepository,
      datasetRepository,
      null as any, // ColumnRepository - not critical for basic resolution
      null as any, // RuntimeVariableRepository - not critical for basic resolution
      environmentRepository
    );
  }

  private readonly testDataResolutionService: TestDataResolutionService;

  async execute(executionPlanId: string, failureMode: FailureMode = 'StopOnFailure', executionProfileId?: string): Promise<ExecutionRunEntity> {
    if (this.inFlightPlanIds.has(executionPlanId)) {
      throw new Error('An execution is already in progress for this step. Wait for it to finish.');
    }
    this.inFlightPlanIds.add(executionPlanId);
    this.loadedProfile = null;

    try {
    // Load execution profile if provided
    if (executionProfileId && this.executionProfileRepository) {
      this.loadedProfile = await this.executionProfileRepository.findById(executionProfileId);
      if (!this.loadedProfile) {
        throw new Error(`Execution Profile with id ${executionProfileId} not found`);
      }
      // Profile overrides failure mode
      failureMode = this.loadedProfile.failureMode as FailureMode;
    }

    // Get the execution plan
    const plan = await this.executionPlanRepository.findById(executionPlanId);
    if (!plan) {
      throw new Error(`Execution Plan with id ${executionPlanId} not found`);
    }
    return await this.executePlan(plan, failureMode);
    } finally {
      this.inFlightPlanIds.delete(executionPlanId);
      this.loadedProfile = null;
    }
  }

  private buildProfileMetadata(profile: ExecutionProfileEntity): ExecutionProfileMetadata {
    return {
      profileName: profile.name,
      profileId: profile.id,
      profileSettings: {
        failureMode: profile.failureMode,
        timeout: profile.timeout,
        retryPolicy: { enabled: profile.retryPolicy.enabled, maxRetries: profile.retryPolicy.maxRetries, retryDelay: profile.retryPolicy.retryDelay },
        assertionMode: profile.assertionMode,
        runtimeVariableReset: profile.runtimeVariableReset,
        datasetSelectionStrategy: profile.datasetSelectionStrategy,
        defaultEnvironmentId: profile.defaultEnvironmentId,
        parallelism: { enabled: profile.parallelism.enabled, maxConcurrent: profile.parallelism.maxConcurrent },
      },
    };
  }

  async executeCombined(planIds: string[], failureMode: FailureMode = 'StopOnFailure', executionProfileId?: string, suiteId?: string, suiteSnapshot?: Record<string, unknown>): Promise<ExecutionRunEntity> {
    if (planIds.length === 0) throw new Error('No execution plans supplied');
    const lockId = `suite:${suiteId || planIds.join(',')}`;
    if (this.inFlightPlanIds.has(lockId)) throw new Error('An execution is already in progress for this suite.');
    this.inFlightPlanIds.add(lockId);
    this.loadedProfile = null;
    try {
      const plans = await Promise.all(planIds.map((id) => this.executionPlanRepository.findById(id)));
      const missingPlanIds = planIds.filter((_, index) => !plans[index]);
      if (missingPlanIds.length > 0) {
        throw new Error(`Execution Plan(s) not found: ${missingPlanIds.join(', ')}`);
      }
      const firstPlan = plans.find(Boolean);
      if (!firstPlan) throw new Error('No execution plans found');
      if (executionProfileId && this.executionProfileRepository) {
        this.loadedProfile = await this.executionProfileRepository.findById(executionProfileId);
        if (!this.loadedProfile) throw new Error(`Execution Profile with id ${executionProfileId} not found`);
        failureMode = this.loadedProfile.failureMode as FailureMode;
      }
      return await this.executePlan(firstPlan, failureMode, planIds, suiteId, suiteSnapshot);
    } finally {
      this.inFlightPlanIds.delete(lockId);
      this.loadedProfile = null;
    }
  }

  private async executePlan(plan: any, failureMode: FailureMode, explicitPlanIds?: string[], suiteId?: string, suiteSnapshot?: Record<string, unknown>): Promise<ExecutionRunEntity> {
    // Legacy execution plans may predate requirementId persistence. Recover it
    // from the referenced design so they remain executable without rewriting data.
    const referencedDesign = !plan.requirementId && plan.testDesignId
      ? await this.testDesignRepository.findById(plan.testDesignId)
      : null;
    const requirementId = plan.requirementId || referencedDesign?.requirementId;
    const requirement = await this.requirementRepository.findById(requirementId);
    if (!requirement) {
      throw new Error(`Requirement with id ${requirementId ?? 'undefined'} not found`);
    }

    const mappedOperation = plan.operationId
      ? await this.apiOperationRepository.findById(plan.operationId)
      : null;

    // Resolve environment - use profile's default environment if plan has none.
    // Imported projects may have a service base URL but no explicit environment
    // record yet; use that generic service metadata as a non-persisted fallback.
    const environments = await this.environmentRepository.findByProject(plan.projectId);
    // The API workspace's current shared default is authoritative. This keeps
    // execution aligned with the URL/environment the user just tested.
    const sharedDefault = environments.find(e => e.isDefault);
    let environmentId = sharedDefault?.id || plan.environmentId;
    if (!environmentId && this.loadedProfile) {
      environmentId = this.loadedProfile.defaultEnvironmentId;
    }
    let environment = environments.find(e => e.id === environmentId) || environments[0];
    if (!environment && mappedOperation?.serviceId && this.apiServiceRepository) {
      const service = await this.apiServiceRepository.findById(mappedOperation.serviceId);
      if (service?.baseUrl) {
        environment = {
          id: `service:${service.id}`,
          projectId: plan.projectId,
          name: service.name || 'API service environment',
          baseUrl: service.baseUrl,
          description: 'Transient execution environment derived from API service metadata',
          authentication: null,
          variables: {},
          timeout: 30000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as any;
      }
    }
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

    // Initialize resolution context
    // Apply runtime variable reset from profile
    const runtimeVariables: Record<string, any> = this.loadedProfile?.runtimeVariableReset ? {} : {};
    const resolutionContext: ResolutionContext = {
      runtimeVariables,
      environmentVariables: environment.variables || {},
      sequentialPositions: new Map(),
    };

    const serviceId = mappedOperation?.serviceId ?? '';

    // Validate test data mappings before execution
    const validationErrors = await this.testDataResolutionService.validateMappings(
      plan.projectId,
      serviceId,
      plan.operationId,
      resolutionContext
    );

    if (validationErrors.length > 0) {
      const errorMessages = validationErrors.map(e => `${e.field}: ${e.message}`).join(', ');
      throw new Error(`Test data validation failed: ${errorMessages}`);
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

    // API workspace tokens are persisted as environment variables. Apply the
    // active token automatically for operations that require bearer auth;
    // request-level headers (including negative/security cases) still win
    // later when the request template is merged.
    const environmentToken = environment.variables?.accessToken
      || environment.variables?.access_token
      || environment.variables?.oauthToken
      || environment.variables?.oauth_token;
    // Some imported contracts incorrectly mark protected operations as
    // `None`, even though the API workspace sends the environment bearer
    // token. If a token is active, attach it by default; explicit request
    // headers still override this for negative/authentication test cases.
    if (!context.headers['Authorization'] && environmentToken) {
      context.headers['Authorization'] = `Bearer ${String(environmentToken).replace(/^Bearer\s+/i, '')}`;
    }

    const profileMetadata = this.loadedProfile ? this.buildProfileMetadata(this.loadedProfile) : null;
    const profileId = this.loadedProfile?.id || null;

    const now = Date.now();
    const run = new ExecutionRunEntity(
      randomUUID(),
      plan.projectId,
      requirementId,
      plan.id,
      failureMode,
      'Running',
      context,
      [],
      [],
      { totalSteps: 0, passed: 0, failed: 0, skipped: 0, blocked: 0, duration: 0, validationPassed: 0, validationFailed: 0, validationWarnings: 0 },
      now,
      now,
      null,
      profileId,
      profileMetadata,
      suiteId || null,
      explicitPlanIds || [plan.id],
      [],
      suiteSnapshot || null
    );

    // Persist initial run
    const persistedRun = await this.executionRunRepository.create(run);

    // Execute each step
    const allPlans = explicitPlanIds
      ? await this.executionPlanRepository.findByProject(plan.projectId)
      : await this.executionPlanRepository.findByRequirement(requirementId);
    const requiredPlanIds = new Set<string>(explicitPlanIds || [plan.id]);
    const plansById = new Map(allPlans.map((candidate) => [candidate.id, candidate]));
    const unresolvedPrerequisiteIds = new Map<string, string[]>();
    const collectPrerequisites = (candidate: any) => {
      for (const prerequisiteId of candidate.prerequisiteDesignIds || []) {
        const prerequisitePlan = allPlans.find((item) => item.testDesignId === prerequisiteId || item.id === prerequisiteId);
        if (prerequisitePlan && !requiredPlanIds.has(prerequisitePlan.id)) {
          requiredPlanIds.add(prerequisitePlan.id);
          collectPrerequisites(prerequisitePlan);
        } else if (!prerequisitePlan) {
          const missing = unresolvedPrerequisiteIds.get(candidate.id) || [];
          missing.push(prerequisiteId);
          unresolvedPrerequisiteIds.set(candidate.id, missing);
        }
      }
    };
    for (const selectedPlanId of [...requiredPlanIds]) {
      const selectedPlan = plansById.get(selectedPlanId);
      if (selectedPlan) collectPrerequisites(selectedPlan);
    }
    const sortedPlans = (requiredPlanIds.size > 1 ? allPlans.filter((candidate) => requiredPlanIds.has(candidate.id)) : [plan])
      .sort((a, b) => a.executionOrder - b.executionOrder);
    const dependencyGraph = sortedPlans.map((candidate: any) => ({
      executionPlanId: candidate.id,
      prerequisitePlanIds: (candidate.prerequisiteDesignIds || [])
        .map((id: string) => allPlans.find((item: any) => item.id === id || item.testDesignId === id)?.id)
        .filter(Boolean),
    }));
    const stepResults: ExecutionStepResult[] = [];
    const failedStepIds: Set<string> = new Set();

    for (const currentPlan of sortedPlans) {
      const unresolvedPrerequisites = unresolvedPrerequisiteIds.get(currentPlan.id) || [];
      if (unresolvedPrerequisites.length > 0) {
        const blockedResult: ExecutionStepResult = {
          stepId: currentPlan.id,
          executionOrder: currentPlan.executionOrder,
          status: 'Blocked',
          request: { method: '', url: '', headers: {} },
          response: null,
          assertions: [],
          capturedVariables: {},
          error: `Blocked because prerequisite plan(s) were not found: ${unresolvedPrerequisites.join(', ')}`,
          startedAt: Date.now(),
          completedAt: Date.now(),
          validations: [],
        };
        stepResults.push(blockedResult);
        failedStepIds.add(currentPlan.id);
        continue;
      }
      const prerequisitePlans = (currentPlan.prerequisiteDesignIds || [])
        .map((id: string) => plansById.get(id) || allPlans.find((candidate) => candidate.testDesignId === id))
        .filter(Boolean);
      if (prerequisitePlans.some((prerequisite: any) => failedStepIds.has(prerequisite.id))) {
        const skippedResult: ExecutionStepResult = {
          stepId: currentPlan.id,
          executionOrder: currentPlan.executionOrder,
          status: 'Blocked',
          request: { method: '', url: '', headers: {} },
          response: null,
          assertions: [],
          capturedVariables: {},
          error: 'Blocked because a prerequisite failed or was blocked',
          startedAt: Date.now(),
          completedAt: Date.now(),
          validations: [],
        };
        stepResults.push(skippedResult);
        failedStepIds.add(currentPlan.id);
        continue;
      }
      if (prerequisitePlans.some((prerequisite: any) => !stepResults.some((result) => result.stepId === prerequisite.id && result.status === 'Passed'))) {
        const blockedResult: ExecutionStepResult = {
          stepId: currentPlan.id,
          executionOrder: currentPlan.executionOrder,
          status: 'Blocked',
          request: { method: '', url: '', headers: {} },
          response: null,
          assertions: [],
          capturedVariables: {},
          error: 'Blocked because required prerequisites did not complete successfully',
          startedAt: Date.now(),
          completedAt: Date.now(),
          validations: [],
        };
        stepResults.push(blockedResult);
        failedStepIds.add(currentPlan.id);
        continue;
      }

      const stepOperation = currentPlan.operationId
        ? await this.apiOperationRepository.findById(currentPlan.operationId)
        : null;
      const stepServiceId = stepOperation?.serviceId ?? '';

      // Resolve test data for this step
      const resolvedValues = await this.testDataResolutionService.resolveRequestFields(
        currentPlan.projectId,
        stepServiceId,
        currentPlan.operationId,
        resolutionContext
      );

      // Load Test Design to get attached assertions
      const testDesign = await this.testDesignRepository.findById(currentPlan.testDesignId);
      let assertionRefs: AssertionReference[] = [];
      let reusableAssertions: AssertionEntity[] = [];
      
      if (testDesign) {
        assertionRefs = testDesign.assertionIds || [];
        
        // Load reusable assertions
        for (const ref of assertionRefs) {
          if (ref.enabled) {
            const assertion = await this.assertionRepository.findById(ref.assertionId);
            if (assertion && assertion.enabled) {
              reusableAssertions.push(assertion);
            }
          }
        }
      }

      const dependencyResolution = this.applyDependencyValues(currentPlan, context, sortedPlans);
      if (dependencyResolution.error) {
        const blockedResult: ExecutionStepResult = {
          stepId: currentPlan.id,
          executionOrder: currentPlan.executionOrder,
          status: 'Blocked',
          request: { method: '', url: '', headers: {} },
          response: null,
          assertions: [],
          capturedVariables: {},
          error: dependencyResolution.error,
          startedAt: Date.now(),
          completedAt: Date.now(),
          validations: [],
        };
        stepResults.push(blockedResult);
        failedStepIds.add(currentPlan.id);
        continue;
      }
      const stepResult = await this.executeStep(dependencyResolution.plan, context, resolvedValues);
      
      // Store resolved test data in step result
      (stepResult as any).resolvedTestData = {
        resolvedValues,
        datasetId: currentPlan.datasetId,
        sequentialPositions: Array.from(resolutionContext.sequentialPositions.entries()),
      };
      
      // Store assertion information
      (stepResult as any).reusableAssertions = reusableAssertions;
      (stepResult as any).assertionReferences = assertionRefs;
      
      stepResults.push(stepResult);

      if (stepResult.status === 'Failed') {
        failedStepIds.add(currentPlan.id);
        if (failureMode === 'StopOnFailure') {
          if (sortedPlans.length === 1) break;
          continue;
        }
      }
    }

    // Calculate summary
    const summary: ExecutionSummary = {
      totalSteps: stepResults.length,
      passed: stepResults.filter(r => r.status === 'Passed').length,
      failed: stepResults.filter(r => r.status === 'Failed').length,
      skipped: stepResults.filter(r => r.status === 'Skipped').length,
      blocked: stepResults.filter(r => r.status === 'Blocked').length,
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
      Date.now(),
      profileId,
      profileMetadata,
      suiteId || null,
      [...requiredPlanIds],
      dependencyGraph,
      suiteSnapshot || null
    );

    const result = await this.executionRunRepository.update(persistedRun.id, updatedRun);

    // Publish through central EventPublisher — triggers audit, notification,
    // cache invalidation, recommendation refresh, and pipeline refresh.
    if (this.eventPublisher) {
      await this.eventPublisher.executed('execution', result.id, result.projectId, 'ExecutionRun', finalStatus);
    }

    return result;
  }

  private async executeStep(plan: any, context: ExecutionContext, resolvedValues: Record<string, ResolvedValue> = {}): Promise<ExecutionStepResult> {
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

    // Apply resolved test data values to headers
    for (const [fieldPath, resolvedValue] of Object.entries(resolvedValues)) {
      if (resolvedValue.value !== null && resolvedValue.value !== undefined) {
        headers[fieldPath] = String(resolvedValue.value);
      }
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
    const timeout = this.loadedProfile?.timeout || DEFAULT_TIMEOUT_MS;

    try {
      const response = await axios({
        method: method.toLowerCase(),
        url,
        headers,
        data: body,
        timeout,
        validateStatus: () => true, // Don't throw on any status code
      });
      const duration = Date.now() - requestStart;

      // Store response
      stepResult.response = {
        status: response.status,
        statusText: response.statusText,
        headers: this.normalizeHeaders(response.headers),
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
      // Apply retry policy from profile
      if (this.loadedProfile?.retryPolicy.enabled && this.loadedProfile.retryPolicy.maxRetries > 0) {
        let retryCount = 0;
        const maxRetries = this.loadedProfile.retryPolicy.maxRetries;
        const retryDelay = this.loadedProfile.retryPolicy.retryDelay;

        while (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryCount++;
          try {
            const retryResponse = await axios({
              method: method.toLowerCase(),
              url,
              headers,
              data: body,
              timeout: this.loadedProfile.timeout,
              validateStatus: () => true,
            });
            stepResult.response = {
              status: retryResponse.status,
              statusText: retryResponse.statusText,
              headers: this.normalizeHeaders(retryResponse.headers),
              body: retryResponse.data,
              duration: Date.now() - requestStart,
            };
            stepResult.status = 'Passed';
            stepResult.error = null;
            stepResult.completedAt = Date.now();
            break;
          } catch (retryError: any) {
            if (retryCount >= maxRetries) {
              stepResult.status = 'Failed';
              stepResult.error = `Failed after ${maxRetries} retries: ${retryError.message || 'Unknown error'}`;
              stepResult.completedAt = Date.now();
            }
          }
        }
      } else {
        stepResult.status = 'Failed';
        stepResult.error = error.message || 'Unknown error';
        stepResult.completedAt = Date.now();
      }
    }

    return stepResult;
  }

  private applyDependencyValues(plan: any, context: ExecutionContext, plans: any[]): { plan: any; error?: string } {
    if (!Array.isArray(plan.dependencies) || plan.dependencies.length === 0) return { plan };
    const nextPlan = { ...plan, requestTemplate: this.cloneValue(plan.requestTemplate || {}) };
    for (const dependency of plan.dependencies) {
      const sourcePlan = plans.find((candidate) => candidate.operationId === dependency.sourceOperationId && context.responses[candidate.id] !== undefined);
      if (!sourcePlan) return { plan, error: `Blocked: dependency producer ${dependency.sourceOperationId} did not complete` };
      const sourceBody = context.responses[sourcePlan.id];
      const value = this.extractPath(sourceBody, dependency.sourceResponsePath);
      if (value === undefined || value === null) return { plan, error: `Blocked: dependency value missing at ${dependency.sourceResponsePath || '(response)'}` };
      context.runtimeVariables[`dependency:${dependency.sourceOperationId}:${dependency.sourceResponsePath || 'response'}`] = value;
      if (dependency.targetRequestPath) this.setPath(nextPlan.requestTemplate, dependency.targetRequestPath, value);
    }
    return { plan: nextPlan };
  }

  private cloneValue<T>(value: T): T {
    if (value === undefined || value === null) return value;
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  private extractPath(value: any, path?: string): any {
    if (!path || path === '$' || path === '.') return value;
    const normalized = path.replace(/^\$\.?/, '').replace(/^\.?/, '');
    if (!normalized) return value;
    return normalized.split(/[.\[\]]/).filter(Boolean).reduce((current, part) => current?.[part], value);
  }

  private setPath(target: any, path: string, value: any): void {
    const normalized = path.replace(/^\$\.?/, '').replace(/^\.?/, '');
    const parts = normalized.split(/[.\[\]]/).filter(Boolean);
    if (parts.length === 0) return;
    let cursor = target;
    for (let index = 0; index < parts.length - 1; index += 1) {
      const part = parts[index];
      if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
      cursor = cursor[part];
    }
    cursor[parts[parts.length - 1]] = value;
  }

  private normalizeHeaders(headers: unknown): Record<string, string> {
    if (!headers || typeof headers !== 'object') {
      return {};
    }
    const withToJson = headers as { toJSON?: () => Record<string, unknown> };
    if (typeof withToJson.toJSON === 'function') {
      const json = withToJson.toJSON();
      return Object.fromEntries(Object.entries(json).map(([k, v]) => [k, String(v)]));
    }
    return Object.fromEntries(
      Object.entries(headers as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
    );
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
        // Older plans asserted $.error, while this API returns structured
        // failures as { message, errors }. Treat the response message as the
        // equivalent error detail for backwards-compatible execution.
        if ((value === undefined || value === null) && path === '$.error') {
          value = response.data?.error ?? response.data?.message ?? response.data?.errors;
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
