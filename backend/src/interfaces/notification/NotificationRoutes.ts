// NotificationRoutes - Express routes for Notification Module
import { Router } from 'express';
import { NotificationController } from './NotificationController';
import { container } from '../../application/ApplicationContainer';
import { asyncHandler } from '../middleware/AsyncHandler';

// Reuse shared service from the ApplicationContainer
const { notificationService } = container;

// Initialize controller
const notificationController = new NotificationController(notificationService);

export function createNotificationRoutes(notificationController: NotificationController): Router {
  const router = Router();

  router.post('/projects/:projectId/notifications', asyncHandler(notificationController.create.bind(notificationController)));
  router.get('/projects/:projectId/notifications', asyncHandler(notificationController.listNotifications.bind(notificationController)));
  router.get('/notifications/:notificationId', asyncHandler(notificationController.getNotification.bind(notificationController)));
  router.put('/notifications/:notificationId', asyncHandler(notificationController.updateNotification.bind(notificationController)));
  router.delete('/notifications/:notificationId', asyncHandler(notificationController.deleteNotification.bind(notificationController)));
  router.post('/notifications/:notificationId/test', asyncHandler(notificationController.testNotification.bind(notificationController)));

  return router;
}

export default createNotificationRoutes;