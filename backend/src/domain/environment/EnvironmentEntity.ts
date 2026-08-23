// EnvironmentEntity - Domain Entity for Environment

export const ENVIRONMENT_TIERS = ['LOCAL', 'DEVELOPMENT', 'TEST', 'STAGING', 'PRODUCTION'] as const;
export type EnvironmentTier = typeof ENVIRONMENT_TIERS[number];

export interface EnvironmentExecutionPolicy {
  allowGeneratedMutation: boolean;
  allowDestructiveOperations: boolean;
  allowSecurityTests: boolean;
  allowPerformanceTests: boolean;
  requireApproval: boolean;
  allowedHttpMethods: string[];
  mappingConfidenceThreshold: number;
  outboundEgressPolicy?: OutboundEgressPolicy;
}

export interface OutboundEgressPolicy {
  allowPrivateNetworks?: boolean;
  allowLoopback?: boolean;
  allowedHosts?: string[];
  allowedHostPatterns?: string[];
  allowedPorts?: number[];
}

const ALL_HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export function defaultEnvironmentExecutionPolicy(tier: EnvironmentTier): EnvironmentExecutionPolicy {
  if (tier === 'PRODUCTION') {
    return {
      allowGeneratedMutation: false,
      allowDestructiveOperations: false,
      allowSecurityTests: false,
      allowPerformanceTests: false,
      requireApproval: true,
      allowedHttpMethods: ['GET', 'HEAD', 'OPTIONS'],
      mappingConfidenceThreshold: 70,
    };
  }
  return {
    allowGeneratedMutation: true,
    allowDestructiveOperations: true,
    allowSecurityTests: true,
    allowPerformanceTests: true,
    requireApproval: false,
    allowedHttpMethods: ALL_HTTP_METHODS,
    mappingConfidenceThreshold: 70,
  };
}

export function normalizeEnvironmentTier(value: unknown): EnvironmentTier {
  const tier = String(value || 'DEVELOPMENT').trim().toUpperCase();
  return (ENVIRONMENT_TIERS as readonly string[]).includes(tier) ? tier as EnvironmentTier : 'DEVELOPMENT';
}

export function resolveEnvironmentExecutionPolicy(
  tier: EnvironmentTier,
  policy?: Partial<EnvironmentExecutionPolicy> | null,
): EnvironmentExecutionPolicy {
  const defaults = defaultEnvironmentExecutionPolicy(tier);
  return {
    ...defaults,
    ...(policy || {}),
    allowedHttpMethods: (policy?.allowedHttpMethods || defaults.allowedHttpMethods).map((method) => method.toUpperCase()),
    mappingConfidenceThreshold: Number.isFinite(policy?.mappingConfidenceThreshold)
      ? Math.max(0, Math.min(100, Number(policy?.mappingConfidenceThreshold)))
      : defaults.mappingConfidenceThreshold,
  };
}

export class EnvironmentEntity {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public name: string,
    public baseUrl: string,
    public description: string,
    public authentication: any,
    public variables: Record<string, unknown>,
    public timeout: number,
    public readonly createdAt: number,
    public updatedAt: number,
    public isDefault?: boolean,
    public tier: EnvironmentTier = 'DEVELOPMENT',
    public executionPolicy: Partial<EnvironmentExecutionPolicy> | null = null,
  ) {}
}

export default EnvironmentEntity;
