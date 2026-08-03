// ProviderEntity - Domain Entity for Provider Framework
// Represents an external service provider that can be referenced by test data generators.

export type ProviderCategory = 'Email' | 'SMS' | 'Payment' | 'Storage' | 'Custom';

export type ProviderAdapterType =
  | 'Mailtrap'
  | 'MailHog'
  | 'TempMail'
  | 'Twilio'
  | 'StripeSandbox'
  | 'Custom';

export interface ProviderCredentials {
  [key: string]: string | number | boolean | null;
}

export interface ProviderConfiguration {
  [key: string]: string | number | boolean | null | object;
}

export interface ProviderMetadata {
  supportedOperations: string[];
  capabilities: string[];
}

export class ProviderEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public name: string,
    public category: ProviderCategory,
    public adapter: ProviderAdapterType,
    public configuration: ProviderConfiguration,
    public credentials: ProviderCredentials,
    public enabled: boolean,
    public isDefault: boolean,
    public readonly createdAt: number,
    public updatedAt: number
  ) {}
}

export default ProviderEntity;
