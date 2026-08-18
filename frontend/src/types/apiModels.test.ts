import { describe, expect, it } from 'vitest';
import { toApiOperationView, toApiServiceView, type ApiOperationDto, type ApiServiceDto } from './apiModels';

describe('apiModels mappers', () => {
  it('preserves service source and derived contract data separately', () => {
    const raw: ApiServiceDto = {
      id: 'svc-1',
      projectId: 'proj-1',
      name: 'Pet Store',
      description: 'OpenAPI service',
      version: '1.0.0',
      tags: ['pets', 'public'],
      baseUrl: '',
      sourceContract: {
        raw: {
          openapi: '3.0.3',
          info: { title: 'Pet Store' },
        },
      },
      derived: {
        baseUrl: 'https://api.example.com',
        importKey: 'pet-store',
      },
      createdAt: 1,
      updatedAt: 2,
    };

    const view = toApiServiceView(raw);

    expect(view.sourceContract).toEqual(raw.sourceContract);
    expect(view.derived).toEqual(raw.derived);
    expect(view.baseUrl).toBe('https://api.example.com');
  });

  it('preserves source operation data separately from derived execution helpers', () => {
    const raw: ApiOperationDto = {
      id: 'op-1',
      serviceId: 'svc-1',
      name: 'listPets',
      method: 'GET',
      path: '/pets',
      requestUrl: '',
      description: 'List pets',
      authenticationType: 'bearer',
      status: 'Active',
      tags: ['pets'],
      sampleRequestBody: { limit: 10 },
      requiredRequestBodyFields: ['limit'],
      sourceOperation: {
        raw: {
          operationId: 'listPets',
          description: 'List pets',
        },
        parameters: [{ name: 'limit', in: 'query', required: false }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': { description: 'ok' },
        },
        security: [{ bearerAuth: [] }],
        servers: [{ url: 'https://api.example.com' }],
        tags: ['pets'],
        requestContentTypes: ['application/json'],
        responseContentTypes: ['application/json'],
      },
      derived: {
        requestUrl: 'https://api.example.com/pets',
        sampleRequestBody: { limit: 10 },
        requiredRequestBodyFields: ['limit'],
        authenticationType: 'bearer',
        contentTypes: ['application/json'],
      },
      createdAt: 1,
      updatedAt: 2,
    };

    const view = toApiOperationView(raw, 'Pet Store');

    expect(view.sourceOperation).toEqual(raw.sourceOperation);
    expect(view.derived).toEqual(raw.derived);
    expect(view.requestUrl).toBe('https://api.example.com/pets');
    expect(view.tags).toEqual(['pets']);
  });
});
