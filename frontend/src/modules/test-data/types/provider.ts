export type ProviderCategory = 'Email' | 'SMS' | 'Payment' | 'Storage' | 'Custom';

export type ProviderAdapterType = 'Mailtrap' | 'MailHog' | 'TempMail' | 'Twilio' | 'StripeSandbox' | 'Custom';

export interface Provider {
  id: string;
  projectId: string;
  name: string;
  category: ProviderCategory;
  adapter: ProviderAdapterType;
  configuration: Record<string, any>;
  credentials: Record<string, any>;
  enabled: boolean;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateProviderInput {
  name: string;
  category: ProviderCategory;
  adapter: ProviderAdapterType;
  configuration: Record<string, any>;
  credentials: Record<string, any>;
  enabled?: boolean;
  isDefault?: boolean;
}

export interface ProviderTestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface AdapterInfo {
  type: string;
  category: string;
  capabilities: string[];
}