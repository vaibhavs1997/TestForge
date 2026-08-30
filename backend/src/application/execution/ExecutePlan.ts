// ExecutePlan - Execution Engine
// Executes an existing Execution Plan. Does NOT generate plans or reports.
// For every execution step: Resolve Environment → Resolve Dataset Values →
// Resolve Runtime Variables → Apply Request Overrides → Execute HTTP Request →
// Validate Assertions → Capture Runtime Variables → Store Step Result → Continue.
import { createHash, randomUUID } from 'node:crypto';
import { ExecutionRunEntity, ExecutionContext, ExecutionStepResult, ExecutionSummary, FailureMode, RunStatus, StepStatus, ExecutionProfileMetadata } from '../../domain/execution/ExecutionRunEntity.js';
import { ExecutionRunRepository } from '../../domain/execution/ExecutionRunRepository.js';
import { ExecutionPlanRepository } from '../../domain/requirements/ExecutionPlanRepository.js';
import { RequirementRepository } from '../../domain/requirements/RequirementRepository.js';
import { TestDesignRepository } from '../../domain/requirements/TestDesignRepository.js';
import { EnvironmentRepository } from '../../infrastructure/environment/EnvironmentRepository.js';
import { DatasetRepository } from '../../infrastructure/test-data/DatasetRepository.js';
import { ColumnRepository } from '../../infrastructure/test-data/ColumnRepository.js';
import { DataSourceMappingRepository } from '../../infrastructure/test-data/DataSourceMappingRepository.js';
import { DatasetRowRepository } from '../../infrastructure/test-data/DatasetRowRepository.js';
import { RuntimeVariableRepository } from '../../infrastructure/knowledge/RuntimeVariableRepository.js';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository.js';
import { ApiServiceRepository } from '../../infrastructure/api/ApiServiceRepository.js';
import { ValidationEngine } from '../../domain/validation/ValidationEngine.js';
import { ValidationRule, StepValidationResult } from '../../domain/validation/ValidationRuleEntity.js';
import { TestDataResolutionService, ResolutionContext, ResolvedValue } from '../test-data/TestDataResolutionService.js';
import { AssertionRepository } from '../../infrastructure/assertion/AssertionRepository.js';
import type { AssertionEntity, AssertionReference } from '../../domain/assertion/AssertionEntity.js';
import { IExecutionProfileRepository } from '../../domain/execution/ExecutionProfileRepository.js';
import { ExecutionProfileEntity } from '../../domain/execution/ExecutionProfileEntity.js';
import { ProviderRepository } from '../../domain/providers/ProviderRepository.js';
import { ProviderResolutionService } from '../../infrastructure/providers/ProviderResolutionService.js';
import { EventPublisher } from '../EventPublisher.js';
import { DEFAULT_TIMEOUT_MS } from '../../constants/defaults.js';
import { ExecutionSafetyService } from './ExecutionSafetyService.js';
import { sensitiveDataRedactor } from '../../infrastructure/security/SensitiveDataRedactionService.js';
import type { SecretStore } from '../../domain/security/SecretStore.js';
import { SecretResolutionService } from '../security/SecretResolutionService.js';
import type { FieldDataRuleRepository } from '../../domain/test-data/FieldDataRuleRepository.js';
import { secureHttpExecutor, type SecureHttpExecutor } from '../../infrastructure/http/SecureHttpExecutor.js';

export class ExecutePlan {
  private loadedProfile: ExecutionProfileEntity | null = null;
  private readonly inFlightPlanIds = new Set<string>();
  private readonly activeRuns = new Map<string, AbortController>();

  constructor(
    private readonly executionRunRepository: ExecutionRunRepository,
    private readonly executionPlanRepository: ExecutionPlanRepository,
    private readonly requirementRepository: RequirementRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly datasetRepository: DatasetRepository,
    private readonly apiOperationRepository: ApiOperationRepository,
    private readonly dataSourceMappingRepository: DataSourceMappingRepository,
    private readonly datasetRowRepository: DatasetRowRepository,
    private readonly columnRepository: ColumnRepository,
    private readonly runtimeVariableRepository: RuntimeVariableRepository,
    private readonly testDesignRepository: TestDesignRepository,
    private readonly assertionRepository: AssertionRepository,
    private readonly executionProfileRepository?: IExecutionProfileRepository,
    private readonly eventPublisher?: EventPublisher,
    private readonly apiServiceRepository?: ApiServiceRepository,
    private readonly executionSafetyService = new ExecutionSafetyService(),
    private readonly secretStore?: SecretStore,
    private readonly fieldDataRuleRepository?: FieldDataRuleRepository,
    private readonly httpExecutor: SecureHttpExecutor = secureHttpExecutor,
  ) {
    // Initialize resolution service
    this.testDataResolutionService = new TestDataResolutionService(
      dataSourceMappingRepository,
      datasetRowRepository,
      datasetRepository,
      columnRepository,
      runtimeVariableRepository,
      environmentRepository,
      fieldDataRuleRepository,
      secretStore,
    );
  }

