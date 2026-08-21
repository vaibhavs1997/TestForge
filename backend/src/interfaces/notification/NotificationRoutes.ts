// NotificationRoutes - Express routes for Notification Module
import { Router } from 'express';
import { NotificationController } from './NotificationController.js';
import { asyncHandler } from '../middleware/AsyncHandler.js';
import { authorizeResource } from '../middleware/auth.js';

export function createNotificationRoutes(notificationController: NotificationController): Router {
  const router = Router();

  router.post('/projects/:projectId/notifications', asyncHandler(notificationController.create.bind(notificationController)));
  router.get('/projects/:projectId/notifications', asyncHandler(notificationController.listNotifications.bind(notificationController)));
  const authorizeNotification = authorizeResource('notificationId', notificationController.findForAuthorization.bind(notificationController));
  router.get('/notifications/:notificationId', authorizeNotification, asyncHandler(notificationController.getNotification.bind(notificationController)));
  router.put('/notifications/:notificationId', authorizeNotification, asyncHandler(notificationController.updateNotification.bind(notificationController)));
  router.delete('/notifications/:notificationId', authorizeNotification, asyncHandler(notificationController.deleteNotification.bind(notificationController)));
  router.post('/notifications/:notificationId/test', authorizeNotification, asyncHandler(notificationController.testNotification.bind(notificationController)));

  return router;
}

export default createNotificationRoutes;
