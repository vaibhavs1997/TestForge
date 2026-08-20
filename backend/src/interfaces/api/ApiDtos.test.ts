import { describe, expect, it, vi } from 'vitest';
import { ApiController } from './ApiController';
import { serializeApiOperation, serializeApiService } from './ApiDtos';

function createResponseMock() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('Api DTO serialization', () => {
  it('separates source contract data from derived service data', () => {
    const dto = serializeApiService({
      id: 'svc-1',
      projectId: 'proj-1',
      name: 'Inventory',
      description: 'Inventory management API',
      version: '2.1.0',
      tags: ['Inventory'],
      baseUrl: 'https://api.example.com/v2',
      createdAt: 1,
      updatedAt: 2,
      importKey: 'openapi3|inventory api|inventory',
      sourceContract: {
        openapi: '3.0.0',
        info: { title: 'Inventory API' },
        servers: [{ url: 'https://api.example.com/v2' }],
      },
    } as any);

    expect(dto.baseUrl).toBe('https://api.example.com/v2');
    expect(dto.contractRefreshRequired).toBe(false);
    expect(dto.derived).toEqual({
      baseUrl: 'https://api.example.com/v2',
      importKey: 'openapi3|inventory api|inventory',
    });
    expect((dto.sourceContract?.raw as any)?.info?.title).toBe('Inventory API');
  });

  it('separates source operation data from derived operation data', () => {
    const dto = serializeApiOperation({
      id: 'op-1',
      projectId: 'proj-1',
      serviceId: 'svc-1',
      name: 'getItem',
      method: 'GET',
      path: '/items/{itemId}',
      description: 'Get item',
      authenticationType: 'Bearer Token',
      status: 'Active',
      createdAt: 1,
      updatedAt: 2,
      sampleRequestBody: { id: 'string' },
      requiredRequestBodyFields: ['id'],
      requestUrl: 'https://api.example.com/v2/items/{itemId}',
      tags: ['Inventory'],
      contentTypes: ['application/json'],
      sourceOperation: {
        operationId: 'getItem',
        parameters: [{ name: 'itemId', in: 'path' }],
        requestBody: { content: { 'application/json': {} } },
        responses: { 200: { description: 'OK' } },
        security: [{ bearerAuth: [] }],
        servers: [{ url: 'https://api.example.com/v2' }],
        tags: ['Inventory'],
        requestContentTypes: ['application/json'],
        responseContentTypes: ['application/json'],
      },
    } as any);

    expect(dto.requestUrl).toBe('https://api.example.com/v2/items/{itemId}');
    expect(dto.contractRefreshRequired).toBe(false);
    expect(dto.derived).toEqual({
      requestUrl: 'https://api.example.com/v2/items/{itemId}',
      sampleRequestBody: { id: 'string' },
      requiredRequestBodyFields: ['id'],
      authenticationType: 'Bearer Token',
      contentTypes: ['application/json'],
    });
    expect(dto.sourceOperation?.raw.operationId).toBe('getItem');
    expect(dto.sourceOperation?.parameters).toEqual([{ name: 'itemId', in: 'path' }]);
    expect(dto.sourceOperation?.security).toEqual([{ bearerAuth: [] }]);
    expect(dto.tags).toEqual(['Inventory']);
  });
});

