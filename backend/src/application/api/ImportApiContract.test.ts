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
});
