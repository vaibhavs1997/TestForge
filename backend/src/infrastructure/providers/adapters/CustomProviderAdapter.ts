// CustomProviderAdapter - Placeholder adapter for custom integrations
// Do NOT call external services yet. Architecture preparation only.
import { ProviderAdapter, ProviderTestResult } from '../ProviderAdapter';

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
}

export default CustomProviderAdapter;