// NotificationRoutes - Express routes for Notification Module
import { Router } from 'express';
import { NotificationController } from './NotificationController';

export function createNotificationRoutes(notificationController: NotificationController): Router {
  const router = Router();

  router.post('/projects/:projectId/notifications', notificationController.create.bind(notificationController));
  router.get('/projects/:projectId/notifications', notificationController.listNotifications.bind(notificationController));
  router.get('/notifications/:notificationId', notificationController.getNotification.bind(notificationController));
  router.put('/notifications/:notificationId', notificationController.updateNotification.bind(notificationController));
  router.delete('/notifications/:notificationId', notificationController.deleteNotification.bind(notificationController));
  router.post('/notifications/:notificationId/test', notificationController.testNotification.bind(notificationController));

  return router;
}

export default createNotificationRoutes;