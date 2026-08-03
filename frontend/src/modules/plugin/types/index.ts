// Plugin module types
export type PluginCategory = 
  | 'AI'
  | 'Notification'
  | 'Provider'
  | 'Validation'
  | 'ReportExport'
  | 'CICD'
  | 'SecretManagement'
  | 'TestDataGenerator';

export interface PluginCapability {
  name: string;
  description: string;
  version: string;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  category: PluginCategory;
  capabilities: PluginCapability[];
  configuration: Record<string, any>;
  enabled: boolean;
  projectId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PluginHealth {
  status: 'healthy' | 'unhealthy' | 'unknown';
  message: string;
}