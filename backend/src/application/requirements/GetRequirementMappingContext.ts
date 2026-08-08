import type { RequirementRepository } from '../../domain/requirements/RequirementRepository';
import type { ApiOperationRepository } from '../../domain/api/ApiOperationRepository';
import { getOperationMatchDiagnostics, mappingConfidencePercent } from './RequirementOperationMatcher';

export interface OperationMatchDto {
  operationId: string;
  serviceId: string;
  name: string;
  method: string;
  path: string;
  score: number;
}

export interface RequirementMappingContext {
  requirementId: string;
  lowConfidence: boolean;
  mappingConfidencePercent: number;
  primaryOperationId: string | null;
  rankedOperations: OperationMatchDto[];
  message: string;
}

export class GetRequirementMappingContext {
  constructor(
    private readonly requirementRepository: RequirementRepository,
    private readonly apiOperationRepository: ApiOperationRepository,
  ) {}

  async execute(requirementId: string): Promise<RequirementMappingContext> {
    const requirement = await this.requirementRepository.findById(requirementId);
    if (!requirement) {
      throw new Error(`Requirement with id ${requirementId} not found`);
    }

    const operations = await this.apiOperationRepository.findByProject(requirement.projectId);
    const diagnostics = getOperationMatchDiagnostics(requirement, operations);

    const rankedOperations: OperationMatchDto[] = diagnostics.ranked.map((entry) => ({
      operationId: entry.operation.id,
      serviceId: entry.operation.serviceId,
      name: entry.operation.name,
      method: entry.operation.method,
      path: entry.operation.path,
      score: entry.score,
    }));

    let message = 'Operations ranked from acceptance criteria and API metadata.';
    if (operations.length === 0) {
      message = 'No API operations imported for this project. Import OpenAPI or Postman first.';
    } else if (diagnostics.lowConfidence) {
      message =
        'Automatic mapping confidence is low. Review the suggested API per test case or pick an operation manually.';
    }

    return {
      requirementId,
      lowConfidence: diagnostics.lowConfidence,
      mappingConfidencePercent: mappingConfidencePercent(diagnostics, operations.length),
      primaryOperationId: rankedOperations[0]?.operationId ?? null,
      rankedOperations,
      message,
    };
  }
}

export default GetRequirementMappingContext;
