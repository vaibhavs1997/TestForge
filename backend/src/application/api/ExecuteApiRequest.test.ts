import axios from 'axios';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ExecuteApiRequest } from './ExecuteApiRequest';

vi.mock('axios', () => ({
  default: {
    request: vi.fn(),
  },
}));

const mockedAxios = vi.mocked(axios, true);

describe('ExecuteApiRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the upstream response with parsed JSON body', async () => {
    mockedAxios.request.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: '{"ok":true,"message":"done"}',
    } as any);

    const result = await new ExecuteApiRequest().execute({
      requestUrl: 'https://api.example.com/items',
      method: 'POST',
      body: { name: 'Item 1' },
    });

    expect(result.ok).toBe(true);
    expect(result.request.url).toBe('https://api.example.com/items');
    expect(result.response?.status).toBe(200);
    expect(result.response?.body).toEqual({ ok: true, message: 'done' });
  });

  it('serializes application/x-www-form-urlencoded bodies without forcing JSON', async () => {
    mockedAxios.request.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: '{}',
    } as any);

    const body = {
      client_id: 'app-123',
      client_secret: 'secret-456',
      grant_type: 'client_credentials',
      scope: 'openid profile',
    };

    await new ExecuteApiRequest().execute({
      requestUrl: 'https://login.example.com/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const requestConfig = mockedAxios.request.mock.calls[0][0] as any;
    expect(requestConfig.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(requestConfig.data).toBe(
      'client_id=app-123&client_secret=secret-456&grant_type=client_credentials&scope=openid+profile',
    );
  });

  it('serializes multipart bodies as FormData and keeps the transport content type multipart-safe', async () => {
    mockedAxios.request.mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      data: '{}',
    } as any);

    await new ExecuteApiRequest().execute({
      requestUrl: 'https://api.example.com/upload',
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: {
        title: 'Document',
        metadata: { category: 'legal' },
      },
    });

    const requestConfig = mockedAxios.request.mock.calls[0][0] as any;
    expect(requestConfig.data).toBeInstanceOf(FormData);
    expect(requestConfig.headers['Content-Type']).toBeUndefined();
  });

  it('returns a structured error when the request cannot be sent', async () => {
    mockedAxios.request.mockRejectedValue(new Error('Network down'));

    const result = await new ExecuteApiRequest().execute({
      requestUrl: 'https://api.example.com/items',
      method: 'GET',
    });

    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain('Network down');
    expect(result.response).toBeUndefined();
  });
});
