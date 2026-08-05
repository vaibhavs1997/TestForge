// EventBus - Platform-wide event orchestration system
// Coordinates cache invalidation and dependent module refreshes

export type ModuleName =
  | 'api'
  | 'environment'
  | 'dataset'
  | 'analysis'
  | 'knowledge'
  | 'requirements'
  | 'strategy'
  | 'design'
  | 'execution'
  | 'pipeline'
  | 'recommendation'
  | 'scheduler'
  | 'report'
  | 'assertion'
  | 'suite'
  | 'plugin'
  | 'provider'
  | 'ai'
  | 'version'
  | 'audit'
  | 'notification'
  | 'prompt';

export type EventType =
  | 'IMPORTED'
  | 'UPDATED'
  | 'DELETED'
  | 'APPROVED'
  | 'REJECTED'
  | 'GENERATED'
  | 'INVALIDATED'
  | 'COMPLETED'
  | 'FAILED'
  | 'RESTORED'
  | 'ENABLED'
  | 'DISABLED';

export interface DomainEvent {
  type: EventType;
  module: ModuleName;
  entityId: string;
  projectId: string;
  timestamp: number;
  payload?: Record<string, unknown>;
}

export type EventHandler = (event: DomainEvent) => Promise<void> | void;

export class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  subscribe(eventType: EventType, module: ModuleName, handler: EventHandler): void {
    const key = this.getKey(eventType, module);
    if (!this.handlers.has(key)) {
      this.handlers.set(key, []);
    }
    this.handlers.get(key)!.push(handler);
  }

  async publish(event: DomainEvent): Promise<void> {
    const key = this.getKey(event.type, event.module);
    const handlers = this.handlers.get(key) || [];

    for (const handler of handlers) {
      await handler(event);
    }
  }

  private getKey(eventType: EventType, module: ModuleName): string {
    return `${eventType}:${module}`;
  }
}

export default EventBus;
