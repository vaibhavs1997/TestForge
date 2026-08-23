// Webhook use cases

import { WebhookRepository } from '../../domain/webhook/WebhookRepository.js';
import { WebhookEntity, WebhookEvent, WebhookPayload } from '../../domain/webhook/WebhookEntity.js';
import { secureHttpExecutor } from '../../infrastructure/http/SecureHttpExecutor.js';

export class ListWebhooks {
  constructor(
    private readonly webhookRepository: WebhookRepository,
  ) {}

  async execute(projectId?: string): Promise<WebhookEntity[]> {
    if (projectId) {
      return this.webhookRepository.findByProject(projectId);
    }
    return this.webhookRepository.list();
  }
}

export class GetWebhook {
  constructor(
    private readonly webhookRepository: WebhookRepository,
  ) {}

  async execute(id: string): Promise<WebhookEntity | null> {
    return this.webhookRepository.findById(id);
  }
}

export class CreateWebhook {
  constructor(
    private readonly webhookRepository: WebhookRepository,
  ) {}

  async execute(data: {
    projectId: string;
    url: string;
    events: WebhookEvent[];
    headers?: Record<string, string>;
  }): Promise<WebhookEntity> {
    const webhook: Omit<WebhookEntity, 'createdAt' | 'updatedAt'> = {
      id: `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: data.projectId,
      url: data.url,
      events: data.events,
      active: true,
      headers: data.headers || {},
    };

    return this.webhookRepository.create(webhook);
  }
}

export class UpdateWebhook {
  constructor(
    private readonly webhookRepository: WebhookRepository,
  ) {}

  async execute(id: string, data: {
    url?: string;
    events?: WebhookEvent[];
    active?: boolean;
    headers?: Record<string, string>;
  }): Promise<WebhookEntity> {
    const existing = await this.webhookRepository.findById(id);
    if (!existing) {
      throw new Error(`Webhook with id ${id} not found`);
    }

    return this.webhookRepository.update(id, {
      ...data,
      updatedAt: Date.now(),
    });
  }
}

export class DeleteWebhook {
  constructor(
    private readonly webhookRepository: WebhookRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.webhookRepository.findById(id);
    if (!existing) {
      throw new Error(`Webhook with id ${id} not found`);
    }

    await this.webhookRepository.delete(id);
  }
}

export class TriggerWebhooks {
  constructor(
    private readonly webhookRepository: WebhookRepository,
  ) {}

  async execute(payload: WebhookPayload): Promise<void> {
    const projectId = payload.projectId;
    if (!projectId) return;

    const webhooks = await this.webhookRepository.findByProject(projectId);
    
    for (const webhook of webhooks) {
      if (!webhook.active) continue;
      if (!webhook.events.includes(payload.event)) continue;

      // Send webhook (fire and forget)
      this.sendWebhook(webhook, payload).catch(err => {
        console.error(`Failed to send webhook ${webhook.id}:`, err);
      });
    }
  }

  private async sendWebhook(webhook: WebhookEntity, payload: WebhookPayload): Promise<void> {
    try {
      const response = await secureHttpExecutor.execute({
        url: webhook.url,
        method: 'POST',
        validateStatus: () => true,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TestForge-Webhook/1.0',
          ...webhook.headers,
        },
        data: JSON.stringify(payload),
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Failed to send webhook to ${webhook.url}:`, error);
      throw error;
    }
  }
}
