import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ActivityStreamHub } from '../../application/realtime/ActivityStreamHub';
import { getAuthConfig } from '../../config';

export function createActivityStreamRoutes(hub: ActivityStreamHub): Router {
  const router = Router();

  router.get('/events/stream', (req: Request, res: Response) => {
    const authConfig = getAuthConfig();
    if (authConfig.enabled && !req.auth) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = randomUUID();
    const projectIds = req.auth?.projectIds ?? '*';

    hub.addClient({ id: clientId, projectIds, res });

    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 25_000);

    req.on('close', () => {
      clearInterval(heartbeat);
      hub.removeClient(clientId);
    });
  });

  return router;
}

export default createActivityStreamRoutes;
