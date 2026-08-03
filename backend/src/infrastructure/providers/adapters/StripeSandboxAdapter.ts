// StripeSandboxAdapter - Placeholder adapter for Stripe Sandbox payments
// Do NOT call external services yet. Architecture preparation only.
import { ProviderAdapter, ProviderTestResult } from '../ProviderAdapter';

export class StripeSandboxAdapter implements ProviderAdapter {
  readonly type = 'StripeSandbox';
  readonly category = 'Payment';

  async testConnection(config: Record<string, any>, credentials: Record<string, any>): Promise<ProviderTestResult> {
    return { success: true, message: 'Stripe Sandbox placeholder' };
  }

  validateConfiguration(config: Record<string, any>, credentials: Record<string, any>): string[] {
    return [];
  }

  getCapabilities(): string[] {
    return ['create-payment', 'fetch-payment', 'refund-payment'];
  }
}

export default StripeSandboxAdapter;