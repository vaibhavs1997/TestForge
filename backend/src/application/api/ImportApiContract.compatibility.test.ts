import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ImportApiContract } from './ImportApiContract.js';
import { ApiServiceRepository } from '../../infrastructure/api/ApiServiceRepository.js';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository.js';
import { serializeApiOperation, serializeApiService } from '../../interfaces/api/ApiDtos.js';

function createTempWorkspace() {
  const previousCwd = process.cwd();
  const tempDir = mkdtempSync(join(tmpdir(), 'testforge-compat-'));
  process.chdir(tempDir);
  return {
    cleanup() {
      process.chdir(previousCwd);
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

async function importSpec(projectId: string, fileName: string, content: string) {
  const useCase = new ImportApiContract(new ApiServiceRepository(), new ApiOperationRepository());
  await useCase.execute({
    projectId,
    fileName,
    content,
  });

  const serviceRepo = new ApiServiceRepository();
  const operationRepo = new ApiOperationRepository();
  const services = await serviceRepo.findByProject(projectId);
  const operationsByService = await Promise.all(
    services.map(async (service) => ({
      service,
      operations: await operationRepo.findByProjectAndService(projectId, service.id),
    })),
  );

  return {
    services: operationsByService.map(({ service }) => serializeApiService(service as any)),
    operationsByService: operationsByService.map(({ service, operations }) => ({
      service: serializeApiService(service as any),
      operations: operations.map((operation) => serializeApiOperation(operation as any)),
    })),
  };
}

describe('ImportApiContract compatibility', () => {
  let workspace: { cleanup: () => void };

  beforeEach(() => {
    workspace = createTempWorkspace();
  });

  afterEach(() => {
    workspace.cleanup();
  });

  it('preserves a realistic OpenAPI 3.0 contract through source, canonical DTO, and API Explorer data', async () => {
    const spec = JSON.stringify({
      openapi: '3.0.3',
      info: {
        title: 'Orders API',
        version: '1.4.0',
        description: 'Order management',
      },
      servers: [
        {
          url: 'https://{env}.api.example.com/{version}',
          variables: {
            env: { default: 'staging' },
            version: { default: 'v1' },
          },
        },
      ],
      components: {
        securitySchemes: {
          apiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
          bearerAuth: { type: 'http', scheme: 'bearer' },
          basicAuth: { type: 'http', scheme: 'basic' },
          oauth2: {
            type: 'oauth2',
            flows: {
              clientCredentials: {
                tokenUrl: 'https://auth.example.com/token',
                scopes: { 'orders:read': 'Read orders' },
              },
            },
          },
        },
        parameters: {
          TraceId: {
            name: 'X-Trace-Id',
            in: 'header',
            schema: { type: 'string' },
            example: 'trace-1',
          },
        },
        schemas: {
          OrderBase: {
            type: 'object',
            required: ['orderId', 'status'],
            properties: {
              orderId: { type: 'string', example: 'ord_123' },
              status: { type: 'string', enum: ['draft', 'active', 'archived'], default: 'draft' },
            },
          },
          Address: {
            type: 'object',
            required: ['street'],
            properties: {
              street: { type: 'string', example: '1 Test Street' },
              city: { type: 'string', default: 'Pune' },
            },
          },
          OrderDetails: {
            allOf: [
              { $ref: '#/components/schemas/OrderBase' },
              {
                type: 'object',
                properties: {
                  shippingAddress: { $ref: '#/components/schemas/Address' },
                  note: { type: 'string', nullable: true },
                  lines: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['sku'],
                      properties: {
                        sku: { type: 'string', enum: ['sku-1', 'sku-2'] },
                        quantity: { type: 'integer', default: 1 },
                      },
                    },
                  },
                },
              },
            ],
          },
          UploadPayload: {
            type: 'object',
            required: ['document'],
            properties: {
              document: { type: 'string', format: 'binary' },
              notes: { type: 'string', default: 'optional' },
            },
          },
          ErrorResponse: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Not found' },
            },
          },
        },
      },
      paths: {
        '/orders/{orderId}': {
          parameters: [
            {
              name: 'locale',
              in: 'query',
              schema: { type: 'string', enum: ['en', 'fr'], default: 'en' },
            },
          ],
          security: [{ apiKeyAuth: [] }],
          get: {
            operationId: 'getOrder',
            tags: ['Orders'],
            summary: 'Get order',
            description: 'Fetch one order',
            security: [{ bearerAuth: [] }],
            parameters: [
              { $ref: '#/components/parameters/TraceId' },
              { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
            ],
            responses: {
              200: {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/OrderDetails' },
                    example: {
                      orderId: 'ord_123',
                      status: 'active',
                      shippingAddress: { street: '1 Test Street', city: 'Pune' },
                    },
                  },
                  'application/xml': {
                    schema: { type: 'string' },
                  },
                },
              },
              404: {
                description: 'Not found',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/ErrorResponse' },
                  },
                },
              },
            },
          },
          post: {
            operationId: 'updateOrder',
            tags: ['Orders'],
            summary: 'Update order',
            description: 'Update one order',
            security: [{ basicAuth: [] }],
            parameters: [
              { name: 'orderId', in: 'path', required: true, schema: { type: 'string' } },
            ],
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/OrderDetails' },
                  example: {
                    orderId: 'ord_123',
                    status: 'active',
                  },
                },
                'multipart/form-data': {
                  schema: { $ref: '#/components/schemas/UploadPayload' },
                },
              },
            },
            responses: {
              200: {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/OrderDetails' },
                  },
                },
              },
              400: {
                description: 'Bad Request',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/ErrorResponse' },
                  },
                },
              },
            },
          },
        },
        '/exports': {
          post: {
            operationId: 'createExport',
            tags: ['Exports'],
            summary: 'Create export',
            security: [{ oauth2: ['orders:read'] }],
            requestBody: {
              content: {
                'application/x-www-form-urlencoded': {
                  schema: {
                    type: 'object',
                    properties: {
                      format: { type: 'string', enum: ['csv', 'json'], default: 'csv' },
                    },
                  },
                },
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    properties: {
                      attachment: { type: 'string', format: 'binary' },
                    },
                  },
                },
              },
            },
            responses: {
              201: {
                description: 'Created',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        status: { type: 'string', enum: ['queued', 'ready'], default: 'queued' },
                      },
                    },
                  },
                },
              },
              202: { description: 'Accepted' },
            },
          },
        },
      },
    });

    const { services, operationsByService } = await importSpec('orders-project', 'orders.openapi.json', spec);
    expect(services).toHaveLength(2);

    const ordersService = services.find((service) => service.name === 'Orders');
    const exportsService = services.find((service) => service.name === 'Exports');
    expect(ordersService).toBeTruthy();
    expect(exportsService).toBeTruthy();

    expect(ordersService?.baseUrl).toBe('https://staging.api.example.com/v1');
    const ordersSourceContract = ordersService?.sourceContract?.raw as any;
    expect(ordersSourceContract?.servers?.[0]?.url).toBe('https://{env}.api.example.com/{version}');
    expect(ordersSourceContract?.info?.title).toBe('Orders API');

    const ordersOps = operationsByService.find((entry) => entry.service.id === ordersService?.id)?.operations ?? [];
    expect(ordersOps).toHaveLength(2);

    const getOrderDto = ordersOps.find((operation) => operation.name === 'getOrder') as any;
    const updateOrderDto = ordersOps.find((operation) => operation.name === 'updateOrder') as any;

    const getOrderSourceOperation = getOrderDto.sourceOperation as any;
    const updateOrderSourceOperation = updateOrderDto.sourceOperation as any;

    expect(getOrderDto.requestUrl).toBe('https://staging.api.example.com/v1/orders/{orderId}');
    expect(getOrderSourceOperation?.raw?.operationId).toBe('getOrder');
    expect(getOrderSourceOperation?.raw?.summary).toBe('Get order');
    expect((getOrderSourceOperation?.parameters ?? []).map((parameter: any) => `${parameter.in}:${parameter.name}`)).toEqual([
      'query:locale',
      'header:X-Trace-Id',
      'path:orderId',
    ]);
    expect(getOrderSourceOperation?.security).toEqual([{ bearerAuth: [] }]);
    expect(getOrderSourceOperation?.responseContentTypes).toEqual(['application/json', 'application/xml']);
    expect(getOrderSourceOperation?.responses?.['200']?.content?.['application/json']?.schema?.properties?.orderId?.example).toBe('ord_123');
    expect(getOrderSourceOperation?.responses?.['200']?.content?.['application/json']?.schema?.properties?.status?.default).toBe('draft');
    expect(getOrderSourceOperation?.responses?.['404']?.content?.['application/json']?.schema?.properties?.message?.example).toBe('Not found');

    expect(updateOrderDto.requestUrl).toBe('https://staging.api.example.com/v1/orders/{orderId}');
    expect(updateOrderDto.authenticationType).toBe('Basic Authentication');
    expect(updateOrderSourceOperation?.raw?.operationId).toBe('updateOrder');
    expect(updateOrderSourceOperation?.requestContentTypes).toEqual([
      'application/json',
      'multipart/form-data',
    ]);
    expect(updateOrderSourceOperation?.requestBody?.content?.['application/json']?.schema?.properties?.shippingAddress?.properties?.street?.example).toBe('1 Test Street');
    expect(updateOrderSourceOperation?.requestBody?.content?.['application/json']?.schema?.properties?.note?.nullable).toBe(true);
    expect(updateOrderSourceOperation?.requestBody?.content?.['multipart/form-data']?.schema?.properties?.document?.format).toBe('binary');
    expect(updateOrderSourceOperation?.responses?.['400']?.content?.['application/json']?.schema?.properties?.message?.example).toBe('Not found');
    expect(updateOrderDto.derived.sampleRequestBody).toEqual({
      orderId: 'ord_123',
      status: 'active',
    });

    const exportsOps = operationsByService.find((entry) => entry.service.id === exportsService?.id)?.operations ?? [];
    expect(exportsOps).toHaveLength(1);
    const exportDto = exportsOps[0] as any;
    const exportSourceOperation = exportDto.sourceOperation as any;
    expect(exportDto.authenticationType).toBe('OAuth 2.0');
    expect(exportSourceOperation?.security).toEqual([{ oauth2: ['orders:read'] }]);
    expect(exportSourceOperation?.requestContentTypes).toEqual([
      'application/x-www-form-urlencoded',
      'multipart/form-data',
    ]);
    expect(exportSourceOperation?.responses?.['201']?.content?.['application/json']?.schema?.properties?.status?.default).toBe('queued');
    expect(exportSourceOperation?.responses?.['201']?.content?.['application/json']?.schema?.properties?.status?.enum).toEqual(['queued', 'ready']);
  });

  it('preserves OpenAPI 3.1 composition, nullables, and same-path multiple methods', async () => {
    const spec = JSON.stringify({
      openapi: '3.1.0',
      info: {
        title: 'Catalog API',
        version: '2026.08',
        description: 'Catalog and inventory lookup',
      },
      components: {
        schemas: {
          CatalogBase: {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'string' },
              kind: { type: 'string', enum: ['physical', 'digital'] },
            },
          },
          CatalogDetail: {
            allOf: [
              { $ref: '#/components/schemas/CatalogBase' },
              {
                type: 'object',
                properties: {
                  labels: {
                    type: 'array',
                    items: {
                      oneOf: [
                        { type: 'string', enum: ['new', 'sale'] },
                        { type: 'integer', default: 0 },
                      ],
                    },
                  },
                  rating: { type: ['number', 'null'], default: null },
                  metadata: {
                    anyOf: [
                      {
                        type: 'object',
                        properties: {
                          source: { type: 'string', example: 'feed' },
                        },
                      },
                      { type: 'null' },
                    ],
                  },
                },
              },
            ],
          },
          CatalogError: {
            type: 'object',
            properties: {
              message: { type: 'string', example: 'Not found' },
            },
          },
        },
      },
      paths: {
        '/catalog/items': {
          get: {
            operationId: 'listCatalogItems',
            tags: ['Catalog'],
            summary: 'List items',
            responses: {
              200: {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: {
                      oneOf: [
                        { $ref: '#/components/schemas/CatalogDetail' },
                        { type: 'null' },
                      ],
                    },
                  },
                },
              },
            },
          },
          patch: {
            operationId: 'patchCatalogItem',
            tags: ['Catalog'],
            summary: 'Patch item',
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CatalogDetail' },
                  examples: {
                    sample: {
                      value: {
                        id: 'item-1',
                        kind: 'physical',
                        rating: null,
                      },
                    },
                  },
                },
              },
            },
            responses: {
              200: {
                description: 'Updated',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/CatalogDetail' },
                  },
                  'text/plain': {
                    schema: { type: 'string' },
                  },
                },
              },
              404: {
                description: 'Not found',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/CatalogError' },
                  },
                },
              },
            },
          },
        },
      },
    });

    const { services, operationsByService } = await importSpec('catalog-project', 'catalog.openapi.json', spec);
    expect(services).toHaveLength(1);

    const catalogService = services[0];
    expect(catalogService.baseUrl).toBe('');
    const catalogSourceContract = catalogService.sourceContract?.raw as any;
    expect(catalogSourceContract?.openapi).toBe('3.1.0');
    expect(catalogSourceContract?.info?.title).toBe('Catalog API');

    const catalogOps = operationsByService[0].operations;
    expect(catalogOps).toHaveLength(2);

    const listDto = catalogOps.find((operation) => operation.name === 'listCatalogItems') as any;
    const patchDto = catalogOps.find((operation) => operation.name === 'patchCatalogItem') as any;

    const listSourceOperation = listDto.sourceOperation as any;
    const patchSourceOperation = patchDto.sourceOperation as any;

    expect(listSourceOperation?.raw?.operationId).toBe('listCatalogItems');
    expect(listSourceOperation?.responses?.['200']?.content?.['application/json']?.schema?.oneOf?.[0]?.allOf?.[1]?.properties?.rating?.type).toEqual(['number', 'null']);
    expect(listSourceOperation?.responses?.['200']?.content?.['application/json']?.schema?.oneOf?.[0]?.allOf?.[1]?.properties?.metadata?.anyOf?.[1]?.type).toBe('null');

    expect(patchSourceOperation?.raw?.operationId).toBe('patchCatalogItem');
    expect(patchSourceOperation?.requestContentTypes).toEqual(['application/json']);
    expect(patchSourceOperation?.requestBody?.content?.['application/json']?.examples?.sample?.value?.kind).toBe('physical');
    expect(patchSourceOperation?.responses?.['200']?.content?.['application/json']?.schema?.allOf?.[1]?.properties?.labels?.items?.oneOf).toHaveLength(2);
    expect(patchSourceOperation?.responses?.['200']?.content?.['text/plain']?.schema?.type).toBe('string');
    expect(patchSourceOperation?.responses?.['404']?.content?.['application/json']?.schema?.properties?.message?.example).toBe('Not found');
    expect(patchDto.derived.sampleRequestBody).toEqual({
      id: 'item-1',
      kind: 'physical',
      rating: null,
    });
  });
});
