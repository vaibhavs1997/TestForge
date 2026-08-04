// EventPublisher - Centralized event publishing utility
// Eliminates duplicated eventBus.publish() calls across repositories and services.
// Every entity mutation should go through this utility.

import { EventBus, EventType, ModuleName, DomainEvent } from '../domain/events/EventBus';

export interface PublishOptions {
  type: EventType;
  module: ModuleName;
  entityId: string;
  projectId: string;
  entityType: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  metadata?: Record<string, any>;
}

export class EventPublisher {
  constructor(private readonly eventBus: EventBus) {}

  async publish(options: PublishOptions): Promise<void> {
    const event: DomainEvent = {
      type: options.type,
      module: options.module,
      entityId: options.entityId,
      projectId: options.projectId,
      timestamp: Date.now(),
      payload: {
        entityType: options.entityType,
        oldValue: options.oldValue || null,
        newValue: options.newValue || null,
        metadata: options.metadata || {},
      },
    };

    await this.eventBus.publish(event);
  }

  // Convenience methods for common operations
  async created(module: ModuleName, entityId: string, projectId: string, entityType: string, newValue?: Record<string, any>): Promise<void> {
    await this.publish({
      type: 'IMPORTED',
      module,
      entityId,
      projectId,
      entityType,
      newValue,
    });
  }

  async updated(module: ModuleName, entityId: string, projectId: string, entityType: string, oldValue: Record<string, any>, newValue: Record<string, any>): Promise<void> {
    await this.publish({
      type: 'UPDATED',
      module,
      entityId,
      projectId,
      entityType,
      oldValue,
      newValue,
    });
  }

  async deleted(module: ModuleName, entityId: string, projectId: string, entityType: string, oldValue: Record<string, any>): Promise<void> {
    await this.publish({
      type: 'DELETED',
      module,
      entityId,
      projectId,
      entityType,
      oldValue,
    });
  }

  async generated(module: ModuleName, entityId: string, projectId: string, entityType: string, newValue?: Record<string, any>): Promise<void> {
    await this.publish({
      type: 'GENERATED',
      module,
      entityId,
      projectId,
      entityType,
      newValue,
    });
  }

  async executed(module: ModuleName, entityId: string, projectId: string, entityType: string, status: string): Promise<void> {
    await this.publish({
      type: status === 'passed' || status === 'Completed' ? 'COMPLETED' : 'FAILED',
      module,
      entityId,
      projectId,
      entityType,
      metadata: { status },
    });
  }

  async approved(module: ModuleName, entityId: string, projectId: string, entityType: string): Promise<void> {
    await this.publish({
      type: 'APPROVED',
      module,
      entityId,
      projectId,
      entityType,
    });
  }

  async rejected(module: ModuleName, entityId: string, projectId: string, entityType: string): Promise<void> {
    await this.publish({
      type: 'REJECTED',
      module,
      entityId,
      projectId,
      entityType,
    });
  }

  async restored(module: ModuleName, entityId: string, projectId: string, entityType: string, newValue: Record<string, any>): Promise<void> {
    await this.publish({
      type: 'RESTORED',
      module,
      entityId,
      projectId,
      entityType,
      newValue,
    });
  }

  async enabled(module: ModuleName, entityId: string, projectId: string, entityType: string, enabled: boolean): Promise<void> {
    await this.publish({
      type: enabled ? 'ENABLED' : 'DISABLED',
      module,
      entityId,
      projectId,
      entityType,
      newValue: { enabled },
    });
  }
}

export default EventPublisher;
