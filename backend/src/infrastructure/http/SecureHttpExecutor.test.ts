import axios from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { SecureHttpExecutor } from './SecureHttpExecutor.js';
import { OutboundNetworkPolicy } from '../security/OutboundNetworkPolicy.js';

vi.mock('axios', () => ({ default: { request: vi.fn() } }));
const mockedAxios = vi.mocked(axios, true);

describe('SecureHttpExecutor', () => {
  it('pins the policy-validated address and disables redirects', async () => {
    mockedAxios.request.mockResolvedValue({ status: 200, data: 'ok', headers: {}, statusText: 'OK' } as any);
    const executor = new SecureHttpExecutor(new OutboundNetworkPolicy(async () => [{ address: '93.184.216.34', family: 4 }]));
    await executor.execute({ url: 'https://api.example.com/path' });
    const config = mockedAxios.request.mock.calls[0][0] as any;
    expect(config.maxRedirects).toBe(0);
    await new Promise<void>((resolve, reject) => config.httpsAgent.options.lookup('api.example.com', {}, (error: Error | null, address: string, family: number) => {
      if (error) reject(error); else { expect(address).toBe('93.184.216.34'); expect(family).toBe(4); resolve(); }
    }));
  });

  it('does not call Axios when policy blocks a private destination', async () => {
    mockedAxios.request.mockClear();
    const executor = new SecureHttpExecutor(new OutboundNetworkPolicy(async () => [{ address: '127.0.0.1', family: 4 }]));
    await expect(executor.execute({ url: 'http://customer.example' })).rejects.toMatchObject({ errorCode: 'OUTBOUND_DESTINATION_BLOCKED' });
    expect(mockedAxios.request).not.toHaveBeenCalled();
  });
});
