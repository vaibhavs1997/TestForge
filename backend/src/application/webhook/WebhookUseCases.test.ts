import { describe, expect, it, beforeEach } from 'vitest';
import { ListWebhooks, GetWebhook, CreateWebhook, UpdateWebhook, DeleteWebhook, TriggerWebhooks } from './WebhookUseCases';
import type { WebhookRepository } from '../../domain/webhook/WebhookRepository';
import type { WebhookEntity, WebhookEvent } from '../../domain/webhook/WebhookEntity';

describe('Webhook use cases', () => {
  let repository: WebhookRepository;
  let useCases: {
    list: ListWebhooks;
    get: GetWebhook;
    create: CreateWebhook;
    update: UpdateWebhook;
    delete: DeleteWebhook;
    trigger: TriggerWebhooks;
  };

  beforeEach(() => {
    repository = {
      list: () => Promise.resolve([]),
      findById: () => Promise.resolve(null),
      findByProject: () => Promise.resolve([]),
      create: (webhook: any) => Promise.resolve(webhook as WebhookEntity),
      update: (id: string, data: any) => Promise.resolve({ id, ...data } as WebhookEntity),
      delete: () => Promise.resolve(undefined),
    } as unknown as WebhookRepository;

    useCases = {
      list: new ListWebhooks(repository),
      get: new GetWebhook(repository),
      create: new CreateWebhook(repository),
      update: new UpdateWebhook(repository),
      delete: new DeleteWebhook(repository),
      trigger: new TriggerWebhooks(repository),
    };
  });

  describe('ListWebhooks', () => {
    it('returns all webhooks when no projectId provided', async () => {
      const webhooks = [{ id: '1', url: 'https://example.com/hook' }] as WebhookEntity[];
      repository.list = () => Promise.resolve(webhooks);

      const result = await useCases.list.execute();
      expect(result).toEqual(webhooks);
    });

    it('filters webhooks by projectId', async () => {
      const projectWebhooks = [{ id: '2', projectId: 'proj-1', url: 'https://example.com/hook' }] as WebhookEntity[];
      repository.findByProject = () => Promise.resolve(projectWebhooks);

      const result = await useCases.list.execute('proj-1');
      expect(result).toEqual(projectWebhooks);
    });
  });

  describe('GetWebhook', () => {
    it('returns webhook when found', async () => {
      const webhook = { id: 'wh-1', url: 'https://example.com/hook' } as WebhookEntity;
      repository.findById = () => Promise.resolve(webhook);

      const result = await useCases.get.execute('wh-1');
      expect(result).toEqual(webhook);
    });

    it('returns null when webhook not found', async () => {
      repository.findById = () => Promise.resolve(null);

      const result = await useCases.get.execute('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('CreateWebhook', () => {
    it('creates webhook with required fields', async () => {
      const created = {
        id: 'wh-new',
        projectId: 'proj-1',
        url: 'https://example.com/hook',
        events: ['project.created'] as WebhookEvent[],
        active: true,
        headers: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as WebhookEntity;
      repository.create = () => Promise.resolve(created);

      const result = await useCases.create.execute({
        projectId: 'proj-1',
        url: 'https://example.com/hook',
        events: ['project.created'],
      });
      expect(result).toEqual(created);
    });

    it('creates webhook with custom headers', async () => {
      const created = {
        id: 'wh-2',
        projectId: 'proj-1',
        url: 'https://example.com/hook',
        events: ['test.executed'] as WebhookEvent[],
        active: true,
        headers: { 'X-Custom': 'value' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as WebhookEntity;
      repository.create = () => Promise.resolve(created);

      const result = await useCases.create.execute({
        projectId: 'proj-1',
        url: 'https://example.com/hook',
        events: ['test.executed'],
        headers: { 'X-Custom': 'value' },
      });
      expect(result).toEqual(created);
    });
  });

  describe('UpdateWebhook', () => {
    it('updates webhook fields', async () => {
      const existing = { id: 'wh-1', projectId: 'proj-1', url: 'https://old.com/hook' } as WebhookEntity;
      const updated = { id: 'wh-1', projectId: 'proj-1', url: 'https://new.com/hook' } as WebhookEntity;
      repository.findById = () => Promise.resolve(existing);
      repository.update = () => Promise.resolve(updated);

      const result = await useCases.update.execute('wh-1', { url: 'https://new.com/hook' });
      expect(result).toEqual(updated);
    });

    it('throws error when webhook not found', async () => {
      repository.findById = () => Promise.resolve(null);

      await expect(useCases.update.execute('nonexistent', { url: 'https://new.com/hook' }))
        .rejects.toThrow('Webhook with id nonexistent not found');
    });
  });

  describe('DeleteWebhook', () => {
    it('deletes webhook', async () => {
      let deleted = false;
      const existing = { id: 'wh-1', projectId: 'proj-1' } as WebhookEntity;
      repository.findById = () => Promise.resolve(existing);
      repository.delete = () => {
        deleted = true;
        return Promise.resolve(undefined);
      };

      await useCases.delete.execute('wh-1');
      expect(deleted).toBe(true);
    });

    it('throws error when webhook not found', async () => {
      repository.findById = () => Promise.resolve(null);

      await expect(useCases.delete.execute('nonexistent')).rejects.toThrow('Webhook with id nonexistent not found');
    });
  });

  describe('TriggerWebhooks', () => {
    it('triggers webhooks for matching events', async () => {
      const webhooks = [
        { id: 'wh-1', projectId: 'proj-1', url: 'https://example.com/hook', events: ['project.created'], active: true },
        { id: 'wh-2', projectId: 'proj-1', url: 'https://example.com/other', events: ['test.executed'], active: true },
      ] as WebhookEntity[];
      repository.findByProject = () => Promise.resolve(webhooks);

      // Should not throw
      await expect(useCases.trigger.execute({
        event: 'project.created',
        timestamp: Date.now(),
        data: { id: 'proj-1' },
        projectId: 'proj-1',
      })).resolves.toBeUndefined();
    });

    it('skips inactive webhooks', async () => {
      const webhooks = [
        { id: 'wh-1', projectId: 'proj-1', url: 'https://example.com/hook', events: ['project.created'], active: false },
      ] as WebhookEntity[];
      repository.findByProject = () => Promise.resolve(webhooks);

      await expect(useCases.trigger.execute({
        event: 'project.created',
        timestamp: Date.now(),
        data: { id: 'proj-1' },
        projectId: 'proj-1',
      })).resolves.toBeUndefined();
    });
  });
});