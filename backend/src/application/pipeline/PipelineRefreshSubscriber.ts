// PipelineRefreshSubscriber - Refreshes pipeline state when project dependencies change
// Subscribes to INVALIDATED events without triggering generation side effects.
import { EventBus, DomainEvent } from '../../domain/events/EventBus';

export class PipelineRefreshSubscriber {
  constructor(
    private readonly eventBus: EventBus
  ) {
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    // When the pipeline module is invalidated, refresh pipeline state
    this.eventBus.subscribe('INVALIDATED', 'pipeline', (event) => this.refreshPipeline(event));
  }

  private async refreshPipeline(event: DomainEvent): Promise<void> {
    try {
      // Refresh events must not run the full pipeline. Requirement generation
      // is an explicit user action and must not recreate deleted records.
      void event;
    } catch (error) {
      // Pipeline refresh is best-effort — a failed refresh should not break
      // the originating operation. The pipeline can still be triggered manually.
      console.error(`PipelineRefreshSubscriber: failed to refresh pipeline for project ${event.projectId}:`, (error as Error).message);
    }
  }
}

export default PipelineRefreshSubscriber;
