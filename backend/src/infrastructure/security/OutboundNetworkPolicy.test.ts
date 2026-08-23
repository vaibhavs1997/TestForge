import { describe, expect, it } from 'vitest';
import { OutboundDestinationBlockedError, OutboundNetworkPolicy } from './OutboundNetworkPolicy.js';

const publicDns = async () => [{ address: '93.184.216.34', family: 4 }];
const policy = () => new OutboundNetworkPolicy(publicDns);

describe('OutboundNetworkPolicy', () => {
  it('permits a public HTTP destination and returns a pinned address', async () => {
    await expect(policy().validate('https://api.example.com/v1')).resolves.toMatchObject({ hostname: 'api.example.com', address: '93.184.216.34', family: 4 });
  });

  it.each([
    '127.0.0.1', '127.0.0.2', '10.0.0.1', '172.16.0.1', '172.31.255.255',
    '192.168.0.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '224.0.0.1',
  ])('blocks protected IPv4 address %s', async (address) => {
    await expect(policy().validate(`http://${address}`)).rejects.toBeInstanceOf(OutboundDestinationBlockedError);
  });

  it.each(['::1', '::', 'fe80::1', 'fc00::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:169.254.169.254'])(
    'blocks protected IPv6 address %s',
    async (address) => {
      await expect(policy().validate(`http://[${address}]`)).rejects.toBeInstanceOf(OutboundDestinationBlockedError);
    },
  );

  it.each(['http://127.1', 'http://2130706433', 'http://0x7f000001', 'http://localhost', 'http://localhost.'])(
    'blocks URL parser loopback bypass %s',
    async (url) => { await expect(policy().validate(url)).rejects.toBeInstanceOf(OutboundDestinationBlockedError); },
  );

  it('rejects a hostname when any DNS record is protected', async () => {
    const dns = async () => [{ address: '93.184.216.34', family: 4 }, { address: '127.0.0.1', family: 4 }];
    await expect(new OutboundNetworkPolicy(dns).validate('https://api.example.com')).rejects.toMatchObject({ reason: 'LOOPBACK_ADDRESS' });
  });

  it('allows explicit local development egress only outside production', async () => {
    const dns = async () => [{ address: '127.0.0.1', family: 4 }];
    const local = new OutboundNetworkPolicy(dns);
    await expect(local.validate('http://dev-api.local:3000', { allowLoopback: true }, 'DEVELOPMENT')).resolves.toMatchObject({ address: '127.0.0.1' });
    await expect(local.validate('http://dev-api.local:3000', { allowLoopback: true }, 'PRODUCTION')).rejects.toBeInstanceOf(OutboundDestinationBlockedError);
  });

  it('rejects embedded credentials, unsupported schemes, unpermitted ports, and allowlist misses', async () => {
    await expect(policy().validate('ftp://api.example.com')).rejects.toMatchObject({ reason: 'UNSUPPORTED_PROTOCOL' });
    await expect(policy().validate('https://user:secret@api.example.com')).rejects.toMatchObject({ reason: 'EMBEDDED_CREDENTIALS' });
    await expect(policy().validate('https://api.example.com:8443', { allowedPorts: [443] })).rejects.toMatchObject({ reason: 'PORT_NOT_PERMITTED' });
    await expect(policy().validate('https://api.example.com', { allowedHosts: ['allowed.example.com'] })).rejects.toMatchObject({ reason: 'HOST_NOT_PERMITTED' });
  });
});
