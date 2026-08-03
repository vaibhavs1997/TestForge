// Notification module types
export type NotificationEventType = 
  | 'ExecutionCompleted'
  | 'ExecutionFailed'
  | 'ScheduleCompleted'
  | 'ScheduleFailed'
  | 'ReportGenerated';

export type NotificationChannel = 'Email' | 'Slack' | 'MicrosoftTeams' | 'Webhook';

export interface Notification {
  id: string;
  projectId: string;
  name: string;
  eventType: NotificationEventType;
  providerId: string;
  enabled: boolean;
  recipients: string[];
  subjectTemplate: string;
  bodyTemplate: string;
  createdAt: number;
  updatedAt: number;
}

export interface NotificationFormData {
  name: string;
  eventType: NotificationEventType;
  providerId: string;
  recipients: string[];
  subjectTemplate: string;
  bodyTemplate: string;
  enabled?: boolean;
}

export interface Provider {
  id: string;
  projectId: string;
  name: string;
  category: string;
  adapter: string;
  enabled: boolean;
  isDefault: boolean;
}