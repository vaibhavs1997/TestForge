import {
  type EnvironmentExecutionPolicy,
  type EnvironmentTier,
  EnvironmentEntity,
  normalizeEnvironmentTier,
  resolveEnvironmentExecutionPolicy,
} from '../../domain/environment/EnvironmentEntity.js';
import type { ExecutionPlanEntity } from '../../domain/requirements/ExecutionPlanEntity.js';
import type { TestDesignEntity } from '../../domain/requirements/TestDesignEntity.js';
import { AppError } from '../../shared/errors.js';
import { ERROR_CODES } from '../../shared/ApiResponse.js';

export interface OperationRisk {
  method: string;
  destructive: boolean;
}

/** Single authority for HTTP operation risk classification. */
export class OperationRiskClassifier {
  classify(method: string | undefined | null): OperationRisk {
    const normalizedMethod = String(method || 'GET').toUpperCase();
    return {
      method: normalizedMethod,
      destructive: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod),
    };
  }
}

export interface ExecutionSafetyCandidate {
  plan: ExecutionPlanEntity | Record<string, unknown>;
  design: TestDesignEntity | null;
  requirementApprovalStatus?: string;
}

export class ExecutionSafetyError extends AppError {
  constructor(public readonly reasons: string[]) {
    super(400, `Execution safety blocked: ${reasons.join(' ')}`, ERROR_CODES.BAD_REQUEST);
    this.name = 'ExecutionSafetyError';
    Object.setPrototypeOf(this, ExecutionSafetyError.prototype);
  }
}

/** Enforces environment execution policy before any execution run is created. */
export class ExecutionSafetyService {
  constructor(private readonly operationRiskClassifier = new OperationRiskClassifier()) {}

  assertSafe(environment: EnvironmentEntity, candidates: ExecutionSafetyCandidate[]): void {
    const tier: EnvironmentTier = normalizeEnvironmentTier(environment.tier);
    const policy = resolveEnvironmentExecutionPolicy(tier, environment.executionPolicy);
    const reasons = candidates.flatMap((candidate) => this.evaluateCandidate(tier, policy, candidate));
    if (reasons.length > 0) throw new ExecutionSafetyError([...new Set(reasons)]);
  }

  private evaluateCandidate(
    tier: EnvironmentTier,
    policy: EnvironmentExecutionPolicy,
    candidate: ExecutionSafetyCandidate,
  ): string[] {
    const plan = candidate.plan as ExecutionPlanEntity;
    const design = candidate.design;
    const risk = this.operationRiskClassifier.classify(plan.requestTemplate?.method);
    const label = `Execution plan "${plan.id}"`;
    const reasons: string[] = [];
    const manuallyApprovedMapping = design?.mappingProvenance === 'user' && design.mappingState === 'confirmed';
    const hasMappingMetadata = Boolean(design && (
      Object.prototype.hasOwnProperty.call(design, 'mappingProvenance')
      || Object.prototype.hasOwnProperty.call(design, 'mappingState')
      || Object.prototype.hasOwnProperty.call(design, 'mappingConfidence')
    ));
    const lowConfidenceMapping = !manuallyApprovedMapping && (
      tier === 'PRODUCTION'
        ? !design?.operationId || design.mappingState !== 'confirmed' || design.mappingConfidence < policy.mappingConfidenceThreshold
        : hasMappingMetadata && (!design?.operationId || design.mappingState !== 'confirmed' || design.mappingConfidence < policy.mappingConfidenceThreshold)
    );
    const generatedMutation = !manuallyApprovedMapping && Boolean(
      design && (design.mappingProvenance !== 'user')
      && (design.requestOverrides?.body || design.requestOverrides?.headers || design.requestOverrides?.queryParams)
    );
    const securityTest = design?.testCaseType === 'Security';
    const performanceTest = /\b(performance|load|stress|soak)\b/i.test(design?.title || '');

    if (!policy.allowedHttpMethods.includes(risk.method)) {
      reasons.push(`${label} is blocked: HTTP ${risk.method} is not allowed in ${tier}.`);
    }
    if (risk.destructive && !policy.allowDestructiveOperations) {
      reasons.push(`${label} is blocked: destructive HTTP ${risk.method} operations are not allowed in ${tier}.`);
    }
    if (generatedMutation && !policy.allowGeneratedMutation) {
      reasons.push(`${label} is blocked: generated or mutated requests are not allowed in ${tier}.`);
    }
    if (securityTest && !policy.allowSecurityTests) {
      reasons.push(`${label} is blocked: security tests are not allowed in ${tier}.`);
    }
    if (performanceTest && !policy.allowPerformanceTests) {
      reasons.push(`${label} is blocked: performance tests are not allowed in ${tier}.`);
    }
    if (lowConfidenceMapping) {
      reasons.push(`${label} is blocked: endpoint mapping is unresolved or below the ${policy.mappingConfidenceThreshold}% confidence threshold and has not been manually approved.`);
    }
    if (policy.requireApproval && candidate.requirementApprovalStatus !== 'Approved') {
      reasons.push(`${label} is blocked: ${tier} requires an approved requirement before execution.`);
    }
    return reasons;
  }
}

export default ExecutionSafetyService;
