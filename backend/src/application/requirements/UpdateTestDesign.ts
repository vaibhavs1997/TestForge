import type { TestDesignRepository } from '../../domain/requirements/TestDesignRepository.js';
import type { ApiOperationRepository } from '../../domain/api/ApiOperationRepository.js';
import type { TestStrategyRepository } from '../../domain/requirements/TestStrategyRepository.js';
import type {
  DesignStatus,
  RequestOverride,
  TestDesignEntity,
} from '../../domain/requirements/TestDesignEntity.js';
import type { StrategyCategory, TestStrategyEntity } from '../../domain/requirements/TestStrategyEntity.js';
import { buildPayloadForScenario } from './RequirementOperationMatcher.js';
import { requirementEndpointMappingService } from './RequirementEndpointMappingService.js';

export interface UpdateTestDesignRequest {
  testDesignId: string;
  status?: DesignStatus;
  operationId?: string;
  requestOverrides?: RequestOverride;
  rebuildPayload?: boolean;
}

export class UpdateTestDesign {
  constructor(
    private readonly testDesignRepository: TestDesignRepository,
    private readonly apiOperationRepository: ApiOperationRepository,
    private readonly testStrategyRepository: TestStrategyRepository,
  ) {}

  async execute(request: UpdateTestDesignRequest): Promise<TestDesignEntity> {
    const existing = await this.testDesignRepository.findById(request.testDesignId);
    if (!existing) {
      throw new Error(`Test design with id ${request.testDesignId} not found`);
    }

    const hasStatus = request.status !== undefined;
    const hasOperation = Boolean(request.operationId);
    const hasOverrides = request.requestOverrides !== undefined;
    const rebuild = request.rebuildPayload === true;

    if (!hasStatus && !hasOperation && !hasOverrides && !rebuild) {
      throw new Error('Provide status, operationId, requestOverrides, or rebuildPayload');
    }

    if (hasStatus && !['Draft', 'Ready', 'Disabled'].includes(request.status!)) {
      throw new Error('Invalid status. Must be Draft, Ready, or Disabled');
    }

    const patch: {
      status?: DesignStatus;
      operationId?: string;
      requestOverrides?: RequestOverride;
      mappingProvenance?: 'ai' | 'matcher' | 'user';
      mappingState?: 'confirmed' | 'review' | 'unmapped';
      mappingConfidence?: number;
    } = {};
    if (hasStatus) {
      patch.status = request.status;
    }

    const operationId = request.operationId ?? existing.operationId;
    const operationChanged = hasOperation && request.operationId !== existing.operationId;

    if (operationChanged && request.operationId) {
      const operations = await this.apiOperationRepository.findByProject(existing.projectId);
      if (!requirementEndpointMappingService.validateOperation(request.operationId, operations, operations)) {
        throw new Error(`API operation ${request.operationId} not found in this project`);
      }
      patch.operationId = request.operationId;
      patch.mappingProvenance = 'user';
      patch.mappingState = 'confirmed';
      patch.mappingConfidence = 100;
    }

    let requestOverrides: RequestOverride = {
      ...existing.requestOverrides,
      ...(request.requestOverrides ?? {}),
    };

    if (operationChanged || rebuild) {
      const operations = await this.apiOperationRepository.findByProject(existing.projectId);
      const operation = operations.find((o) => o.id === operationId);
      if (!operation && operationId) {
        throw new Error(`API operation ${operationId} not found in this project`);
      }

      const strategy = (await this.testStrategyRepository.findByRequirement(
        existing.requirementId,
      )) as TestStrategyEntity | null;
      const { category, focusFieldId, scenarioKind } = this.resolveStrategyContext(existing, strategy);
      const body = buildPayloadForScenario(category, operation, { focusFieldId, scenarioKind });
      requestOverrides = {
        ...requestOverrides,
        body: Object.keys(body).length > 0 ? body : requestOverrides.body,
      };
    }

    if (hasOverrides || operationChanged || rebuild) {
      patch.requestOverrides = requestOverrides;
    }

    return this.testDesignRepository.update(request.testDesignId, patch as Partial<TestDesignEntity>);
  }

  private resolveStrategyContext(
    design: TestDesignEntity,
    strategy: TestStrategyEntity | null,
  ): {
    category: StrategyCategory;
    focusFieldId?: string;
    scenarioKind?: 'missing_field' | 'invalid_field' | 'duplicate' | 'default';
  } {
    if (!strategy) {
      return { category: 'Positive' };
    }
    for (const section of strategy.sections) {
      const item = section.items.find((i) => i.id === design.strategyItemId);
      if (item) {
        return {
          category: section.category,
          focusFieldId: item.focusFieldId,
          scenarioKind: item.scenarioKind,
        };
      }
    }
    return { category: 'Positive' };
  }
}

export default UpdateTestDesign;
