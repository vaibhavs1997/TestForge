// TempMailAdapter - Placeholder adapter for temporary email
// Do NOT call external services yet. Architecture preparation only.
import { ProviderAdapter, ProviderTestResult } from '../ProviderAdapter';

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
    return ['create-inbox', 'generate-email', 'fetch-email'];
  }
}

export default TempMailAdapter;