  private readonly testDataResolutionService: TestDataResolutionService;

  async cancel(runId: string): Promise<ExecutionRunEntity | null> {
    const run = await this.executionRunRepository.findById(runId);
    if (!run) return null;
    if (run.status === 'Cancelled' || run.status === 'Completed' || run.status === 'Failed') return run;
    this.activeRuns.get(runId)?.abort();
    return this.executionRunRepository.update(runId, { status: 'Cancelled', completedAt: Date.now() });
  }

  async execute(executionPlanId: string, failureMode: FailureMode = 'StopOnFailure', executionProfileId?: string, environmentOverrideId?: string, onRunCreated?: (run: ExecutionRunEntity) => Promise<void> | void, existingRunId?: string): Promise<ExecutionRunEntity> {
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
    return await this.executePlan(plan, failureMode, undefined, undefined, undefined, environmentOverrideId, onRunCreated, existingRunId);
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

  async executeCombined(planIds: string[], failureMode: FailureMode = 'StopOnFailure', executionProfileId?: string, suiteId?: string, suiteSnapshot?: Record<string, unknown>, environmentOverrideId?: string, onRunCreated?: (run: ExecutionRunEntity) => Promise<void> | void, existingRunId?: string): Promise<ExecutionRunEntity> {
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
      return await this.executePlan(firstPlan, failureMode, planIds, suiteId, suiteSnapshot, environmentOverrideId, onRunCreated, existingRunId);
    } finally {
      this.inFlightPlanIds.delete(lockId);
      this.loadedProfile = null;
    }
  }

  private async executePlan(plan: any, failureMode: FailureMode, explicitPlanIds?: string[], suiteId?: string, suiteSnapshot?: Record<string, unknown>, environmentOverrideId?: string, onRunCreated?: (run: ExecutionRunEntity) => Promise<void> | void, existingRunId?: string): Promise<ExecutionRunEntity> {
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
    let environmentId = environmentOverrideId || sharedDefault?.id || plan.environmentId;
    if (!environmentId && this.loadedProfile) {
      environmentId = this.loadedProfile.defaultEnvironmentId;
    }
    let environment = environments.find(e => e.id === environmentId);
    if (environmentOverrideId && !environment) {
      throw new Error(`Scheduled execution environment "${environmentOverrideId}" was not found for this project`);
    }
    environment = environment || environments[0];
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

    const selectedEnvironment = environment;
    const secretResolver = this.secretStore ? new SecretResolutionService(this.secretStore) : null;
    const secretValues = secretResolver ? await secretResolver.values({ authentication: selectedEnvironment.authentication, variables: selectedEnvironment.variables }) : [];
    const executionEnvironment = secretResolver
      ? { ...selectedEnvironment, authentication: await secretResolver.resolve(selectedEnvironment.authentication), variables: await secretResolver.resolve(selectedEnvironment.variables) } as any
      : selectedEnvironment;

    const resolvedSuiteSnapshot = suiteSnapshot
      ? {
          ...suiteSnapshot,
          environment: {
            id: executionEnvironment.id,
            name: executionEnvironment.name,
            baseUrl: executionEnvironment.baseUrl,
            source: environmentOverrideId ? 'schedule' : 'resolved',
          },
        }
      : null;

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
      environmentVariables: executionEnvironment.variables || {},
      sequentialPositions: new Map(),
    };

    const serviceId = mappedOperation?.serviceId ?? '';

