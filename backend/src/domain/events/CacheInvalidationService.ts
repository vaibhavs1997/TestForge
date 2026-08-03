// CacheInvalidationService - Handles cache invalidation for dependent modules
import { EventBus, DomainEvent, ModuleName } from './EventBus';

export class CacheInvalidationService {
  constructor(private readonly eventBus: EventBus) {
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    // API Import → Environment Detection, Dataset Suggestions, Project Analysis, Recommendations
    this.eventBus.subscribe('IMPORTED', 'api', (event) => {
      this.invalidateModule(event.projectId, 'environment');
      this.invalidateModule(event.projectId, 'dataset');
      this.invalidateModule(event.projectId, 'analysis');
      this.invalidateModule(event.projectId, 'recommendation');
    });

    // Knowledge Update → Analysis, Requirements
    this.eventBus.subscribe('UPDATED', 'knowledge', (event) => {
      this.invalidateModule(event.projectId, 'analysis');
      this.invalidateModule(event.projectId, 'requirements');
    });

    // Requirement Approval → Readiness, Strategy
    this.eventBus.subscribe('APPROVED', 'requirements', (event) => {
      this.invalidateModule(event.projectId, 'strategy');
    });

    // Strategy Change → Test Design
    this.eventBus.subscribe('UPDATED', 'strategy', (event) => {
      this.invalidateModule(event.projectId, 'design');
    });

    // Design Change → Execution Plan
    this.eventBus.subscribe('UPDATED', 'design', (event) => {
      this.invalidateModule(event.projectId, 'execution');
    });

    // Execution Plan Change → Pipeline
    this.eventBus.subscribe('UPDATED', 'execution', (event) => {
      this.invalidateModule(event.projectId, 'pipeline');
    });
  }

  private async invalidateModule(projectId: string, module: ModuleName): Promise<void> {
    // Publish invalidation event for the module
    await this.eventBus.publish({
      type: 'INVALIDATED',
      module,
      entityId: projectId,
      projectId,
      timestamp: Date.now(),
      payload: { reason: 'dependency_change' }
    });
  }
}

export default CacheInvalidationService;