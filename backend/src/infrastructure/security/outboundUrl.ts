import { outboundNetworkPolicy, type OutboundEgressPolicy } from './OutboundNetworkPolicy.js';

/** Compatibility facade; all outbound validation now belongs to OutboundNetworkPolicy. */
export async function assertSafeOutboundUrl(value: string, policy?: OutboundEgressPolicy, tier?: string): Promise<void> {
  await outboundNetworkPolicy.validate(value, policy, tier);
}

