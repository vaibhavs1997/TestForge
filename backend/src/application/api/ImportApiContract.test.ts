import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ImportApiContract } from '../../application/api/ImportApiContract.js';
import { ApiServiceRepository } from '../../infrastructure/api/ApiServiceRepository.js';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository.js';

const OPENAPI_SPEC = JSON.stringify({
  openapi: '3.0.0',
  info: { title: 'Pet Store', version: '1.0.0' },
  paths: {
    '/pets': {
      get: { operationId: 'listPets', summary: 'List pets' },
    },
  },
});

const RICH_OPENAPI_SPEC = JSON.stringify({
  openapi: '3.0.0',
  info: {
    title: 'Inventory API',
    version: '2.1.0',
    description: 'Inventory management API',
  },
  servers: [{ url: 'https://api.example.com/v2', description: 'Prod' }],
  tags: [{ name: 'Inventory' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
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
      BaseItem: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
          kind: { type: 'string', enum: ['physical', 'digital'] },
        },
      },
      ItemDetails: {
        allOf: [
          { $ref: '#/components/schemas/BaseItem' },
          {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string', example: 'Widget' },
              status: { type: 'string', enum: ['active', 'archived'], default: 'active' },
            },
          },
        ],
      },
    },
  },
  paths: {
    '/items/{itemId}': {
      parameters: [
        {
          name: 'locale',
          in: 'query',
          schema: { type: 'string', enum: ['en', 'fr'], default: 'en' },
        },
      ],
      get: {
        operationId: 'getItem',
        tags: ['Inventory'],
        summary: 'Get item',
        description: 'Fetch one item',
        parameters: [
          { name: 'itemId', in: 'path', required: true, schema: { type: 'string' } },
          { $ref: '#/components/parameters/TraceId' },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ItemDetails' },
            },
            'application/xml': {
              schema: { type: 'string' },
            },
          },
        },
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/BaseItem' },
                    {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                      },
                    },
                  ],
                },
              },
            },
          },
          404: {
            description: 'Not found',
          },
        },
        security: [{ bearerAuth: [] }],
      },
    },
  },
});

