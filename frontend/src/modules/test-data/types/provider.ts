import type { ProviderDto } from '../../../types/moduleContracts';

export type ProviderCategory = ProviderDto['category'];

export type ProviderAdapterType = ProviderDto['adapter'];

export type Provider = ProviderDto;

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
