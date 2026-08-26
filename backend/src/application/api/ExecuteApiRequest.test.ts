import axios from 'axios';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ExecuteApiRequest } from './ExecuteApiRequest.js';
import { secureHttpExecutor } from '../../infrastructure/http/SecureHttpExecutor.js';

vi.mock('axios', () => ({
  default: {
    request: vi.fn(),
  },
}));

const mockedAxios = vi.mocked(axios, true);

describe('ExecuteApiRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(secureHttpExecutor, 'execute').mockImplementation((config: any) => mockedAxios.request(config));
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

  it('only applies accepted Field Data rules when manual Test Data mode is enabled', async () => {
    const resolver = {
      resolveRequestFields: vi.fn().mockResolvedValue({ email: { sourceType: 'GENERATE', value: 'generated@example.test' } }),
      getInputRule: vi.fn().mockResolvedValue({ input: { location: 'BODY', path: 'email' }, valueStrategy: 'GENERATE' }),
    } as any;
    mockedAxios.request.mockResolvedValue({ status: 200, statusText: 'OK', headers: {}, data: '{"password":"never-return-this"}' } as any);
    const executor = new ExecuteApiRequest(undefined, resolver);
    await executor.execute({ requestUrl: 'https://api.example.com/users', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { email: 'editor@example.test' }, projectId: 'p', operationId: 'op', useTestData: true });
    expect(JSON.parse((mockedAxios.request.mock.calls[0][0] as any).data).email).toBe('generated@example.test');
    resolver.resolveRequestFields.mockClear();
    await executor.execute({ requestUrl: 'https://api.example.com/users', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { email: 'editor@example.test' }, projectId: 'p', operationId: 'op', useTestData: false });
    expect(JSON.parse((mockedAxios.request.mock.calls[1][0] as any).data).email).toBe('editor@example.test');
    expect(resolver.resolveRequestFields).not.toHaveBeenCalled();
  });

  it('applies canonical body, nested body, query, path, header, and cookie values to the outbound request', async () => {
    const resolver = {
      resolveRequestFields: vi.fn().mockResolvedValue({
        email: { sourceType: 'GENERATE', value: 'fresh@example.test', location: 'BODY', path: 'user.email' },
        code: { sourceType: 'FIXED', value: 'A1', location: 'QUERY', path: 'code' },
        id: { sourceType: 'DATASET', value: '42', location: 'PATH', path: 'id' },
        trace: { sourceType: 'ENVIRONMENT', value: 'trace-id', location: 'HEADER', path: 'X-Trace' },
        session: { sourceType: 'RUNTIME', value: 'session-id', location: 'COOKIE', path: 'session' },
      }),
    } as any;
    mockedAxios.request.mockResolvedValue({ status: 200, statusText: 'OK', headers: {}, data: '{}' } as any);
    await new ExecuteApiRequest(undefined, resolver).execute({ requestUrl: 'https://api.example.test/users/{id}', method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: 'other=1' }, body: { user: { email: 'editor@example.test' } }, projectId: 'p', operationId: 'op', useTestData: true });
    const request = mockedAxios.request.mock.calls[0][0] as any;
    expect(request.url).toBe('https://api.example.test/users/42?code=A1');
    expect(JSON.parse(request.data)).toEqual({ user: { email: 'fresh@example.test' } });
    expect(request.headers['X-Trace']).toBe('trace-id');
    expect(request.headers.Cookie).toContain('other=1');
    expect(request.headers.Cookie).toContain('session=session-id');
  });

  it('sends secret values server-side while redacting them from the returned request record', async () => {
    const resolver = { resolveRequestFields: vi.fn().mockResolvedValue({ password: { sourceType: 'SECRET', value: 'never-return-this', location: 'BODY', path: 'password', sensitive: true } }) } as any;
    mockedAxios.request.mockResolvedValue({ status: 200, statusText: 'OK', headers: {}, data: '{"password":"never-return-this"}' } as any);
    const result = await new ExecuteApiRequest(undefined, resolver).execute({ requestUrl: 'https://api.example.test/register', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: { password: 'editor' }, projectId: 'p', operationId: 'op', useTestData: true });
    expect(JSON.parse((mockedAxios.request.mock.calls[0][0] as any).data).password).toBe('never-return-this');
    expect(JSON.stringify(result.request)).not.toContain('never-return-this');
    expect(result.request.body).toEqual({ password: '[REDACTED]' });
    expect(JSON.stringify(result.response)).not.toContain('never-return-this');
  });
});
