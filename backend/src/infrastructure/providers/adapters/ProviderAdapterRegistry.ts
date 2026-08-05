// ProviderAdapterRegistry - Maps adapter types to their placeholder implementations
// Do NOT call external services yet. Architecture preparation only.
import { ProviderAdapter } from '../ProviderAdapter';
import { MailtrapAdapter } from './MailtrapAdapter';
import { MailHogAdapter } from './MailHogAdapter';
import { TempMailAdapter } from './TempMailAdapter';
import { TwilioAdapter } from './TwilioAdapter';
import { StripeSandboxAdapter } from './StripeSandboxAdapter';
import { CustomProviderAdapter } from './CustomProviderAdapter';

export class ProviderAdapterRegistry {
  private static instance: ProviderAdapterRegistry;
  private readonly adapters: Map<string, ProviderAdapter>;

  private constructor() {
    this.adapters = new Map<string, ProviderAdapter>();
    this.register(new MailtrapAdapter());
    this.register(new MailHogAdapter());
    this.register(new TempMailAdapter());
    this.register(new TwilioAdapter());
    this.register(new StripeSandboxAdapter());
    this.register(new CustomProviderAdapter());
  }

  static getInstance(): ProviderAdapterRegistry {
    if (!ProviderAdapterRegistry.instance) {
      ProviderAdapterRegistry.instance = new ProviderAdapterRegistry();
    }
    return ProviderAdapterRegistry.instance;
  }

  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.type.toLowerCase(), adapter);
  }

  get(type: string): ProviderAdapter | null {
    return this.adapters.get(type.toLowerCase()) || null;
  }

  list(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  listByCategory(category: string): ProviderAdapter[] {
    return Array.from(this.adapters.values()).filter(a => a.category === category);
  }
}

export default ProviderAdapterRegistry;