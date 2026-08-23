// MailHogAdapter - Placeholder adapter for local MailHog email testing
// Do NOT call external services yet. Architecture preparation only.
import { ProviderAdapter, ProviderTestResult, ProviderOperationResult } from '../ProviderAdapter.js';

export class MailHogAdapter implements ProviderAdapter {
  readonly type = 'MailHog';
  readonly category = 'Email';

  async testConnection(config: Record<string, any>, credentials: Record<string, any>): Promise<ProviderTestResult> {
    return { success: true, message: 'MailHog placeholder' };
  }

  validateConfiguration(config: Record<string, any>, credentials: Record<string, any>): string[] {
    return [];
  }

  getCapabilities(): string[] {
    return ['fetch-inbox', 'search-email'];
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

export default MailHogAdapter;