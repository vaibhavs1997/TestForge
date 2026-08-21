import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JsonWebhookRepository } from './JsonWebhookRepository.js';
import type { WebhookEntity } from '../../domain/webhook/WebhookEntity.js';

describe('JsonWebhookRepository', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testforge-webhooks-'));
    vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates, updates, lists, and deletes webhooks on disk', async () => {
    const repository = new JsonWebhookRepository();

    const created = await repository.create({
      id: 'webhook-1',
      projectId: 'project-1',
      url: 'https://example.com/hook',
      events: ['project.created'],
      active: true,
      headers: { 'X-Test': '1' },
    } as Omit<WebhookEntity, 'createdAt' | 'updatedAt'>);

    expect(created.id).toBe('webhook-1');
    expect(created.projectId).toBe('project-1');

    const list = await repository.list('project-1');
    expect(list).toHaveLength(1);
    expect(list[0].url).toBe('https://example.com/hook');

    const updated = await repository.update('webhook-1', {
      url: 'https://example.com/new-hook',
      active: false,
    });

    expect(updated.url).toBe('https://example.com/new-hook');
    expect(updated.active).toBe(false);

    const repositoryReloaded = new JsonWebhookRepository();
    const fetched = await repositoryReloaded.findById('webhook-1');
    expect(fetched?.url).toBe('https://example.com/new-hook');

    await repository.delete('webhook-1');
    await expect(repository.findById('webhook-1')).resolves.toBeNull();
  });
});
