// CacheInvalidationService - Handles cache invalidation for dependent modules
// Subscribes to entity-change events and publishes INVALIDATED events so that
// Recommendation Refresh and Pipeline Refresh subscribers can react.
import { EventBus, DomainEvent, ModuleName } from './EventBus';

export class CacheInvalidationService {
  constructor(private readonly eventBus: EventBus) {
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    // API Import / change → Environment Detection, Dataset Suggestions, Project Analysis, Recommendations
    this.eventBus.subscribe('IMPORTED', 'api', (event) => {
      this.invalidateModule(event.projectId, 'environment');
      this.invalidateModule(event.projectId, 'dataset');
      this.invalidateModule(event.projectId, 'analysis');
      this.invalidateModule(event.projectId, 'recommendation');
    });
    this.eventBus.subscribe('UPDATED', 'api', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'analysis');
      this.invalidateModule(event.projectId, 'recommendation');
    });
    this.eventBus.subscribe('DELETED', 'api', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'recommendation');
    });

    // Environment change → Analysis, Recommendations, Pipeline
    this.eventBus.subscribe('IMPORTED', 'environment', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'analysis');
      this.invalidateModule(event.projectId, 'recommendation');
      this.invalidateModule(event.projectId, 'pipeline');
    });
    this.eventBus.subscribe('UPDATED', 'environment', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'recommendation');
      this.invalidateModule(event.projectId, 'pipeline');
    });

    // Dataset change → Analysis, Recommendations
    this.eventBus.subscribe('IMPORTED', 'dataset', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'analysis');
      this.invalidateModule(event.projectId, 'recommendation');
    });
    this.eventBus.subscribe('UPDATED', 'dataset', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'recommendation');
    });
    this.eventBus.subscribe('DELETED', 'dataset', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'recommendation');
    });

    // Knowledge change → Analysis, Requirements
    this.eventBus.subscribe('UPDATED', 'knowledge', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'analysis');
      this.invalidateModule(event.projectId, 'requirements');
    });
    this.eventBus.subscribe('IMPORTED', 'knowledge', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'analysis');
      this.invalidateModule(event.projectId, 'recommendation');
    });
    this.eventBus.subscribe('DELETED', 'knowledge', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'analysis');
      this.invalidateModule(event.projectId, 'recommendation');
    });

    // Requirement Approval → Readiness, Strategy
    this.eventBus.subscribe('APPROVED', 'requirements', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'strategy');
      this.invalidateModule(event.projectId, 'recommendation');
    });
    this.eventBus.subscribe('REJECTED', 'requirements', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'recommendation');
    });

    // Requirement change → Strategy, Design, Execution
    this.eventBus.subscribe('IMPORTED', 'requirements', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'strategy');
      this.invalidateModule(event.projectId, 'recommendation');
    });
    this.eventBus.subscribe('UPDATED', 'requirements', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'strategy');
      this.invalidateModule(event.projectId, 'recommendation');
    });
    this.eventBus.subscribe('DELETED', 'requirements', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'strategy');
      this.invalidateModule(event.projectId, 'recommendation');
    });

    // Strategy Change → Test Design
    this.eventBus.subscribe('IMPORTED', 'strategy', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'design');
      this.invalidateModule(event.projectId, 'recommendation');
    });
    this.eventBus.subscribe('UPDATED', 'strategy', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'design');
      this.invalidateModule(event.projectId, 'recommendation');
    });
    this.eventBus.subscribe('GENERATED', 'strategy', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'design');
      this.invalidateModule(event.projectId, 'execution');
    });

    // Design Change → Execution Plan
    this.eventBus.subscribe('IMPORTED', 'design', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'execution');
      this.invalidateModule(event.projectId, 'recommendation');
    });
    this.eventBus.subscribe('UPDATED', 'design', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'execution');
      this.invalidateModule(event.projectId, 'recommendation');
    });
    this.eventBus.subscribe('GENERATED', 'design', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'execution');
    });

    // Execution Plan Change → Pipeline
    this.eventBus.subscribe('IMPORTED', 'execution', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'pipeline');
      this.invalidateModule(event.projectId, 'recommendation');
    });
    this.eventBus.subscribe('UPDATED', 'execution', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'pipeline');
    });

    // Execution Profile, Assertion, Suite, Report changes → Recommendation + Pipeline
    for (const module of ['execution', 'assertion', 'suite', 'report']) {
      for (const eventType of ['IMPORTED', 'UPDATED', 'DELETED', 'GENERATED', 'ENABLED', 'DISABLED']) {
        this.eventBus.subscribe(eventType as any, module as ModuleName, (event: DomainEvent) => {
          this.invalidateModule(event.projectId, 'recommendation');
          this.invalidateModule(event.projectId, 'pipeline');
        });
      }
    }

    // Schedule run completion → Pipeline
    this.eventBus.subscribe('COMPLETED', 'scheduler', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'pipeline');
    });
    this.eventBus.subscribe('FAILED', 'scheduler', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'pipeline');
    });

    // Execution run completion → Pipeline
    this.eventBus.subscribe('COMPLETED', 'execution', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'pipeline');
    });
    this.eventBus.subscribe('FAILED', 'execution', (event: DomainEvent) => {
      this.invalidateModule(event.projectId, 'pipeline');
    });
  }

  private async invalidateModule(projectId: string, module: ModuleName): Promise<void> {
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
