import dns from 'node:dns/promises';
import net from 'node:net';
import { AppError } from '../../shared/errors.js';

export type OutboundBlockReason =
  | 'MALFORMED_URL'
  | 'UNSUPPORTED_PROTOCOL'
  | 'EMBEDDED_CREDENTIALS'
  | 'PORT_NOT_PERMITTED'
  | 'HOST_NOT_PERMITTED'
  | 'PRIVATE_ADDRESS'
  | 'LOOPBACK_ADDRESS'
  | 'METADATA_ADDRESS'
  | 'DNS_RESOLUTION_UNSAFE';

export class OutboundDestinationBlockedError extends AppError {
  constructor(public readonly reason: OutboundBlockReason, message: string) {
    super(400, `Execution blocked by network safety policy: ${message}`, 'OUTBOUND_DESTINATION_BLOCKED');
    this.name = 'OutboundDestinationBlockedError';
    Object.setPrototypeOf(this, OutboundDestinationBlockedError.prototype);
  }
}

export interface OutboundEgressPolicy {
  /** Development-only escape hatch. It is ignored for production environments. */
  allowPrivateNetworks?: boolean;
  allowLoopback?: boolean;
  allowedHosts?: string[];
  allowedHostPatterns?: string[];
  allowedPorts?: number[];
}

export interface ValidatedOutboundDestination {
  url: URL;
  hostname: string;
  /** A policy-checked, pinned address for the request's socket lookup. */
  address: string;
  family: 4 | 6;
}

export type DnsLookup = (hostname: string) => Promise<Array<{ address: string; family: number }>>;

const defaultLookup: DnsLookup = (hostname) => dns.lookup(hostname, { all: true, verbatim: true });

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
}

function parseIpv4(address: string): number[] | null {
  if (net.isIP(address) !== 4) return null;
  return address.split('.').map(Number);
}

function ipv4Reason(address: string): OutboundBlockReason | null {
  const octets = parseIpv4(address);
  if (!octets) return null;
  const [a, b] = octets;
  if (a === 127) return 'LOOPBACK_ADDRESS';
  if (a === 169 && b === 254) return 'METADATA_ADDRESS';
  if (a === 0 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 'PRIVATE_ADDRESS';
  // CGNAT, protocol assignments, benchmarking, documentation, multicast and reserved ranges.
  if ((a === 100 && b >= 64 && b <= 127) || a >= 224 || (a === 192 && (b === 0 || b === 88)) || (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0)) return 'PRIVATE_ADDRESS';
  return null;
}

function ipv6MappedIpv4(address: string): string | null {
  const input = address.toLowerCase().split('%')[0];
  const dotted = input.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return dotted[1];
  const [left, right = ''] = input.split('::');
  const leftParts = left ? left.split(':').filter(Boolean) : [];
  const rightParts = right ? right.split(':').filter(Boolean) : [];
  const groups = input.includes('::')
    ? [...leftParts, ...Array(Math.max(0, 8 - leftParts.length - rightParts.length)).fill('0'), ...rightParts]
    : leftParts;
  if (groups.length !== 8 || groups.slice(0, 5).some((part) => Number.parseInt(part || '0', 16) !== 0) || Number.parseInt(groups[5] || '0', 16) !== 0xffff) return null;
  const high = Number.parseInt(groups[6], 16);
  const low = Number.parseInt(groups[7], 16);
  if (!Number.isFinite(high) || !Number.isFinite(low)) return null;
  return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
}

function ipv6Reason(address: string): OutboundBlockReason | null {
  const normalized = address.toLowerCase().split('%')[0];
  const mapped = ipv6MappedIpv4(normalized);
  if (mapped) return ipv4Reason(mapped);
  if (normalized === '::1') return 'LOOPBACK_ADDRESS';
  if (normalized === '::') return 'PRIVATE_ADDRESS';
  if (normalized.startsWith('fe80:') || normalized.startsWith('fe90:') || normalized.startsWith('fea0:') || normalized.startsWith('feb0:')) return 'METADATA_ADDRESS';
  if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('ff')) return 'PRIVATE_ADDRESS';
  return null;
}

function addressReason(address: string): OutboundBlockReason | null {
  const family = net.isIP(address);
  if (family === 4) return ipv4Reason(address);
  if (family === 6) return ipv6Reason(address);
  return 'DNS_RESOLUTION_UNSAFE';
}

