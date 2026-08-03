// NotificationController - Controller for Notification Module endpoints
import { Request, Response } from 'express';
import { NotificationService } from '../../application/notification/NotificationService';

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const notification = await this.notificationService.create({ ...req.body, projectId });
      res.status(201).json({ success: true, data: notification });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async getNotification(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      const notification = await this.notificationService.get(notificationId);
      res.status(200).json({ success: true, data: notification });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async listNotifications(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const notifications = await this.notificationService.listByProject(projectId);
      res.status(200).json({ success: true, data: notifications });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async updateNotification(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      const notification = await this.notificationService.update(notificationId, req.body);
      res.status(200).json({ success: true, data: notification });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      await this.notificationService.delete(notificationId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }

  async testNotification(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      await this.notificationService.testNotification(notificationId);
      res.status(200).json({ success: true, message: 'Test notification triggered', data: null });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Internal Server Error', details: null });
    }
  }
}

export default NotificationController;