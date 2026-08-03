// PluginEntity - Domain Entity for Plugin Framework
// Generic plugin architecture for extensibility.

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

export interface PluginConfiguration {
  [key: string]: any;
}

export class PluginEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly version: string,
    public readonly author: string,
    public readonly category: PluginCategory,
    public readonly capabilities: PluginCapability[],
    public readonly configuration: PluginConfiguration,
    public readonly enabled: boolean,
    public readonly projectId: string | null,
    public readonly createdAt: number,
    public readonly updatedAt: number
  ) {}
}

export default PluginEntity;