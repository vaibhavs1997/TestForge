// RecommendationRefreshSubscriber - Refreshes recommendations when project state changes
// Subscribes to INVALIDATED events (published by CacheInvalidationService) and
// re-runs the RecommendationEngine analysis so recommendations stay in sync.
import { EventBus, DomainEvent } from '../../domain/events/EventBus.js';
import { RecommendationEngine } from '../recommendation/RecommendationEngine.js';

export class RecommendationRefreshSubscriber {
  constructor(
    private readonly eventBus: EventBus,
    private readonly recommendationEngine: RecommendationEngine
  ) {
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    // When the recommendation module is invalidated, refresh the analysis
    this.eventBus.subscribe('INVALIDATED', 'recommendation', (event) => this.refreshRecommendations(event));
  }

  private async refreshRecommendations(event: DomainEvent): Promise<void> {
    try {
      // Re-run deterministic analysis — this is the recommendation refresh
      await this.recommendationEngine.analyzeProject(event.projectId);
    } catch (error) {
      console.error(`RecommendationRefreshSubscriber: failed to refresh recommendations for project ${event.projectId}:`, (error as Error).message);
    }
  }
}

export default RecommendationRefreshSubscriber;
