export interface NotificationInboxItem {
  id: string;
  projectId: string;
  title: string;
  message: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: number;
  severity: 'info' | 'success' | 'warning' | 'error';
}
