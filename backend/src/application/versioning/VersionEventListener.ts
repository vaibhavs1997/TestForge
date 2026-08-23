// VersionEventListener - Centralized versioning via EventBus
// Subscribes to entity mutation events and creates immutable version snapshots.
// This centralizes versioning so individual repositories no longer need inline
// versionService.create() calls — eliminating duplicated versioning logic.
import { EventBus, EventType, ModuleName, DomainEvent } from '../../domain/events/EventBus.js';
import { VersionService } from '../versioning/VersionService.js';
import { EntityType } from '../../domain/versioning/VersionEntity.js';

export class VersionEventListener {
  constructor(
    private readonly eventBus: EventBus,
    private readonly versionService: VersionService
  ) {
    this.setupSubscriptions();
  }

  private setupSubscriptions(): void {
    const modules: ModuleName[] = [
      'api', 'environment', 'dataset', 'analysis', 'knowledge',
      'requirements', 'strategy', 'design', 'execution', 'pipeline',
      'recommendation', 'scheduler', 'report', 'assertion', 'suite',
      'plugin', 'provider', 'ai', 'version', 'audit', 'notification',
    ];

    // Events that should produce a version snapshot.
    // GENERATED, COMPLETED, FAILED, APPROVED, REJECTED, INVALIDATED
    // do not alter the entity snapshot, so they are excluded.
    const versionableEvents: EventType[] = ['IMPORTED', 'UPDATED', 'DELETED', 'RESTORED', 'ENABLED', 'DISABLED'];

    for (const module of modules) {
      for (const eventType of versionableEvents) {
        this.eventBus.subscribe(eventType, module, (event: DomainEvent) => this.handleEvent(event));
      }
    }
  }

  private async handleEvent(event: DomainEvent): Promise<void> {
    const entityType = event.payload?.entityType as EntityType | undefined;
    if (!entityType) return;

    let snapshot: Record<string, any> | null = null;
    let changeSummary = '';

    switch (event.type) {
      case 'IMPORTED':
        snapshot = event.payload?.newValue || null;
        changeSummary = 'Entity created';
        break;
      case 'UPDATED':
        snapshot = event.payload?.newValue || null;
        changeSummary = 'Entity updated';
        break;
      case 'DELETED':
        snapshot = event.payload?.oldValue || null;
        changeSummary = 'Entity deleted';
        break;
      case 'RESTORED':
        snapshot = event.payload?.newValue || null;
        changeSummary = 'Entity restored to previous version';
        break;
      case 'ENABLED':
        snapshot = event.payload?.newValue || null;
        changeSummary = 'Entity enabled';
        break;
      case 'DISABLED':
        snapshot = event.payload?.newValue || null;
        changeSummary = 'Entity disabled';
        break;
      default:
        return;
    }

    if (!snapshot) return;

    try {
      await this.versionService.create({
        projectId: event.projectId,
        entityType,
        entityId: event.entityId,
        snapshot,
        changeSummary,
        createdBy: (event.payload?.metadata as any)?.createdBy || 'System',
      });
    } catch (error) {
      // Versioning is best-effort — log but never fail the originating operation
      console.error(`VersionEventListener: failed to version ${entityType}:${event.entityId}:`, (error as Error).message);
    }
  }
}

export default VersionEventListener;
