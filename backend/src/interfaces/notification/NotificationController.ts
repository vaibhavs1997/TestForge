// NotificationController - Controller for Notification Module endpoints
import { Request, Response } from 'express';
import { NotificationService } from '../../application/notification/NotificationService';
import { createSuccessResponse } from "../../shared/ApiResponse";
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }
    async create(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const notification = await this.notificationService.create({ ...req.body, projectId });
        res.status(201).json(createSuccessResponse(notification));
    }
    async getNotification(req: Request, res: Response): Promise<void> {
        const { notificationId } = req.params;
        const notification = await this.notificationService.get(notificationId);
        res.status(200).json(createSuccessResponse(notification));
    }
    async listNotifications(req: Request, res: Response): Promise<void> {
        const { projectId } = req.params;
        const notifications = await this.notificationService.listByProject(projectId);
        res.status(200).json(createSuccessResponse(notifications));
    }
    async updateNotification(req: Request, res: Response): Promise<void> {
        const { notificationId } = req.params;
        const notification = await this.notificationService.update(notificationId, req.body);
        res.status(200).json(createSuccessResponse(notification));
    }
    async deleteNotification(req: Request, res: Response): Promise<void> {
        const { notificationId } = req.params;
        await this.notificationService.delete(notificationId);
        res.status(204).send();
    }
    async testNotification(req: Request, res: Response): Promise<void> {
        const { notificationId } = req.params;
        await this.notificationService.testNotification(notificationId);
        res.status(200).json(createSuccessResponse(null));
    }
}
export default NotificationController;

