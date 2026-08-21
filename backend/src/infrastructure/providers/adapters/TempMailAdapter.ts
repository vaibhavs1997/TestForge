// TempMailAdapter - Placeholder adapter for temporary email
// Do NOT call external services yet. Architecture preparation only.
import { ProviderAdapter, ProviderTestResult, ProviderOperationResult } from '../ProviderAdapter.js';

export class TempMailAdapter implements ProviderAdapter {
  readonly type = 'TempMail';
  readonly category = 'Email';

  async testConnection(config: Record<string, any>, credentials: Record<string, any>): Promise<ProviderTestResult> {
    return { success: true, message: 'Temporary Mail placeholder' };
  }

  validateConfiguration(config: Record<string, any>, credentials: Record<string, any>): string[] {
    return [];
  }

  getCapabilities(): string[] {
    return ['create-email', 'fetch-inbox'];
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

export default TempMailAdapter;