// CustomProviderAdapter - Placeholder adapter for custom integrations
// Do NOT call external services yet. Architecture preparation only.
import { ProviderAdapter, ProviderTestResult, ProviderOperationResult } from '../ProviderAdapter.js';

export class CustomProviderAdapter implements ProviderAdapter {
  readonly type = 'Custom';
  readonly category = 'Custom';

  async testConnection(config: Record<string, any>, credentials: Record<string, any>): Promise<ProviderTestResult> {
    return { success: true, message: 'Custom provider placeholder' };
  }

  validateConfiguration(config: Record<string, any>, credentials: Record<string, any>): string[] {
    return [];
  }

  getCapabilities(): string[] {
    return ['custom-operation'];
  }

  async sendNotification(params: {
    channel: string;
    recipients: string[];
    subject: string;
    body: string;
  }): Promise<ProviderOperationResult> {
    return { success: true, data: { queued: true } };
  }
}

export default CustomProviderAdapter;