function hostAllowed(hostname: string, policy: OutboundEgressPolicy): boolean {
  if (policy.allowedHosts?.some((host) => normalizeHostname(host) === hostname)) return true;
  return policy.allowedHostPatterns?.some((pattern) => {
    const normalized = normalizeHostname(pattern);
    return normalized.startsWith('*.') && hostname.endsWith(normalized.slice(1)) && hostname !== normalized.slice(2);
  }) ?? false;
}

/**
 * One authoritative boundary for customer-controlled outbound destinations.
 * It resolves and validates all DNS records, then returns one validated address
 * that callers can pin in their socket lookup to reduce DNS rebinding risk.
 */
export class OutboundNetworkPolicy {
  constructor(private readonly lookup: DnsLookup = defaultLookup) {}

  async validate(value: string, policy: OutboundEgressPolicy = {}, tier = 'DEVELOPMENT'): Promise<ValidatedOutboundDestination> {
    let url: URL;
    try { url = new URL(value); } catch { throw new OutboundDestinationBlockedError('MALFORMED_URL', 'destination URL is malformed.'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new OutboundDestinationBlockedError('UNSUPPORTED_PROTOCOL', 'only HTTP and HTTPS destinations are supported.');
    if (!url.hostname) throw new OutboundDestinationBlockedError('MALFORMED_URL', 'destination URL has no host.');
    if (url.username || url.password) throw new OutboundDestinationBlockedError('EMBEDDED_CREDENTIALS', 'embedded URL credentials are not permitted.');

    const hostname = normalizeHostname(url.hostname);
    if (!hostname) throw new OutboundDestinationBlockedError('MALFORMED_URL', 'destination URL has no host.');
    const port = url.port ? Number(url.port) : (url.protocol === 'https:' ? 443 : 80);
    if (!Number.isInteger(port) || port < 1 || port > 65535 || (policy.allowedPorts && !policy.allowedPorts.includes(port))) {
      throw new OutboundDestinationBlockedError('PORT_NOT_PERMITTED', 'destination port is not permitted.');
    }
    if ((policy.allowedHosts?.length || policy.allowedHostPatterns?.length) && !hostAllowed(hostname, policy)) {
      throw new OutboundDestinationBlockedError('HOST_NOT_PERMITTED', 'destination host is not permitted.');
    }

    const production = String(tier).toUpperCase() === 'PRODUCTION';
    const explicitLocalhost = hostname === 'localhost' || hostname.endsWith('.localhost');
    if (explicitLocalhost && (production || !policy.allowLoopback)) {
      throw new OutboundDestinationBlockedError('LOOPBACK_ADDRESS', 'loopback destinations are not permitted.');
    }
    const literalFamily = net.isIP(hostname);
    let records: Array<{ address: string; family: number }>;
    try {
      records = explicitLocalhost ? [{ address: '127.0.0.1', family: 4 }] : literalFamily ? [{ address: hostname, family: literalFamily }] : await this.lookup(hostname);
    } catch {
      throw new OutboundDestinationBlockedError('DNS_RESOLUTION_UNSAFE', 'destination host could not be resolved.');
    }
    if (!records.length) throw new OutboundDestinationBlockedError('DNS_RESOLUTION_UNSAFE', 'destination host could not be resolved.');
    for (const record of records) {
      const reason = addressReason(record.address);
      if (!reason) continue;
      const canAllowPrivate = !production && Boolean(policy.allowPrivateNetworks);
      const canAllowLoopback = !production && Boolean(policy.allowLoopback);
      if ((reason === 'LOOPBACK_ADDRESS' && canAllowLoopback) || (reason === 'PRIVATE_ADDRESS' && canAllowPrivate)) continue;
      throw new OutboundDestinationBlockedError(reason, reason === 'METADATA_ADDRESS' ? 'metadata or link-local destinations are not permitted.' : 'resolved destination is within a protected network range.');
    }
    const selected = records[0];
    if (selected.family !== 4 && selected.family !== 6) throw new OutboundDestinationBlockedError('DNS_RESOLUTION_UNSAFE', 'destination returned an unsupported address family.');
    return { url, hostname, address: selected.address, family: selected.family };
  }
}

export const outboundNetworkPolicy = new OutboundNetworkPolicy();
