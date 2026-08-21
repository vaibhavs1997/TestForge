// NotificationRepository - Domain Repository for the Notification Module
// Handles persistence operations for NotificationEntity.

import { NotificationEntity } from './NotificationEntity.js';

export interface NotificationRepository {
  create(notification: NotificationEntity): Promise<NotificationEntity>;
  findById(id: string): Promise<NotificationEntity | null>;
  findByProject(projectId: string): Promise<NotificationEntity[]>;
  findByProjectAndEventType(projectId: string, eventType: string): Promise<NotificationEntity[]>;
  findEnabledByProjectAndEventType(projectId: string, eventType: string): Promise<NotificationEntity[]>;
  update(id: string, updates: Partial<NotificationEntity>): Promise<NotificationEntity | null>;
  delete(id: string): Promise<void>;
  list(): Promise<NotificationEntity[]>;
}

export default NotificationRepository;