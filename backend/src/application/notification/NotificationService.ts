// NotificationService - Application Service for the Notification Module
// Subscribes to Scheduler, Execution, and Report events and sends notifications.

import { randomUUID } from 'node:crypto';
import { EventBus, EventType, ModuleName } from '../../domain/events/EventBus.js';
import { NotificationEntity } from '../../domain/notification/NotificationEntity.js';
import type { NotificationEventType } from '../../domain/notification/NotificationEntity.js';
import type { NotificationRepository } from '../../domain/notification/NotificationRepository.js';
import { ProviderResolutionService } from '../../infrastructure/providers/ProviderResolutionService.js';
import { ProviderEntity } from '../../domain/providers/ProviderEntity.js';
import { PluginRegistry } from '../plugin/PluginRegistry.js';

export interface CreateNotificationInput {
  projectId: string;
  name: string;
  eventType: NotificationEventType;
  providerId: string;
  recipients: string[];
  subjectTemplate: string;
  bodyTemplate: string;
  enabled?: boolean;
}

export interface UpdateNotificationInput {
  name?: string;
  eventType?: NotificationEventType;
  providerId?: string;
  enabled?: boolean;
  recipients?: string[];
  subjectTemplate?: string;
  bodyTemplate?: string;
}

export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly providerResolutionService: ProviderResolutionService,
    private readonly eventBus: EventBus,
    private readonly pluginRegistry?: PluginRegistry
  ) {
    this.setupEventSubscriptions();
  }

  private setupEventSubscriptions(): void {
    // Execution events
    this.eventBus.subscribe('COMPLETED' as EventType, 'execution' as ModuleName, this.handleExecutionEvent.bind(this));
    this.eventBus.subscribe('FAILED' as EventType, 'execution' as ModuleName, this.handleExecutionEvent.bind(this));

    // Scheduler events
    this.eventBus.subscribe('COMPLETED' as EventType, 'scheduler' as ModuleName, this.handleScheduleEvent.bind(this));
    this.eventBus.subscribe('FAILED' as EventType, 'scheduler' as ModuleName, this.handleScheduleEvent.bind(this));

    // Report events
    this.eventBus.subscribe('GENERATED' as EventType, 'recommendation' as ModuleName, this.handleReportEvent.bind(this));
  }

  private async handleExecutionEvent(event: any): Promise<void> {
    const eventType = event.payload?.status === 'Completed' ? 'ExecutionCompleted' : 'ExecutionFailed';
    await this.processNotifications(event.projectId, eventType, {
      executionRunId: event.entityId,
      status: event.payload?.status,
    });
  }

  private async handleScheduleEvent(event: any): Promise<void> {
    const eventType = event.payload?.status === 'passed' ? 'ScheduleCompleted' : 'ScheduleFailed';
    await this.processNotifications(event.projectId, eventType, {
      scheduleId: event.entityId,
      status: event.payload?.status,
    });
  }

  private async handleReportEvent(event: any): Promise<void> {
    await this.processNotifications(event.projectId, 'ReportGenerated', {
      reportId: event.entityId,
    });
  }

  private async processNotifications(projectId: string, eventType: NotificationEventType, context: Record<string, any>): Promise<void> {
    const notifications = await this.notificationRepository.findEnabledByProjectAndEventType(projectId, eventType);
    
    for (const notification of notifications) {
      try {
        await this.sendNotification(notification, context);
      } catch (error) {
        console.error(`Failed to send notification ${notification.id}:`, error);
      }
    }
  }

  private async sendNotification(notification: NotificationEntity, context: Record<string, any>): Promise<void> {
    const { provider, adapter, pluginId } = await this.providerResolutionService.resolveById(notification.providerId);
    if (!provider || !adapter) {
      throw new Error(`Provider ${notification.providerId} not found or not available`);
    }

    const subject = this.renderTemplate(notification.subjectTemplate, context);
    const body = this.renderTemplate(notification.bodyTemplate, context);

    // Resolve notification channel through Plugin Registry if available
    let channelPlugin = null;
    if (this.pluginRegistry) {
      const channelPlugins = await this.pluginRegistry.resolveByCategoryAndCapability('Notification', 'send');
      if (channelPlugins.length > 0) {
        channelPlugin = channelPlugins[0];
      }
    }

    // Send via provider adapter (reuses existing adapter, does not change execution behavior)
    await adapter.sendNotification({
      channel: channelPlugin?.name || 'Email',
      recipients: notification.recipients,
      subject,
      body,
    });
  }

  private renderTemplate(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] !== undefined ? String(context[key]) : match;
    });
  }

  async create(input: CreateNotificationInput): Promise<NotificationEntity> {
    const now = Date.now();
    const notification = new NotificationEntity(
      randomUUID(),
      input.projectId,
      input.name,
      input.eventType,
      input.providerId,
      input.enabled ?? true,
      input.recipients,
      input.subjectTemplate,
      input.bodyTemplate,
      now,
      now
    );

    return this.notificationRepository.create(notification);
  }

  async get(id: string): Promise<NotificationEntity> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) {
      throw new Error(`Notification with id ${id} not found`);
    }
    return notification;
  }

  async listByProject(projectId: string): Promise<NotificationEntity[]> {
    return this.notificationRepository.findByProject(projectId);
  }

  async update(id: string, updates: UpdateNotificationInput): Promise<NotificationEntity> {
    const existing = await this.get(id);
    
    const now = Date.now();
    const mergedUpdates: Partial<NotificationEntity> = {
      ...updates,
      updatedAt: now,
    };

    const updated = await this.notificationRepository.update(id, mergedUpdates);
    if (!updated) {
      throw new Error(`Notification with id ${id} not found`);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.get(id);
    await this.notificationRepository.delete(id);
  }

  async testNotification(id: string): Promise<void> {
    const notification = await this.get(id);
    await this.sendNotification(notification, {
      test: true,
      message: 'This is a test notification',
    });
  }
}

export default NotificationService;