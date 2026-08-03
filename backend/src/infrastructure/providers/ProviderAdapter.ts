// ProviderAdapter - Adapter interface for external system integrations
// Placeholder architecture. No external service calls yet.

export interface ProviderTestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface ProviderOperationResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface ProviderAdapter {
  readonly type: string;
  readonly category: string;
  testConnection(config: Record<string, any>, credentials: Record<string, any>): Promise<ProviderTestResult>;
  validateConfiguration(config: Record<string, any>, credentials: Record<string, any>): string[];
  getCapabilities(): string[];
}

export default ProviderAdapter;