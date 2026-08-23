// MailtrapAdapter - Placeholder adapter for Mailtrap email testing
// Do NOT call external services yet. Architecture preparation only.
import { ProviderAdapter, ProviderTestResult, ProviderOperationResult } from '../ProviderAdapter.js';

export class MailtrapAdapter implements ProviderAdapter {
  readonly type = 'Mailtrap';
  readonly category = 'Email';

  async testConnection(config: Record<string, any>, credentials: Record<string, any>): Promise<ProviderTestResult> {
    // Placeholder - no external call
    const hasCredentials = !!(credentials.apiToken || credentials.apiKey);
    return {
      success: hasCredentials,
      message: hasCredentials
        ? 'Mailtrap connection configured (placeholder - not tested)'
        : 'Mailtrap requires an API token',
      details: { inboxId: config.inboxId || null },
    };
  }

  validateConfiguration(config: Record<string, any>, credentials: Record<string, any>): string[] {
    const errors: string[] = [];
    if (!credentials.apiToken && !credentials.apiKey) {
      errors.push('Mailtrap API token is required');
    }
    return errors;
  }

  getCapabilities(): string[] {
    return ['send-email', 'fetch-inbox', 'verify-delivery'];
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

export default MailtrapAdapter;