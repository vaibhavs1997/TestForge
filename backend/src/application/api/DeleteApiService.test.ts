import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DeleteApiService } from './DeleteApiService.js';
import { CreateApiService } from './CreateApiService.js';
import { CreateApiOperation } from './CreateApiOperation.js';
import { ApiServiceRepository } from '../../infrastructure/api/ApiServiceRepository.js';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository.js';

describe('DeleteApiService', () => {
  let previousCwd: string;
  let tempDir: string;

  beforeEach(() => {
    previousCwd = process.cwd();
    tempDir = mkdtempSync(join(tmpdir(), 'testforge-delete-svc-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('removes service and cascaded operations for the project', async () => {
    const serviceRepo = new ApiServiceRepository();
    const opRepo = new ApiOperationRepository();
    const createService = new CreateApiService(serviceRepo);
    const createOp = new CreateApiOperation(opRepo, serviceRepo);
    const deleteService = new DeleteApiService(serviceRepo, opRepo);

    const service = await createService.execute({
      projectId: 'p1',
      name: 'Orders API',
      description: '',
      version: '1',
      tags: [],
    });

    await createOp.execute({
      projectId: 'p1',
      serviceId: service.id,
      name: 'list',
      method: 'GET',
      path: '/orders',
      description: '',
      authenticationType: 'None',
      status: 'active',
    });

    await deleteService.execute('p1', service.id);

    const services = await serviceRepo.findByProject('p1');
    expect(services.find((s) => s.id === service.id)).toBeUndefined();
    const ops = await opRepo.findByService(service.id);
    expect(ops).toHaveLength(0);
  });
});