    // Validate test data mappings before execution
    let validationErrors;
    try {
      validationErrors = await this.testDataResolutionService.validateMappings(
        plan.projectId,
        serviceId,
        plan.operationId,
        resolutionContext
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Test data resolution failed before execution: ${detail}`);
    }

    if (validationErrors.length > 0) {
      const errorMessages = validationErrors.map(e => `${e.field}: ${e.message}`).join(', ');
      throw new Error(`Test data validation failed: ${errorMessages}`);
    }

    // Initialize execution context
    const context: ExecutionContext = {
      environmentId: executionEnvironment.id,
      baseUrl: executionEnvironment.baseUrl,
      environmentVariables: executionEnvironment.variables || {},
      datasetValues,
      runtimeVariables: {},
      responses: {},
      headers: {},
    };

    // Add auth headers if environment has authentication
    if (executionEnvironment.authentication) {
      if (executionEnvironment.authentication.type === 'bearer') {
        context.headers['Authorization'] = `Bearer ${executionEnvironment.authentication.token}`;
      } else if (executionEnvironment.authentication.type === 'basic') {
        context.headers['Authorization'] = `Basic ${Buffer.from(`${executionEnvironment.authentication.username}:${executionEnvironment.authentication.password}`).toString('base64')}`;
      }
    }

    // API workspace tokens are persisted as environment variables. Apply the
    // active token automatically for operations that require bearer auth;
    // request-level headers (including negative/security cases) still win
    // later when the request template is merged.
    const environmentToken = executionEnvironment.variables?.accessToken
      || executionEnvironment.variables?.access_token
      || executionEnvironment.variables?.oauthToken
      || executionEnvironment.variables?.oauth_token;
    // Some imported contracts incorrectly mark protected operations as
    // `None`, even though the API workspace sends the environment bearer
    // token. If a token is active, attach it by default; explicit request
    // headers still override this for negative/authentication test cases.
    if (!context.headers['Authorization'] && environmentToken) {
      context.headers['Authorization'] = `Bearer ${String(environmentToken).replace(/^Bearer\s+/i, '')}`;
    }

    const profileMetadata = this.loadedProfile ? this.buildProfileMetadata(this.loadedProfile) : null;
    const profileId = this.loadedProfile?.id || null;

    // Resolve all participating steps before creating the run. Safety checks
    // intentionally happen here so every caller (manual, scheduled, or future)
    // is stopped before it can dispatch an HTTP request or write a run result.
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
    const safetyCandidates = await Promise.all(sortedPlans.map(async (candidate: any) => {
      const design = candidate.testDesignId
        ? await this.testDesignRepository.findById(candidate.testDesignId)
        : null;
      const candidateRequirement = await this.requirementRepository.findById(candidate.requirementId || requirementId);
      return {
        plan: candidate,
        design,
        requirementApprovalStatus: candidateRequirement?.approvalStatus,
      };
    }));
    this.executionSafetyService.assertSafe(executionEnvironment, safetyCandidates);

    const now = Date.now();
    const run = new ExecutionRunEntity(
      randomUUID(), plan.projectId, requirementId, plan.id, failureMode, 'Running', context,
      [], [],
      { totalSteps: 0, passed: 0, failed: 0, skipped: 0, blocked: 0, duration: 0, validationPassed: 0, validationFailed: 0, validationWarnings: 0 },
      now, now, null, profileId, profileMetadata, suiteId || null, explicitPlanIds || [plan.id], [], resolvedSuiteSnapshot,
    );
    const existingRun = existingRunId ? await this.executionRunRepository.findById(existingRunId) : null;
    if (existingRunId && !existingRun) throw new Error(`Execution run ${existingRunId} was not found for durable reclaim`);
    if (existingRun && existingRun.status !== 'Running' && existingRun.status !== 'Pending') return existingRun;
    const persistedRun = existingRun || await this.executionRunRepository.create(sensitiveDataRedactor.redactKnownValues(sensitiveDataRedactor.redact(run), secretValues));
    const cancellation = new AbortController();
    this.activeRuns.set(persistedRun.id, cancellation);
    // A durable worker records this link before the first suite step starts.
    // This makes an active run cancellable even though executeCombined awaits
    // the final result for backwards-compatible callers.
    if (!existingRun) await onRunCreated?.(persistedRun);

    // Execute each step
    const stepResults: ExecutionStepResult[] = [];
    const failedStepIds: Set<string> = new Set();

    for (const currentPlan of sortedPlans) {
      if (cancellation.signal.aborted) break;
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

      // An executable plan is protocol-neutral, but it must always carry a
      // resolvable contract operation identity. Do not let malformed legacy
      // rows reach Test Data resolution as an undefined JavaScript value.
      if (typeof currentPlan.operationId !== 'string' || !currentPlan.operationId.trim()) {
        throw new Error(`EXECUTION_PLAN_OPERATION_REFERENCE_INVALID: plan ${currentPlan.id} has no operationId`);
      }
      const stepOperation = await this.apiOperationRepository.findById(currentPlan.operationId);
      // Legacy plan fixtures may execute against a direct request URL without a
      // stored operation row. Their non-empty canonical operation ID remains
      // valid; only absent identities are rejected before Test Data resolution.
      const stepServiceId = stepOperation?.serviceId ?? '';

      // Resolve test data for this step
      let resolvedValues: Record<string, ResolvedValue>;
      try {
        resolvedValues = await this.testDataResolutionService.resolveRequestFields(
          currentPlan.projectId,
          stepServiceId,
          currentPlan.operationId,
          resolutionContext
        );
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Test data resolution failed for execution plan ${currentPlan.id}: ${detail}`);
      }

