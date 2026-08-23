import { randomUUID } from 'node:crypto';
import { TestDesignEntity } from '../../domain/requirements/TestDesignEntity.js';
import { TestDesignRepository } from '../../domain/requirements/TestDesignRepository.js';
import type { ApiOperationEntity } from '../../domain/api/ApiOperationEntity.js';
import { SchemaAwareMutationEngine } from './SchemaAwareMutationEngine.js';

/** Persists deterministic contract mutations independently from AI semantic designs. */
export class GenerateSchemaAwareTestDesigns {
  constructor(private readonly testDesignRepository: TestDesignRepository, private readonly engine = new SchemaAwareMutationEngine()) {}

  async execute(input: { requirementId: string; strategyItemId: string; operation: ApiOperationEntity; environmentId?: string; maxCases?: number }): Promise<TestDesignEntity[]> {
    const source = input.operation.sourceOperation;
    if (!source) return [];
    const cases = this.engine.generateOpenApi(source, input.maxCases);
    const designs = cases.map((generated) => new TestDesignEntity(
      randomUUID(), input.operation.projectId, input.requirementId, input.strategyItemId, generated.title,
      input.operation.id, input.environmentId || '', '', '', generated.requestOverrides, [], generated.assertions, [],
      'Medium', 'Ready', Date.now(), Date.now(), [], generated.provenance.strategy === 'baseline-valid' ? 'Positive' : 'Negative',
      undefined, 'matcher', 'confirmed', 100, undefined, undefined, [], generated.provenance,
    ));
    const seen = new Set<string>();
    const unique = designs.filter((design) => { const key = JSON.stringify({ request: design.requestOverrides, provenance: design.mutationProvenance }); if (seen.has(key)) return false; seen.add(key); return true; });
    return Promise.all(unique.map((design) => this.testDesignRepository.create(design)));
  }
}

export default GenerateSchemaAwareTestDesigns;
