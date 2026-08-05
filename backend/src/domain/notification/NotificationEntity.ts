// NotificationEntity - Domain Entity for the Notification Module
// Represents a notification configuration that triggers on specific events.

export type NotificationEventType = 
  | 'ExecutionCompleted'
  | 'ExecutionFailed'
  | 'ScheduleCompleted'
  | 'ScheduleFailed'
  | 'ReportGenerated';

export type NotificationChannel = 'Email' | 'Slack' | 'MicrosoftTeams' | 'Webhook';

export interface NotificationTemplate {
  subject: string;
  body: string;
}

export class NotificationEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public name: string,
    public readonly eventType: NotificationEventType,
    public providerId: string,
    public enabled: boolean,
    public recipients: string[],
    public subjectTemplate: string,
    public bodyTemplate: string,
    public readonly createdAt: number,
    public updatedAt: number
  ) {}
}

export default NotificationEntity;