import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { WebhookEntity } from '../../domain/webhook/WebhookEntity';
import type { WebhookRepository } from '../../domain/webhook/WebhookRepository';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore';

type StoredWebhook = WebhookEntity;

function webhooksPath(): string {
  return path.join(process.cwd(), 'data', 'webhooks', 'webhooks.json');
}

export class JsonWebhookRepository implements WebhookRepository {
  private async readAll(): Promise<StoredWebhook[]> {
    return readJsonArray<StoredWebhook>(webhooksPath());
  }

  private async writeAll(webhooks: StoredWebhook[]): Promise<void> {
    await writeJsonArray(webhooksPath(), webhooks);
  }

  async list(projectId?: string): Promise<WebhookEntity[]> {
    const webhooks = await this.readAll();
    return projectId ? webhooks.filter((webhook) => webhook.projectId === projectId) : webhooks;
  }

  async findById(id: string): Promise<WebhookEntity | null> {
    const webhooks = await this.readAll();
    return webhooks.find((webhook) => webhook.id === id) ?? null;
  }

  async findByProject(projectId: string): Promise<WebhookEntity[]> {
    return this.list(projectId);
  }

  async create(webhook: Omit<WebhookEntity, 'createdAt' | 'updatedAt'>): Promise<WebhookEntity> {
    const webhooks = await this.readAll();
    const now = Date.now();
    const id = webhook.id?.trim() || randomUUID();

    if (webhooks.some((entry) => entry.id === id)) {
      throw new Error(`Webhook with id ${id} already exists`);
    }

    const record: WebhookEntity = {
      ...webhook,
      id,
      projectId: webhook.projectId.trim(),
      url: webhook.url.trim(),
      events: [...webhook.events],
      active: webhook.active ?? true,
      headers: { ...(webhook.headers || {}) },
      createdAt: now,
      updatedAt: now,
    };

    webhooks.push(record);
    await this.writeAll(webhooks);
    return record;
  }

  async update(id: string, data: Partial<WebhookEntity>): Promise<WebhookEntity> {
    const webhooks = await this.readAll();
    const index = webhooks.findIndex((webhook) => webhook.id === id);
    if (index < 0) {
      throw new Error(`Webhook with id ${id} not found`);
    }

    const current = webhooks[index];
    const updated: WebhookEntity = {
      ...current,
      ...data,
      id: current.id,
      projectId: data.projectId?.trim() || current.projectId,
      url: data.url?.trim() || current.url,
      events: data.events ? [...data.events] : current.events,
      active: data.active ?? current.active,
      headers: data.headers ? { ...data.headers } : current.headers,
      createdAt: current.createdAt,
      updatedAt: Date.now(),
    };

    webhooks[index] = updated;
    await this.writeAll(webhooks);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const webhooks = await this.readAll();
    const next = webhooks.filter((webhook) => webhook.id !== id);
    if (next.length === webhooks.length) {
      throw new Error(`Webhook with id ${id} not found`);
    }
    await this.writeAll(next);
  }
}

export default JsonWebhookRepository;
