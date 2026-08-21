// Webhook repository interface

import { WebhookEntity } from './WebhookEntity.js';

export interface WebhookRepository {
  list(projectId?: string): Promise<WebhookEntity[]>;
  findById(id: string): Promise<WebhookEntity | null>;
  findByProject(projectId: string): Promise<WebhookEntity[]>;
  create(webhook: Omit<WebhookEntity, 'createdAt' | 'updatedAt'>): Promise<WebhookEntity>;
  update(id: string, data: Partial<WebhookEntity>): Promise<WebhookEntity>;
  delete(id: string): Promise<void>;
}

export default WebhookRepository;