describe('ApiController DTO responses', () => {
  it('does not expose a service through another project URL', async () => {
    const getService = vi.fn();
    const controller = new ApiController(
      {} as any, {} as any, {} as any, { execute: getService } as any, {} as any,
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
      {} as any, {} as any,
      { findById: vi.fn().mockResolvedValue({ id: 'svc-b', projectId: 'project-b' }) } as any,
      {} as any,
    );

    await expect(controller.getService(
      { params: { projectId: 'project-a', serviceId: 'svc-b' } } as any,
      createResponseMock(),
    )).rejects.toThrow('not found in this project');
    expect(getService).not.toHaveBeenCalled();
  });

  it('returns typed service DTOs with source and derived separation', async () => {
    const controller = new ApiController(
      {} as any,
      {} as any,
      {} as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn().mockResolvedValue([]) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const serviceEntity = {
      id: 'svc-1',
      projectId: 'proj-1',
      name: 'Inventory',
      description: 'Inventory management API',
      version: '2.1.0',
      tags: ['Inventory'],
      baseUrl: 'https://api.example.com/v2',
      folderPath: undefined,
      createdAt: 1,
      updatedAt: 2,
      importKey: 'openapi3|inventory api|inventory',
      sourceContract: { openapi: '3.0.0', info: { title: 'Inventory API' } },
    };

    const listServices = vi.fn().mockResolvedValue([serviceEntity]);
    (controller as any).listApiServices = { execute: listServices };

    const req = { params: { projectId: 'proj-1' } } as any;
    const res = createResponseMock();

    await controller.listServices(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect((payload.data[0].sourceContract.raw as any).info.title).toBe('Inventory API');
    expect(payload.data[0].derived).toEqual({
      baseUrl: 'https://api.example.com/v2',
      importKey: 'openapi3|inventory api|inventory',
    });
  });

  it('forwards execution payload headers and body unchanged to the request executor', async () => {
    const executeApiRequest = vi.fn().mockResolvedValue({
      ok: true,
      requestedAt: '2026-08-17T00:00:00.000Z',
      durationMs: 12,
      request: {
        method: 'POST',
        url: 'https://login.example.com/token',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'client_id=app-123&client_secret=secret-456&grant_type=client_credentials&scope=openid+profile',
      },
    });

    const controller = new ApiController(
      {} as any,
      {} as any,
      {} as any,
      { execute: vi.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { execute: executeApiRequest } as any,
      {} as any,
      {} as any,
    );

    const req = {
      body: {
        requestUrl: 'https://login.example.com/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: {
          client_id: 'app-123',
          client_secret: 'secret-456',
          grant_type: 'client_credentials',
          scope: 'openid profile',
        },
        timeoutMs: 30000,
      },
    } as any;
    const res = createResponseMock();

    await controller.executeOperation(req, res);

    expect(executeApiRequest).toHaveBeenCalledWith({
      requestUrl: 'https://login.example.com/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: {
        client_id: 'app-123',
        client_secret: 'secret-456',
        grant_type: 'client_credentials',
        scope: 'openid profile',
      },
      timeoutMs: 30000,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns typed operation DTOs with source and derived separation', async () => {
    const controller = new ApiController(
      {} as any,
      {} as any,
      {} as any,
      { execute: vi.fn() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn().mockResolvedValue([]) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const operationEntity = {
      id: 'op-1',
      projectId: 'proj-1',
      serviceId: 'svc-1',
      name: 'getItem',
      method: 'GET',
      path: '/items/{itemId}',
      description: 'Get item',
      authenticationType: 'Bearer Token',
      status: 'Active',
      createdAt: 1,
      updatedAt: 2,
      sampleRequestBody: { id: 'string' },
      requiredRequestBodyFields: ['id'],
      requestUrl: 'https://api.example.com/v2/items/{itemId}',
      tags: ['Inventory'],
      contentTypes: ['application/json'],
      sourceOperation: {
        operationId: 'getItem',
        parameters: [{ name: 'itemId', in: 'path' }],
        requestBody: { content: { 'application/json': {} } },
        responses: { 200: { description: 'OK' } },
        security: [{ bearerAuth: [] }],
        servers: [{ url: 'https://api.example.com/v2' }],
        tags: ['Inventory'],
        requestContentTypes: ['application/json'],
        responseContentTypes: ['application/json'],
      },
    };

    (controller as any).listApiOperations = { execute: vi.fn().mockResolvedValue([operationEntity]) };

    const req = { params: { projectId: 'proj-1', serviceId: 'svc-1' } } as any;
    const res = createResponseMock();

    await controller.listOperations(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect((payload.data[0].sourceOperation.raw as any).operationId).toBe('getItem');
    expect(payload.data[0].derived.requestUrl).toBe('https://api.example.com/v2/items/{itemId}');
    expect(payload.data[0].derived.authenticationType).toBe('Bearer Token');
  });

  it('marks the real legacy UIM_01 OAuth operation as contract refresh required', async () => {
    const legacyOperation = {
      id: '53e3c937-61a9-4285-b342-5eab78d23b7c',
      projectId: 'UIM_01',
      serviceId: '26f89c7d-32a1-4c96-9617-bf2db4adfaaf',
      name: 'Get Auth Token',
      method: 'POST',
      path: '/oauth/v1/token',
      description: '',
      authenticationType: 'None',
      status: 'Active',
      createdAt: 1786990620185,
      updatedAt: 1786990620185,
      sampleRequestBody: {
        client_id: '{{token_client_id}}',
        client_secret: '{{token_client_secret}}',
      },
      requiredRequestBodyFields: null,
      requestUrl: 'https://u-api.sbdinc.com/{{token_base_url}}/oauth/v1/token',
      tags: [],
      contentTypes: [],
      sourceOperation: null,
    } as any;

    const dto = serializeApiOperation(legacyOperation);

    expect(dto.contractRefreshRequired).toBe(true);
    expect(dto.sourceOperation).toBeNull();
    expect(dto.sampleRequestBody).toEqual({
      client_id: '{{token_client_id}}',
      client_secret: '{{token_client_secret}}',
    });
  });
});