      // Load Test Design to get attached assertions
      const testDesign = await this.testDesignRepository.findById(currentPlan.testDesignId);
      const fieldRules = this.fieldDataRuleRepository ? await this.fieldDataRuleRepository.findByOperation(currentPlan.projectId, currentPlan.operationId) : [];
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
      // Execution plans are durable scheduling records, but the request body
      // itself is authoritative in the API workspace. Always start from the
      // operation's latest saved request sample so editing an endpoint does
      // not require recreating every plan. Deterministic test mutations are
      // then reapplied to that current body below.
      const liveRequestPlan = this.withLiveOperationRequestBody(
        dependencyResolution.plan,
        stepOperation,
        testDesign,
      );
      // Test designs are the source of truth for a generated scenario's
      // expected HTTP outcome. Plans are persisted separately and may retain
      // an outdated status assertion after a design is regenerated or edited.
      // Align the copied plan assertion at execution time so an intentional
      // 4xx response (for example invalid credentials expecting 401) passes.
      const expectedHttpStatus = Number(testDesign?.expectedHttpStatus);
      const planAssertions = (dependencyResolution.plan.assertions || []).map((assertion: any) => (
        assertion.type === 'status' && Number.isInteger(expectedHttpStatus) && expectedHttpStatus >= 100 && expectedHttpStatus <= 599
          ? { ...assertion, expected: expectedHttpStatus }
          : assertion
      ));
      const stepResult = await this.executeStep(
        {
          ...liveRequestPlan,
          __snapshotReferences: { requirement: { id: requirement.id, version: requirement.updatedAt }, operation: stepOperation ? { id: stepOperation.id, serviceId: stepOperation.serviceId, version: stepOperation.updatedAt } : undefined, environment: { id: selectedEnvironment.id, version: selectedEnvironment.updatedAt }, dataset: currentPlan.datasetId ? await this.datasetRepository.findById(currentPlan.datasetId) : undefined, fieldRules, testCaseVersionId: currentPlan.testCaseVersionId || undefined, mutation: testDesign?.mutationProvenance },
          assertions: [
            ...planAssertions,
            ...reusableAssertions.map((assertion) => ({
              type: assertion.type === 'Custom Assertion' ? 'custom' : assertion.type,
              operator: (assertion.expectedValue as any)?.operator || 'equals',
              path: assertion.expression,
              expected: assertion.expectedValue,
              reusableAssertionId: assertion.id,
            })),
          ],
        },
        context,
        resolvedValues,
        executionEnvironment.executionPolicy?.outboundEgressPolicy,
        executionEnvironment.tier,
        cancellation.signal,
      );
      
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
    // A cancellation may have been persisted by a controller/worker outside
    // this in-process controller map. Re-read before finalizing so late work
    // can never overwrite the terminal cancellation state.
    const storedRun = typeof (this.executionRunRepository as any).findById === 'function'
      ? await this.executionRunRepository.findById(persistedRun.id)
      : null;
    const finalStatus: RunStatus = cancellation.signal.aborted || storedRun?.status === 'Cancelled' ? 'Cancelled' : summary.failed > 0
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
      resolvedSuiteSnapshot
    );

    const result = await this.executionRunRepository.update(persistedRun.id, sensitiveDataRedactor.redactKnownValues(sensitiveDataRedactor.redact(updatedRun), secretValues));
    this.activeRuns.delete(persistedRun.id);

    // Publish through central EventPublisher — triggers audit, notification,
    // cache invalidation, recommendation refresh, and pipeline refresh.
    if (this.eventPublisher) {
      await this.eventPublisher.executed('execution', result.id, result.projectId, 'ExecutionRun', finalStatus);
    }

    return result;
  }

  private withLiveOperationRequestBody(plan: any, operation: any, design: any): any {
    const liveBody = operation?.sampleRequestBody;
    // The operation is the saved API-workspace source of truth. Keep its URL
    // alongside its body so an execution never falls back to the import-time
    // path saved in a test plan.
    const liveRequestUrl = typeof operation?.requestUrl === 'string' && operation.requestUrl.trim()
      ? operation.requestUrl
      : plan.requestTemplate?.path;
    const requestTemplate = {
      ...(plan.requestTemplate || {}),
      ...(liveRequestUrl ? { path: liveRequestUrl } : {}),
    };
    const mutation = design?.mutationProvenance;
    // Older approved suites may already contain their mutated payload in the
    // plan but have no mutation provenance metadata. Preserve that durable
    // approved body instead of replacing it with the unmutated live sample.
    if (!mutation && plan.requestTemplate?.body && typeof plan.requestTemplate.body === 'object') {
      return { ...plan, requestTemplate };
    }
    if (!liveBody || typeof liveBody !== 'object' || Array.isArray(liveBody)) {
      return { ...plan, requestTemplate };
    }
    const body = this.cloneValue(liveBody);
    // Baseline/positive cases intentionally use the complete current editor
    // body. For deterministic negative cases, replace only the one field
    // selected by the test mutation and preserve all other live values.
    if (mutation && mutation.location === 'body' && mutation.strategy !== 'baseline-valid') {
      this.applyBodyMutation(body, String(mutation.fieldPath || ''), mutation.mutatedValue);
    }
    return {
      ...plan,
      requestTemplate: {
        ...requestTemplate,
        body,
      },
    };
  }

  private applyBodyMutation(body: Record<string, unknown>, fieldPath: string, value: unknown): void {
    const parts = fieldPath.replace(/^\$\.?/, '').split('.').filter(Boolean);
    if (parts.length === 0) return;
    const applyAt = (cursor: Record<string, any> | any[], index: number): void => {
      if (Array.isArray(cursor)) {
        cursor.forEach((item) => { if (item && typeof item === 'object') applyAt(item, index); });
        return;
      }
      const rawPart = parts[index];
      const isArray = rawPart.endsWith('[]');
      const part = isArray ? rawPart.slice(0, -2) : rawPart;
      const last = index === parts.length - 1;
      if (last) {
        cursor[part] = value;
        return;
      }
      if (isArray) {
        if (!Array.isArray(cursor[part])) cursor[part] = [];
        applyAt(cursor[part], index + 1);
        return;
      }
      if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
      applyAt(cursor[part], index + 1);
    };
    applyAt(body, 0);
  }

  private async executeStep(
    plan: any,
    context: ExecutionContext,
    resolvedValues: Record<string, ResolvedValue> = {},
    egressPolicy?: Record<string, unknown>,
    environmentTier?: string,
    cancellationSignal?: AbortSignal,
  ): Promise<ExecutionStepResult> {
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
    const path = requestTemplate.path || '/';

    // Build URL. Canonical Field Data values are applied below using their
    // recorded input locations; legacy mappings retain their historical
    // header-only behavior when no location was persisted.
    let url = this.resolveRequestUrl(path, context);

    // Build headers (merge environment headers with request overrides)
    const headers: Record<string, string> = {
      ...context.headers,
      ...(requestTemplate.headers || {}),
    };

    // Resolve runtime variables in headers
    for (const [key, value] of Object.entries(headers)) {
      headers[key] = this.substituteVariables(value, context);
    }

    // Apply only header/cookie values to headers. The old adapter applied every
    // resolved field as a header, which meant body/query/path rules never
    // reached the outbound request.
    for (const [fieldPath, resolvedValue] of Object.entries(resolvedValues)) {
      const location = String(resolvedValue.location || 'HEADER').toUpperCase();
      if ((location === 'HEADER') && resolvedValue.value !== null && resolvedValue.value !== undefined) {
        headers[fieldPath] = String(resolvedValue.value);
      }
      if (location === 'COOKIE' && resolvedValue.value !== null && resolvedValue.value !== undefined) {
        const existing = headers.Cookie || headers.cookie || '';
        const remaining = existing.split(';').map(item => item.trim()).filter(Boolean).filter(item => !item.toLowerCase().startsWith(`${fieldPath.toLowerCase()}=`));
        remaining.push(`${fieldPath}=${String(resolvedValue.value)}`);
        headers.Cookie = remaining.join('; ');
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

    const setBodyPath = (target: any, fieldPath: string, value: unknown): void => {
      const parts = fieldPath.split('.').filter(Boolean);
      if (!parts.length || !target || typeof target !== 'object') return;
      const visit = (cursor: any, index: number): void => {
        const segment = parts[index]; const isArray = segment.endsWith('[]'); const name = isArray ? segment.slice(0, -2) : segment; const last = index === parts.length - 1;
        if (isArray) { const items = Array.isArray(cursor[name]) ? cursor[name] : []; items.forEach((item: any) => visit(item, index + 1)); return; }
        if (last) { if (value === undefined) delete cursor[name]; else cursor[name] = value; return; }
        if (!cursor[name] || typeof cursor[name] !== 'object') cursor[name] = {};
        visit(cursor[name], index + 1);
      };
      visit(target, 0);
    };
    for (const [fieldPath, resolvedValue] of Object.entries(resolvedValues)) {
      const location = String(resolvedValue.location || 'HEADER').toUpperCase();
      if (location === 'BODY') {
        if (!body || typeof body !== 'object') body = {};
        setBodyPath(body, fieldPath, resolvedValue.value);
      } else if (location === 'QUERY' || location === 'PATH') {
        const requestUrl = new URL(url);
        if (location === 'QUERY') {
          if (resolvedValue.value === undefined) requestUrl.searchParams.delete(fieldPath); else requestUrl.searchParams.set(fieldPath, String(resolvedValue.value));
        } else if (resolvedValue.value !== undefined) {
          requestUrl.pathname = decodeURIComponent(requestUrl.pathname).replace(`{${fieldPath}}`, encodeURIComponent(String(resolvedValue.value)));
        }
        url = requestUrl.toString();
      }
    }

    stepResult.request = { method, url, headers, body };
    stepResult.executionSnapshot = this.buildExecutionSnapshot(plan, context, { method, url, headers, body }, resolvedValues);

    // Resolved values and the request are built once per test execution, so
    // retry attempts retain Test Data scope and never consume/regenerate rows.
    const maxRetries = this.loadedProfile?.retryPolicy.enabled ? this.loadedProfile.retryPolicy.maxRetries : 0;
    const retryDelay = this.loadedProfile?.retryPolicy.retryDelay ?? 0;
    const attempts: NonNullable<ExecutionStepResult['attempts']> = [];
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      if (cancellationSignal?.aborted) break;
      if (attempt > 0 && retryDelay > 0) await this.waitForRetry(retryDelay, cancellationSignal);
      if (cancellationSignal?.aborted) break;
      const outcome = await this.executeAttempt(plan, context, { method, url, headers, body }, egressPolicy, environmentTier, attempt + 1, cancellationSignal);
      attempts.push(outcome.metadata);
      stepResult.response = outcome.response;
      stepResult.assertions = outcome.assertions;
      stepResult.validations = outcome.validations;
      stepResult.status = outcome.accepted ? 'Passed' : 'Failed';
      stepResult.error = outcome.error;
      if (outcome.accepted) {
        context.responses[plan.id] = outcome.rawResponse.data;
        stepResult.capturedVariables = this.captureRuntimeVariables(plan, outcome.rawResponse, context);
        break;
      }
      if (this.isCancellationError(outcome.error)) break;
    }
    stepResult.attempts = attempts;
    stepResult.completedAt = Date.now();

    return stepResult;
  }

  private buildExecutionSnapshot(plan: any, context: ExecutionContext, request: { method: string; url: string; headers: Record<string, string>; body: any }, resolvedValues: Record<string, ResolvedValue>) {
    const refs = plan.__snapshotReferences || {}; const source = (value: ResolvedValue): any => { const raw = String(value.sourceType || '').toUpperCase(); const category = raw.includes('DATASET') ? 'DATASET' : raw.includes('GENERAT') ? 'GENERATOR' : raw.includes('ENV') ? 'ENVIRONMENT' : raw.includes('SECRET') ? 'SECRET' : raw.includes('DEPEND') ? 'DEPENDENCY_RESPONSE' : raw.includes('RUNTIME') || raw.includes('REUSE') ? 'RUNTIME' : raw.includes('MANUAL') ? 'MANUAL_OVERRIDE' : 'STATIC'; return { source: category, reference: value.datasetId || value.rowId || value.variableName || value.envVariableName || value.columnName, fingerprint: value.value === undefined ? undefined : createHash('sha256').update(String(value.value)).digest('hex').slice(0, 16), reproducibility: category === 'GENERATOR' ? { generatorType: raw, status: 'PARTIAL' } : undefined }; };
    const sanitized = sensitiveDataRedactor.redact({ method: request.method, url: request.url, headers: request.headers, body: request.body });
    return { capturedAt: Date.now(), baseSnapshotId: randomUUID(), request: sanitized, testCaseVersionId: refs.testCaseVersionId, requirement: refs.requirement || { id: plan.requirementId || '' }, operation: refs.operation, environment: refs.environment || { id: context.environmentId }, dataset: refs.dataset ? { id: refs.dataset.id, version: refs.dataset.updatedAt, rowReference: plan.datasetRowReference } : { id: plan.datasetId, rowReference: plan.datasetRowReference }, resolvedFields: Object.entries(resolvedValues).map(([field, value]) => ({ field, ...source(value) })), fieldRuleIds: (refs.fieldRules || []).map((rule: any) => ({ id: rule.id, version: rule.updatedAt })), mutation: refs.mutation ? { strategy: refs.mutation.strategy, fieldPath: refs.mutation.fieldPath, location: refs.mutation.location } : undefined, dependencies: (plan.dependencies || []).map((d: any) => ({ sourceOperationId: d.sourceOperationId, sourcePath: d.sourceResponsePath, targetPath: d.targetRequestPath })), executionProfileId: this.loadedProfile?.id } as any;
  }

  private async executeAttempt(
    plan: any, context: ExecutionContext, request: { method: string; url: string; headers: Record<string, string>; body: any }, egressPolicy: Record<string, unknown> | undefined, environmentTier: string | undefined, attempt: number, cancellationSignal?: AbortSignal,
  ): Promise<{ accepted: boolean; response: ExecutionStepResult['response']; rawResponse?: any; assertions: ExecutionStepResult['assertions']; validations: ExecutionStepResult['validations']; error: string | null; metadata: NonNullable<ExecutionStepResult['attempts']>[number] }> {
    const startedAt = Date.now();
    try {
      const response = await this.httpExecutor.execute({ method: request.method.toLowerCase(), url: request.url, headers: request.headers, data: request.body, timeout: this.loadedProfile?.timeout || DEFAULT_TIMEOUT_MS, validateStatus: () => true, egressPolicy, environmentTier, signal: cancellationSignal });
      if (cancellationSignal?.aborted) throw new Error('Execution cancelled');
      const responseResult = { status: response.status, statusText: response.statusText, headers: this.normalizeHeaders(response.headers), body: response.data, duration: Date.now() - startedAt };
      const assertions = (plan.assertions || []).map((assertion: any) => {
        const actual = this.extractValue(response, assertion.path, assertion.type);
        return { type: assertion.type, operator: assertion.operator, path: assertion.path, expected: assertion.expected, actual, passed: this.validateAssertion(assertion, actual) };
      });
      const rules: ValidationRule[] = (plan.assertions || []).map((assertion: any, index: number) => ({ id: `validation-${index}`, executionPlanId: plan.id, name: `Validation ${index + 1}`, type: this.mapAssertionType(assertion.type, assertion.operator), config: { path: assertion.path, expected: assertion.type === 'status' ? Number(assertion.expected) : assertion.expected, operator: assertion.operator } }));
      const validations = ValidationEngine.validateStep(rules, { response, runtimeVariables: context.runtimeVariables }).validations;
      assertions.forEach((item: any, index: number) => {
        if (this.mapAssertionType(item.type, item.operator) === 'Custom Assertion') item.passed = validations[index]?.status === 'Passed';
      });
      // A test case may intentionally expect a non-2xx response (for example
      // a negative or security scenario expecting 400/401). The status
      // assertion, rather than a blanket 2xx check, determines success.
      const expectedStatusAssertion = assertions.find((item: any) => item.type === 'status');
      const statusAccepted = expectedStatusAssertion
        ? expectedStatusAssertion.passed
        : response.status >= 200 && response.status < 300;
      const accepted = statusAccepted && assertions.every((item: any) => item.passed) && validations.every((item) => item.status !== 'Failed');
      const error = accepted ? null : expectedStatusAssertion && !expectedStatusAssertion.passed ? `HTTP ${response.status}` : assertions.some((item: any) => !item.passed) ? 'Assertion failed' : 'Validation failed';
      return { accepted, response: responseResult, rawResponse: response, assertions, validations, error, metadata: { attempt, outcome: accepted ? 'Passed' : 'Failed', statusCode: response.status, error: error || undefined, startedAt, completedAt: Date.now() } };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      return { accepted: false, response: null, assertions: [], validations: [], error: message, metadata: { attempt, outcome: 'Failed', error: message.slice(0, 300), startedAt, completedAt: Date.now() } };
    }
  }

  private captureRuntimeVariables(plan: any, response: any, context: ExecutionContext): Record<string, any> {
    const captured: Record<string, any> = {};
    for (const binding of (plan.runtimeBindings || [])) {
      if (binding.source !== 'response') continue;
      const value = this.extractValue(response, binding.path, 'body');
      captured[binding.variable] = value;
      context.runtimeVariables[binding.variable] = value;
    }
    return captured;
  }

  private isCancellationError(error: string | null): boolean {
    return Boolean(error && /(cancelled|canceled|abort)/i.test(error));
  }

  private async waitForRetry(delay: number, signal?: AbortSignal): Promise<void> {
    if (!signal) return new Promise((resolve) => setTimeout(resolve, delay));
    const abortSignal = signal;
    await new Promise<void>((resolve) => {
      let timer: NodeJS.Timeout;
      function done() { clearTimeout(timer); abortSignal.removeEventListener('abort', done); resolve(); }
      timer = setTimeout(done, delay);
      abortSignal.addEventListener('abort', done, { once: true });
    });
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

  private resolveRequestUrl(pathOrUrl: string, context: ExecutionContext): string {
    const resolvedTarget = this.substituteVariables(String(pathOrUrl || '/'), context).trim();
    const unresolved = resolvedTarget.match(/\{\{[^}]+\}\}/);
    if (unresolved) {
      throw new Error(`Unable to resolve request URL variable ${unresolved[0]}`);
    }

    // API workspace URLs may already be absolute after environment-variable
    // substitution (for example {{ident_base_url}}/auth/login). In that case
    // do not prepend the environment base URL a second time.
    if (/^https?:\/\//i.test(resolvedTarget)) {
      return resolvedTarget;
    }

    const baseUrl = this.substituteVariables(String(context.baseUrl || ''), context).replace(/\/+$/, '');
    if (!baseUrl) {
      throw new Error('Execution environment has no base URL');
    }
    const unresolvedBase = baseUrl.match(/\{\{[^}]+\}\}/);
    if (unresolvedBase) {
      throw new Error(`Unable to resolve environment base URL variable ${unresolvedBase[0]}`);
    }
    return `${baseUrl}/${resolvedTarget.replace(/^\/+/, '')}`;
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

  private mapAssertionType(type: string, operator?: string): string {
    const typeMap: Record<string, string> = {
      'status': 'HTTP Status',
      'header': 'Header Exists',
      'jsonPath': 'JSON Path Exists',
      'body': operator === 'exists' ? 'JSON Path Exists' : 'Response Body Contains',
    };
    return typeMap[type] || 'Custom Assertion';
  }

  private validateAssertion(assertion: any, actual: any): boolean {
    switch (assertion.operator) {
      case 'equals':
        // HTTP status values can arrive from generated test designs as either
        // numbers or numeric strings. Compare them by value so a valid 401,
        // 400, etc. response is not reported as a false failure.
        if (assertion.type === 'status') {
          const expectedStatus = Number(assertion.expected);
          const actualStatus = Number(actual);
          return Number.isFinite(expectedStatus) && Number.isFinite(actualStatus)
            ? actualStatus === expectedStatus
            : actual === assertion.expected;
        }
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
