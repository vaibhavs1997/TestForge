// PipelineRefreshSubscriber - Refreshes pipeline state when project dependencies change
// Subscribes to INVALIDATED events and triggers pipeline re-evaluation
// through the existing OrchestratePipeline and RunAIPipeline services.
import { EventBus, DomainEvent } from '../../domain/events/EventBus';
import { OrchestratePipeline } from '../pipeline/OrchestratePipeline';

export class PipelineRefreshSubscriber {
  constructor(
    private readonly eventBus: EventBus,
    private readonly orchestratePipeline: OrchestratePipeline
  ) {
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    // When the pipeline module is invalidated, refresh pipeline state
    this.eventBus.subscribe('INVALIDATED', 'pipeline', (event) => this.refreshPipeline(event));
  }

  private async refreshPipeline(event: DomainEvent): Promise<void> {
    try {
      // Re-run the deterministic pipeline orchestration for the affected project.
      // This keeps pipeline state in sync with the latest entity changes.
      await this.orchestratePipeline.execute(event.projectId);
    } catch (error) {
      // Pipeline refresh is best-effort — a failed refresh should not break
      // the originating operation. The pipeline can still be triggered manually.
      console.error(`PipelineRefreshSubscriber: failed to refresh pipeline for project ${event.projectId}:`, (error as Error).message);
    }
  }
}

export default PipelineRefreshSubscriber;
