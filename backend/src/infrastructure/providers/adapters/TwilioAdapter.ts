// TwilioAdapter - Placeholder adapter for Twilio SMS testing
// Do NOT call external services yet. Architecture preparation only.
import { ProviderAdapter, ProviderTestResult, ProviderOperationResult } from '../ProviderAdapter.js';

export class TwilioAdapter implements ProviderAdapter {
  readonly type = 'Twilio';
  readonly category = 'SMS';

  async testConnection(config: Record<string, any>, credentials: Record<string, any>): Promise<ProviderTestResult> {
    return { success: true, message: 'Twilio placeholder' };
  }

  validateConfiguration(config: Record<string, any>, credentials: Record<string, any>): string[] {
    return [];
  }

  getCapabilities(): string[] {
    return ['send-sms', 'fetch-messages', 'verify-delivery'];
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

export default TwilioAdapter;