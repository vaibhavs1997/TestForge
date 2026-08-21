import { describe, expect, it } from 'vitest';
import { EnvironmentEntity, resolveEnvironmentExecutionPolicy } from '../../domain/environment/EnvironmentEntity.js';
import { ExecutionSafetyError, ExecutionSafetyService, OperationRiskClassifier } from './ExecutionSafetyService.js';

const now = Date.now();

function environment(tier: 'LOCAL' | 'DEVELOPMENT' | 'TEST' | 'STAGING' | 'PRODUCTION', executionPolicy: any = null) {
  return new EnvironmentEntity('env-1', 'project-1', tier, 'https://example.test', '', null, {}, 30000, now, now, false, tier, executionPolicy);
}

function candidate(overrides: any = {}) {
  return {
    plan: { id: 'plan-1', requestTemplate: { method: 'GET' } },
    design: {
      id: 'design-1',
      operationId: 'operation-1',
      mappingProvenance: 'matcher',
      mappingState: 'confirmed',
      mappingConfidence: 95,
      requestOverrides: {},
      title: 'Returns account',
      testCaseType: 'Positive',
      ...overrides.design,
    },
    requirementApprovalStatus: 'Approved',
    ...overrides,
  } as any;
}

describe('ExecutionSafetyService', () => {
  it('centralizes destructive HTTP method classification', () => {
    const classifier = new OperationRiskClassifier();
    expect(classifier.classify('GET').destructive).toBe(false);
    expect(classifier.classify('HEAD').destructive).toBe(false);
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(classifier.classify(method).destructive).toBe(true);
    }
  });

  it('provides restrictive production defaults and accepts configurable policy thresholds', () => {
    expect(resolveEnvironmentExecutionPolicy('PRODUCTION')).toMatchObject({
      allowGeneratedMutation: false,
      allowDestructiveOperations: false,
      allowSecurityTests: false,
      allowPerformanceTests: false,
      requireApproval: true,
      allowedHttpMethods: ['GET', 'HEAD', 'OPTIONS'],
    });
    expect(resolveEnvironmentExecutionPolicy('TEST', { mappingConfidenceThreshold: 85 }).mappingConfidenceThreshold).toBe(85);
  });

  it('blocks production destructive and generated mutations with explicit reasons', () => {
    const service = new ExecutionSafetyService();
    expect(() => service.assertSafe(environment('PRODUCTION'), [candidate({
      plan: { id: 'plan-1', requestTemplate: { method: 'POST' } },
      design: { requestOverrides: { body: { enabled: false } } },
    })])).toThrow(/Execution safety blocked:.*HTTP POST.*destructive HTTP POST.*generated or mutated/i);
  });

  it('blocks mappings below the configured confidence threshold', () => {
    const service = new ExecutionSafetyService();
    expect(() => service.assertSafe(environment('TEST', { mappingConfidenceThreshold: 90 }), [candidate({
      design: { mappingConfidence: 89 },
    })])).toThrow(/below the 90% confidence threshold/);
  });

  it('allows a manually confirmed mapping for an approved safe production GET', () => {
    const service = new ExecutionSafetyService();
    expect(() => service.assertSafe(environment('PRODUCTION'), [candidate({
      design: { mappingProvenance: 'user', mappingState: 'confirmed', mappingConfidence: 0 },
    })])).not.toThrow();
  });

  it('returns all production safety reasons in a typed execution error', () => {
    const service = new ExecutionSafetyService();
    try {
      service.assertSafe(environment('PRODUCTION'), [candidate({
        design: { mappingState: 'review', mappingConfidence: 20, testCaseType: 'Security', title: 'Load test' },
        requirementApprovalStatus: 'Draft',
      })]);
      throw new Error('expected safety block');
    } catch (error) {
      expect(error).toBeInstanceOf(ExecutionSafetyError);
      expect((error as ExecutionSafetyError).reasons.join(' ')).toMatch(/security tests.*performance tests.*confidence.*approved requirement/i);
    }
  });
});