describe('ImportApiContract', () => {
  let previousCwd: string;
  let tempDir: string;

  beforeEach(() => {
    previousCwd = process.cwd();
    tempDir = mkdtempSync(join(tmpdir(), 'testforge-import-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('imports OpenAPI operations into the project JSON store', async () => {
    const useCase = new ImportApiContract(new ApiServiceRepository(), new ApiOperationRepository());
    const summary = await useCase.execute({
      projectId: 'project-a',
      fileName: 'pets.json',
      content: OPENAPI_SPEC,
    });

    expect(summary.servicesImported).toBeGreaterThanOrEqual(1);
    expect(summary.operationsImported).toBeGreaterThanOrEqual(1);

    const services = await new ApiServiceRepository().findByProject('project-a');
    expect(services.length).toBeGreaterThanOrEqual(1);

    const operations = await new ApiOperationRepository().findByService(services[0].id);
    expect(operations.some((op) => op.method === 'GET' && op.path.includes('/pets'))).toBe(true);
  });

  it('preserves rich OpenAPI source data and resolved operation details', async () => {
    const useCase = new ImportApiContract(new ApiServiceRepository(), new ApiOperationRepository());
    await useCase.execute({
      projectId: 'project-rich',
      fileName: 'inventory.json',
      content: RICH_OPENAPI_SPEC,
    });

    const services = await new ApiServiceRepository().findByProject('project-rich');
    expect(services).toHaveLength(1);

    const service = services[0] as any;
    expect(service.name).toBe('Inventory');
    expect(service.description).toBe('Inventory management API');
    expect(service.tags).toContain('Inventory');
    expect(service.baseUrl).toBe('https://api.example.com/v2');
    expect(service.sourceContract.info.title).toBe('Inventory API');
    expect(service.sourceContract.paths['/items/{itemId}'].get.responses['200']).toBeDefined();

    const operations = await new ApiOperationRepository().findByProjectAndService('project-rich', service.id);
    expect(operations).toHaveLength(1);

    const operation = operations[0] as any;
    expect(operation.tags).toEqual(['Inventory']);
    expect(operation.contentTypes).toEqual(['application/json', 'application/xml']);
    expect(operation.authenticationType).toBe('Bearer Token');
    expect(operation.requestUrl).toBe('https://api.example.com/v2/items/{itemId}');
    expect(operation.sampleRequestBody).toEqual({
      id: 'string',
      kind: 'string',
      name: 'Widget',
      status: 'active',
    });
    expect(operation.requiredRequestBodyFields).toEqual(['id', 'name']);
    expect(operation.sourceOperation.parameters).toHaveLength(3);
    expect(operation.sourceOperation.parameters.map((p: any) => `${p.in}:${p.name}`)).toEqual([
      'query:locale',
      'path:itemId',
      'header:X-Trace-Id',
    ]);
    expect(operation.sourceOperation.requestBody.content['application/json'].schema.properties.status.enum).toEqual([
      'active',
      'archived',
    ]);
    expect(operation.sourceOperation.responses['200'].content['application/json'].schema.properties.kind.enum).toEqual([
      'physical',
      'digital',
    ]);
    expect(operation.sourceOperation.security).toEqual([{ bearerAuth: [] }]);
    expect(operation.sourceOperation.responseContentTypes).toEqual(['application/json']);
  });

  it('keeps separate services for identical tag names across different OpenAPI contracts', async () => {
    const specA = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Catalog API', version: '1.0.0' },
      paths: {
        '/catalog/items': {
          get: {
            tags: ['Shared'],
            operationId: 'listCatalogItems',
            responses: { 200: { description: 'OK' } },
          },
        },
      },
    });

    const specB = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Checkout API', version: '1.0.0' },
      paths: {
        '/checkout/orders': {
          get: {
            tags: ['Shared'],
            operationId: 'listCheckoutOrders',
            responses: { 200: { description: 'OK' } },
          },
        },
      },
    });

    const useCase = new ImportApiContract(new ApiServiceRepository(), new ApiOperationRepository());
    await useCase.execute({
      projectId: 'project-collisions',
      fileName: 'catalog.json',
      content: specA,
    });
    await useCase.execute({
      projectId: 'project-collisions',
      fileName: 'checkout.json',
      content: specB,
    });

    const services = await new ApiServiceRepository().findByProject('project-collisions');
    expect(services).toHaveLength(2);
    expect(services.map((s) => s.name)).toEqual(['Shared', 'Shared']);
  });

  it('stores Postman collection base URL from collection variables', async () => {
    const postmanSpec = JSON.stringify({
      info: {
        name: 'ZITADEL with Postman',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      variable: [{ key: 'issuer', value: 'https://my-instance.zitadel.cloud' }],
      item: [
        {
          name: 'Add Project',
          request: {
            method: 'POST',
            url: '{{issuer}}/management/v1/projects',
          },
        },
      ],
    });

    const useCase = new ImportApiContract(new ApiServiceRepository(), new ApiOperationRepository());
    const summary = await useCase.execute({
      projectId: 'project-a',
      fileName: 'ZITADEL_TEST.postman_collection.json',
      content: postmanSpec,
    });

    expect(summary.detectedEnvironments.length).toBeGreaterThan(0);
    const services = await new ApiServiceRepository().findByProject('project-a');
    const zitadel = services.find((s) => s.name.includes('ZITADEL'));
    expect(zitadel?.baseUrl).toBe('https://my-instance.zitadel.cloud');
  });

  it('prefers absolute Postman request URLs over misleading path-heavy variables', async () => {
    const postmanSpec = JSON.stringify({
      info: {
        name: 'Absolute request collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      variable: [{ key: 'baseUrl', value: 'https://api.example.com/uup/v1' }],
      item: [
        {
          name: 'Get Token',
          request: {
            method: 'POST',
            url: 'https://api.example.com/oauth/v1/token',
          },
        },
      ],
    });

    const useCase = new ImportApiContract(new ApiServiceRepository(), new ApiOperationRepository());
    const summary = await useCase.execute({
      projectId: 'project-absolute-request',
      fileName: 'absolute.postman_collection.json',
      content: postmanSpec,
    });

    expect(summary.detectedEnvironments.map((e) => e.name)).toContain('Request origin');
    expect(summary.detectedEnvironments.map((e) => e.name)).not.toContain('baseUrl');

    const services = await new ApiServiceRepository().findByProject('project-absolute-request');
    const imported = services.find((s) => s.name.includes('Absolute request'));
    expect(imported?.baseUrl).toBe('https://api.example.com');

    const operations = await new ApiOperationRepository().findByProjectAndService(
      'project-absolute-request',
      imported!.id,
    );
    expect(operations[0].path).toBe('/oauth/v1/token');
    expect(operations[0].requestUrl).toBe('https://api.example.com/oauth/v1/token');
  });

  it('preserves Postman folder and request order during import', async () => {
    const postmanSpec = JSON.stringify({
      info: {
        name: 'Ordered Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [
        {
          name: 'Users',
          item: [
            {
              name: 'List Users',
              request: {
                method: 'GET',
                url: 'https://api.example.com/users',
              },
            },
            {
              name: 'Create User',
              request: {
                method: 'POST',
                url: 'https://api.example.com/users',
              },
            },
          ],
        },
        {
          name: 'Projects',
          item: [
            {
              name: 'List Projects',
              request: {
                method: 'GET',
                url: 'https://api.example.com/projects',
              },
            },
          ],
        },
      ],
    });

    const useCase = new ImportApiContract(new ApiServiceRepository(), new ApiOperationRepository());
    await useCase.execute({
      projectId: 'project-order',
      fileName: 'ordered.postman_collection.json',
      content: postmanSpec,
    });

    const services = await new ApiServiceRepository().findByProject('project-order');
    expect(services.map((s) => s.name)).toEqual(['Users', 'Projects']);

    const usersService = services[0];
    const usersOperations = await new ApiOperationRepository().findByProjectAndService(
      'project-order',
      usersService.id,
    );
    expect(usersOperations.map((op) => op.name)).toEqual(['List Users', 'Create User']);
  });

  it('does not treat OAuth token_url paths as environments', async () => {
    const postmanSpec = JSON.stringify({
      info: {
        name: 'OAuth sample',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      variable: [
        { key: 'token_url', value: '/oauth/v2/token' },
        { key: 'baseUrl', value: 'https://api.example.com' },
      ],
      item: [],
    });

    const useCase = new ImportApiContract(new ApiServiceRepository(), new ApiOperationRepository());
    const summary = await useCase.execute({
      projectId: 'project-a',
      fileName: 'oauth.postman_collection.json',
      content: postmanSpec,
    });

    const names = summary.detectedEnvironments.map((e) => e.name);
    expect(names).not.toContain('token_url');
    expect(names).toContain('baseUrl');
  });

  it('re-importing the same OpenAPI spec updates operations instead of skipping duplicates', async () => {
    const useCase = new ImportApiContract(new ApiServiceRepository(), new ApiOperationRepository());
    const projectId = 'project-a';

    const first = await useCase.execute({
      projectId,
      fileName: 'pets.json',
      content: OPENAPI_SPEC,
    });
    expect(first.operationsImported).toBeGreaterThanOrEqual(1);

    const updatedSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Pet Store', version: '2.0.0' },
      paths: {
        '/pets': {
          get: { operationId: 'listPets', summary: 'List all pets (updated)' },
        },
      },
    });

    const second = await useCase.execute({
      projectId,
      fileName: 'pets.json',
      content: updatedSpec,
    });

    expect(second.servicesImported).toBe(0);
    expect(second.servicesUpdated).toBeGreaterThanOrEqual(1);
    expect(second.operationsUpdated).toBeGreaterThanOrEqual(1);
    expect(second.duplicatesSkipped).toBe(0);

    const services = await new ApiServiceRepository().findByProject(projectId);
    const petStore = services.find((s) => s.name === 'Pet Store');
    expect(petStore?.version).toBe('2.0.0');

    const operations = await new ApiOperationRepository().findByProjectAndService(
      projectId,
      petStore!.id,
    );
    expect(operations).toHaveLength(1);
    expect(operations[0].description).toContain('updated');
  });

  it('imports OpenAPI JSON with a UTF-8 BOM', async () => {
    const useCase = new ImportApiContract(new ApiServiceRepository(), new ApiOperationRepository());
    const summary = await useCase.execute({
      projectId: 'project-bom',
      fileName: 'pets.json',
      content: `\uFEFF${OPENAPI_SPEC}`,
    });

    expect(summary.servicesImported).toBeGreaterThanOrEqual(1);
    expect(summary.operationsImported).toBeGreaterThanOrEqual(1);
    expect(summary.warnings).toEqual([]);
  });

  it('returns no imports and parse warnings for invalid JSON', async () => {
    const useCase = new ImportApiContract(new ApiServiceRepository(), new ApiOperationRepository());
    const summary = await useCase.execute({
      projectId: 'project-bad',
      fileName: 'broken.json',
      content: '{ "openapi": "3.0.0", broken',
    });

    expect(summary.servicesImported).toBe(0);
    expect(summary.operationsImported).toBe(0);
    expect(summary.warnings.some((w) => w.includes('Failed to parse file'))).toBe(true);
  });
});
