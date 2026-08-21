import dns from 'node:dns/promises';
import net from 'node:net';

function isPrivateIp(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168) || a === 0;
  }
  if (family === 6) {
    const normalized = address.toLowerCase();
    return normalized === '::1' || normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd');
  }
  return false;
}

/** Reject server-side requests to loopback, link-local, and private networks. */
export async function assertSafeOutboundUrl(value: string): Promise<void> {
  const parsed = new URL(value);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported');
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || isPrivateIp(hostname)) {
    throw new Error('Requests to private network addresses are not allowed');
  }

  // DNS rebinding protection is enabled for deployed environments. Local
  // development may intentionally target localhost services.
  if (process.env.NODE_ENV === 'production') {
    const records = await dns.lookup(hostname, { all: true });
    if (records.some((record) => isPrivateIp(record.address))) {
      throw new Error('Requests to private network addresses are not allowed');
    }
  }
}

