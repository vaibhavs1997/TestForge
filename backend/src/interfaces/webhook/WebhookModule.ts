import type { Express } from 'express';
import { JsonWebhookRepository } from '../../infrastructure/webhook/JsonWebhookRepository';
import { CreateWebhook, DeleteWebhook, GetWebhook, ListWebhooks, TriggerWebhooks, UpdateWebhook } from '../../application/webhook/WebhookUseCases';
import { createWebhookRoutes } from './WebhookRoutes';

export function registerWebhookModule(app: Express): TriggerWebhooks {
  const webhookRepository = new JsonWebhookRepository();
  const useCases = {
    list: new ListWebhooks(webhookRepository),
    get: new GetWebhook(webhookRepository),
    create: new CreateWebhook(webhookRepository),
    update: new UpdateWebhook(webhookRepository),
    delete: new DeleteWebhook(webhookRepository),
    trigger: new TriggerWebhooks(webhookRepository),
  };

  app.use(
    '/api',
    createWebhookRoutes(
      useCases.list,
      useCases.get,
      useCases.create,
      useCases.update,
      useCases.delete,
    ),
  );

  return useCases.trigger;
}
