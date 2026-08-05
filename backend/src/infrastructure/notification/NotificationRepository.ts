// NotificationRepository - Infrastructure implementation for Notification Module
// Uses in-memory storage. Can be swapped for DB implementation.

import { NotificationEntity } from '../../domain/notification';
import type { NotificationRepository } from '../../domain/notification';

export class InMemoryNotificationRepository implements NotificationRepository {
  private notifications: Map<string, NotificationEntity> = new Map();

  async create(notification: NotificationEntity): Promise<NotificationEntity> {
    this.notifications.set(notification.id, notification);
    return notification;
  }

  async findById(id: string): Promise<NotificationEntity | null> {
    return this.notifications.get(id) || null;
  }

  async findByProject(projectId: string): Promise<NotificationEntity[]> {
    return Array.from(this.notifications.values()).filter(n => n.projectId === projectId);
  }

  async findByProjectAndEventType(projectId: string, eventType: string): Promise<NotificationEntity[]> {
    return Array.from(this.notifications.values()).filter(
      n => n.projectId === projectId && n.eventType === eventType
    );
  }

  async findEnabledByProjectAndEventType(projectId: string, eventType: string): Promise<NotificationEntity[]> {
    return Array.from(this.notifications.values()).filter(
      n => n.projectId === projectId && n.eventType === eventType && n.enabled
    );
  }

  async update(id: string, updates: Partial<NotificationEntity>): Promise<NotificationEntity | null> {
    const existing = this.notifications.get(id);
    if (!existing) return null;

    const updated = new NotificationEntity(
      existing.id,
      existing.projectId,
      updates.name ?? existing.name,
      existing.eventType,
      updates.providerId ?? existing.providerId,
      updates.enabled ?? existing.enabled,
      updates.recipients ?? existing.recipients,
      updates.subjectTemplate ?? existing.subjectTemplate,
      updates.bodyTemplate ?? existing.bodyTemplate,
      existing.createdAt,
      Date.now()
    );

    this.notifications.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.notifications.delete(id);
  }

  async list(): Promise<NotificationEntity[]> {
    return Array.from(this.notifications.values());
  }
}

export default InMemoryNotificationRepository;