import { randomUUID } from 'node:crypto';
import { TestDesignEntity } from '../../domain/requirements/TestDesignEntity.js';
import { TestDesignRepository } from '../../domain/requirements/TestDesignRepository.js';
import type { ApiOperationEntity } from '../../domain/api/ApiOperationEntity.js';
import { SchemaAwareMutationEngine } from './SchemaAwareMutationEngine.js';
import type { RequirementRepository } from '../../domain/requirements/RequirementRepository.js';
import type { GenerationProvenanceService } from './GenerationProvenanceService.js';
import { ConflictError } from '../../shared/errors.js';

/** Persists deterministic contract mutations independently from AI semantic designs. */
export class GenerateSchemaAwareTestDesigns {
  constructor(
    private readonly testDesignRepository: TestDesignRepository,
    private readonly engine = new SchemaAwareMutationEngine(),
    private readonly requirementRepository?: RequirementRepository,
    private readonly provenanceService?: GenerationProvenanceService,
  ) {}

  async execute(input: { requirementId: string; strategyItemId: string; operation: ApiOperationEntity; environmentId?: string; maxCases?: number }): Promise<TestDesignEntity[]> {
    if (!this.requirementRepository || !this.provenanceService) {
      throw new ConflictError('Schema-aware generation requires canonical requirement and provenance context.');
    }
    const requirement = await this.requirementRepository.findById(input.requirementId);
    if (!requirement) throw new ConflictError('Schema-aware generation requires an existing requirement.');
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
    const persisted = await Promise.all(unique.map((design) => this.testDesignRepository.create(design)));
    return this.provenanceService.captureGeneratedDesigns({ requirement, designs: persisted, mode: 'DETERMINISTIC' });
  }
}

export default GenerateSchemaAwareTestDesigns;
