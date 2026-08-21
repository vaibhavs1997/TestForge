// Webhook API routes
import { Router, Request, Response } from 'express';
import { ListWebhooks, GetWebhook, CreateWebhook, UpdateWebhook, DeleteWebhook } from '../../application/webhook/WebhookUseCases';
import { assertProjectAccess } from '../middleware/auth';
import { ForbiddenError } from '../../shared/errors';
import { getAuthConfig } from '../../config';

export function createWebhookRoutes(
  listWebhooks: ListWebhooks,
  getWebhook: GetWebhook,
  createWebhook: CreateWebhook,
  updateWebhook: UpdateWebhook,
  deleteWebhook: DeleteWebhook,
): Router {
  const router = Router();

  // List webhooks (optionally filtered by project)
  router.get('/webhooks', async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      if (!projectId && getAuthConfig().enabled && req.auth?.projectIds !== '*') throw new ForbiddenError('projectId is required');
      if (projectId) await assertProjectAccess(projectId, req.auth);
      const webhooks = await listWebhooks.execute(projectId);
      res.json({ success: true, data: webhooks });
    } catch (err) {
      res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to list webhooks' });
    }
  });

  // Get webhook by ID
  router.get('/webhooks/:id', async (req: Request, res: Response) => {
    try {
      const webhook = await getWebhook.execute(req.params.id);
      if (!webhook) {
        res.status(404).json({ success: false, message: `Webhook with id ${req.params.id} not found` });
        return;
      }
      await assertProjectAccess(webhook.projectId, req.auth);
      res.json({ success: true, data: webhook });
    } catch (err) {
      res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to get webhook' });
    }
  });

  // Create webhook
  router.post('/webhooks', async (req: Request, res: Response) => {
    try {
      const { projectId, url, events, headers } = req.body;
      
      if (!projectId || !url || !events || !Array.isArray(events)) {
        res.status(400).json({ success: false, message: 'projectId, url, and events array are required' });
        return;
      }

      await assertProjectAccess(projectId, req.auth);

      const webhook = await createWebhook.execute({ projectId, url, events, headers });
      res.status(201).json({ success: true, data: webhook });
    } catch (err) {
      res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to create webhook' });
    }
  });

  // Update webhook
  router.put('/webhooks/:id', async (req: Request, res: Response) => {
    try {
      const { url, events, active, headers } = req.body;
      const existing = await getWebhook.execute(req.params.id);
      if (!existing) {
        res.status(404).json({ success: false, message: `Webhook with id ${req.params.id} not found` });
        return;
      }
      await assertProjectAccess(existing.projectId, req.auth);
      const webhook = await updateWebhook.execute(req.params.id, { url, events, active, headers });
      res.json({ success: true, data: webhook });
    } catch (err) {
      res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to update webhook' });
    }
  });

  // Delete webhook
  router.delete('/webhooks/:id', async (req: Request, res: Response) => {
    try {
      const existing = await getWebhook.execute(req.params.id);
      if (!existing) {
        res.status(404).json({ success: false, message: `Webhook with id ${req.params.id} not found` });
        return;
      }
      await assertProjectAccess(existing.projectId, req.auth);
      await deleteWebhook.execute(req.params.id);
      res.json({ success: true, message: `Webhook ${req.params.id} deleted` });
    } catch (err) {
      res.status(500).json({ success: false, message: err instanceof Error ? err.message : 'Failed to delete webhook' });
    }
  });

  return router;
}
