import { describe, expect, it } from 'vitest';
import { GenerationProvenanceService } from './GenerationProvenanceService.js';
import { RequirementEntity } from '../../domain/requirements/RequirementEntity.js';
import { TestDesignEntity } from '../../domain/requirements/TestDesignEntity.js';
import { ApiOperationEntity } from '../../domain/api/ApiOperationEntity.js';

const requirement = () => new RequirementEntity('req-1', 'project-1', 'Create order', 'secret=do-not-copy', 'Functional', 80, 'Manual', null, 'Reviewed', 'Approved', [], ['flow-1'], ['dataset-1'], [{ id: 'ac-1', text: 'Create an order' }], 10, 20);
const operation = () => new ApiOperationEntity('op-1', 'project-1', 'service-1', 'createOrder', 'POST', '/orders', '', 'Bearer', 'Active', 30, 40);
const design = () => new TestDesignEntity('design-1', 'project-1', 'req-1', 'strategy-1', 'Create order with invalid quantity', 'op-1', 'env-1', 'dataset-1', 'row-1', { headers: { Authorization: 'Bearer secret-token' } }, [], [], [], 'High', 'Ready', 50, 50, [], 'Negative', 400, 'matcher', 'review', 64, 'ac-1', 'scenario-1', [], { strategy: 'boundary', location: 'body', fieldPath: '$.quantity', schemaRule: 'minimum', originalValue: 1, mutatedValue: -1 });

describe('GenerationProvenanceService', () => {
  it('captures deterministic requirement, operation, mapping, knowledge, schema, and safe test-data references', () => {
    const result = new GenerationProvenanceService().build({ requirement: requirement(), design: design(), operation: operation(), mode: 'DETERMINISTIC' });
    expect(result.mode).toBe('DETERMINISTIC');
    expect(result.requirement).toEqual({ id: 'req-1', version: 20 });
    expect(result.acceptanceCriteria).toEqual([{ id: 'ac-1', version: 20 }]);
    expect(result.operation).toMatchObject({ id: 'op-1', serviceId: 'service-1', operationVersion: 40 });
    expect(result.mapping).toEqual({ confidence: 64, state: 'review', provenance: 'matcher' });
    expect(result.knowledgeSourceIds).toEqual(['flow-1']);
    expect(result.testData).toEqual({ datasetId: 'dataset-1', fieldRuleIds: [], sourceFields: ['$.quantity'] });
    expect(JSON.stringify(result)).not.toContain('secret-token');
    expect(JSON.stringify(result)).not.toContain('do-not-copy');
    expect(JSON.stringify(result)).not.toContain('mutatedValue');
  });

  it('distinguishes genuine AI output from an AI failure fallback', () => {
    const service = new GenerationProvenanceService();
    const ai = service.build({ requirement: requirement(), design: design(), operation: operation(), mode: 'AI_GENERATED', ai: { providerId: 'p-1', provider: 'OpenAI', model: 'test-model', promptTemplateId: 'tmpl', promptVersion: '1' } });
    const fallback = service.build({ requirement: requirement(), design: design(), operation: operation(), mode: 'FALLBACK', fallbackReason: 'token=top-secret provider failure' });
    expect(ai.ai).toMatchObject({ providerId: 'p-1', model: 'test-model' });
    expect(ai.fallback).toBeUndefined();
    expect(fallback.ai).toBeUndefined();
    expect(fallback.fallback?.reason).toContain('[REDACTED]');
  });

  it('retains field-rule identifiers without their source or secret values', () => {
    const result = new GenerationProvenanceService().build({ requirement: requirement(), design: design(), operation: operation(), mode: 'DETERMINISTIC', fieldRuleIds: ['rule-1'] });
    expect(result.testData.fieldRuleIds).toEqual(['rule-1']);
    expect(JSON.stringify(result)).not.toContain('Bearer');
  });
});
