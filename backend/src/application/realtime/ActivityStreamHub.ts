import type { Response } from 'express';
import type { EventBus, DomainEvent } from '../../domain/events/EventBus';

export interface ActivityStreamClient {
  id: string;
  projectIds: string[] | '*';
  res: Response;
}

function formatSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export class ActivityStreamHub {
  private clients = new Map<string, ActivityStreamClient>();
  private unsubscribe?: () => void;

  constructor(private readonly eventBus: EventBus) {}

  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = this.eventBus.subscribeAll((event) => {
      this.broadcast(event);
    });
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    for (const client of this.clients.values()) {
      client.res.end();
    }
    this.clients.clear();
  }

  addClient(client: ActivityStreamClient): void {
    this.clients.set(client.id, client);
    client.res.write(formatSse('connected', { ok: true }));
  }

  removeClient(id: string): void {
    this.clients.delete(id);
  }

  private broadcast(event: DomainEvent): void {
    const payload = {
      type: event.type,
      module: event.module,
      projectId: event.projectId,
      entityId: event.entityId,
      timestamp: event.timestamp,
      entityType: event.payload?.entityType,
      metadata: event.payload?.metadata,
    };

    for (const client of this.clients.values()) {
      if (client.projectIds !== '*' && !client.projectIds.includes(event.projectId)) {
        continue;
      }
      client.res.write(formatSse('domain-event', payload));
    }
  }
}

export default ActivityStreamHub;
