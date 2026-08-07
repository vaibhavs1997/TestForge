import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ImportApiContract } from '../../application/api/ImportApiContract';
import { ApiServiceRepository } from '../../infrastructure/api/ApiServiceRepository';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository';

const OPENAPI_SPEC = JSON.stringify({
  openapi: '3.0.0',
  info: { title: 'Pet Store', version: '1.0.0' },
  paths: {
    '/pets': {
      get: { operationId: 'listPets', summary: 'List pets' },
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
