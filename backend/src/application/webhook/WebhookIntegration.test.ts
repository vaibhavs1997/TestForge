// Integration tests for webhook API endpoints
import { describe, expect, it, beforeEach } from 'vitest';
import { ListWebhooks, GetWebhook, CreateWebhook, UpdateWebhook, DeleteWebhook } from './WebhookUseCases.js';
import type { WebhookRepository } from '../../domain/webhook/WebhookRepository.js';
import type { WebhookEntity } from '../../domain/webhook/WebhookEntity.js';
import { TriggerWebhooks } from './WebhookUseCases.js';

// In-memory repository for integration testing
class InMemoryWebhookRepository implements WebhookRepository {
  private webhooks: Map<string, WebhookEntity> = new Map();

  async list(projectId?: string): Promise<WebhookEntity[]> {
    let items = Array.from(this.webhooks.values());
    if (projectId) {
      items = items.filter(w => w.projectId === projectId);
    }
    return items;
  }

  async findById(id: string): Promise<WebhookEntity | null> {
    return this.webhooks.get(id) || null;
  }

  async findByProject(projectId: string): Promise<WebhookEntity[]> {
    return Array.from(this.webhooks.values()).filter(w => w.projectId === projectId);
  }

  async create(webhook: Omit<WebhookEntity, 'createdAt' | 'updatedAt'>): Promise<WebhookEntity> {
    const now = Date.now();
    const entity = {
      ...webhook,
      createdAt: now,
      updatedAt: now,
    } as WebhookEntity;
    this.webhooks.set(entity.id, entity);
    return entity;
  }

  async update(id: string, data: Partial<WebhookEntity>): Promise<WebhookEntity> {
    const existing = this.webhooks.get(id);
    if (!existing) throw new Error(`Webhook with id ${id} not found`);
    
    const updated = { ...existing, ...data, updatedAt: Date.now() } as WebhookEntity;
    this.webhooks.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.webhooks.delete(id);
  }
}

describe('Webhook API Integration', () => {
  let repository: InMemoryWebhookRepository;
  let useCases: {
    list: ListWebhooks;
    get: GetWebhook;
    create: CreateWebhook;
    update: UpdateWebhook;
    delete: DeleteWebhook;
    trigger: TriggerWebhooks;
  };

  beforeEach(() => {
    repository = new InMemoryWebhookRepository();
    useCases = {
      list: new ListWebhooks(repository),
      get: new GetWebhook(repository),
      create: new CreateWebhook(repository),
      update: new UpdateWebhook(repository),
      delete: new DeleteWebhook(repository),
      trigger: new TriggerWebhooks(repository),
    };
  });

  it('creates and retrieves a webhook', async () => {
    const created = await useCases.create.execute({
      projectId: 'proj-1',
      url: 'https://example.com/hook',
      events: ['project.created', 'test.executed'],
      headers: { 'X-API-Key': 'secret' },
    });

    const fetched = await useCases.get.execute(created.id);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.url).toBe('https://example.com/hook');
    expect(fetched?.events).toContain('project.created');
    expect(fetched?.events).toContain('test.executed');
  });

  it('lists webhooks filtered by project', async () => {
    await useCases.create.execute({
      projectId: 'proj-1',
      url: 'https://example.com/hook1',
      events: ['project.created'],
    });
    await useCases.create.execute({
      projectId: 'proj-1',
      url: 'https://example.com/hook2',
      events: ['project.updated'],
    });
    await useCases.create.execute({
      projectId: 'proj-2',
      url: 'https://example.com/hook3',
      events: ['project.created'],
    });

    const proj1Webhooks = await useCases.list.execute('proj-1');
    const allWebhooks = await useCases.list.execute();

    expect(proj1Webhooks.length).toBe(2);
    expect(allWebhooks.length).toBe(3);
  });

  it('updates webhook properties', async () => {
    const created = await useCases.create.execute({
      projectId: 'proj-1',
      url: 'https://example.com/hook',
      events: ['project.created'],
    });

    const updated = await useCases.update.execute(created.id, {
      url: 'https://new.example.com/hook',
      events: ['project.created', 'test.executed'],
      active: false,
    });

    expect(updated.url).toBe('https://new.example.com/hook');
    expect(updated.active).toBe(false);
    expect(updated.events).toContain('test.executed');
  });

  it('deletes webhook', async () => {
    const created = await useCases.create.execute({
      projectId: 'proj-1',
      url: 'https://example.com/hook',
      events: ['project.created'],
    });

    await useCases.delete.execute(created.id);

    const fetched = await useCases.get.execute(created.id);
    expect(fetched).toBeNull();
  });

  it('triggers webhooks for matching project events', async () => {
    await useCases.create.execute({
      projectId: 'proj-1',
      url: 'https://example.com/hook',
      events: ['project.created'],
    });

    // Should not throw when triggering
    await expect(useCases.trigger.execute({
      event: 'project.created',
      timestamp: Date.now(),
      data: { id: 'new-project' },
      projectId: 'proj-1',
    })).resolves.toBeUndefined();
  });

  it('handles full lifecycle (create → update → trigger → delete)', async () => {
    // Create
    const created = await useCases.create.execute({
      projectId: 'proj-1',
      url: 'https://example.com/hook',
      events: ['project.created', 'environment.created', 'test.executed'],
    });
    expect(created.active).toBe(true);

    // Update
    const updated = await useCases.update.execute(created.id, {
      active: false,
    });
    expect(updated.active).toBe(false);

    // Trigger (should skip inactive webhook)
    await useCases.trigger.execute({
      event: 'project.created',
      timestamp: Date.now(),
      data: {},
      projectId: 'proj-1',
    });

    // Reactivate
    const reactivated = await useCases.update.execute(created.id, {
      active: true,
    });
    expect(reactivated.active).toBe(true);

    // Delete
    await useCases.delete.execute(created.id);
    const fetched = await useCases.get.execute(created.id);
    expect(fetched).toBeNull();
  });
});