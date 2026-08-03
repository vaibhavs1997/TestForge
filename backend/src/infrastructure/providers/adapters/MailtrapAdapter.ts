// MailtrapAdapter - Placeholder adapter for Mailtrap email testing
// Do NOT call external services yet. Architecture preparation only.
import { ProviderAdapter, ProviderTestResult } from '../ProviderAdapter';

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
}

export default MailtrapAdapter;