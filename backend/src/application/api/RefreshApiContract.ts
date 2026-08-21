// RefreshApiContract - Re-import a stored source contract when the canonical source is still available.
import { ApiServiceRepository } from '../../domain/api/ApiServiceRepository.js';
import { ImportApiContract, type ImportSummary } from './ImportApiContract.js';

export interface RefreshApiContractResult {
  refreshed: boolean;
  refreshRequired: boolean;
  reason?: string;
  summary?: ImportSummary;
}

export class RefreshApiContract {
  constructor(
    private readonly apiServiceRepository: ApiServiceRepository,
    private readonly importApiContract: ImportApiContract,
  ) {}

  async execute(projectId: string, serviceId: string): Promise<RefreshApiContractResult> {
    const service = await this.apiServiceRepository.findById(serviceId);
    if (!service || service.projectId !== projectId) {
      throw new Error(`Service with id ${serviceId} not found`);
    }

    if (!service.sourceContract) {
      return {
        refreshed: false,
        refreshRequired: true,
        reason: 'Original contract unavailable for this legacy import.',
      };
    }

    const summary = await this.importApiContract.execute({
      projectId,
      fileName: `${service.name || 'contract'}.openapi.json`,
      content: JSON.stringify(service.sourceContract),
      preserveUnmatchedOperations: true,
    });

    return {
      refreshed: true,
      refreshRequired: false,
      summary,
    };
  }
}

export default RefreshApiContract;
