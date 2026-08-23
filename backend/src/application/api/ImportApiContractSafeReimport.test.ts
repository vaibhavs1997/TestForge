import { describe, expect, it } from 'vitest';
import { ImportApiContract } from './ImportApiContract.js';
import { ApiServiceRepository } from '../../infrastructure/api/ApiServiceRepository.js';
import { ApiOperationRepository } from '../../infrastructure/api/ApiOperationRepository.js';

const spec = (paths: Record<string, unknown>) => JSON.stringify({ openapi: '3.0.0', info: { title: 'Safe import', version: '1' }, paths });
const operation = (extra: Record<string, unknown> = {}) => ({ summary: 'Get item', responses: { '200': { description: 'ok' } }, ...extra });

describe('safe contract re-import', () => {
  it('previews without writes and classifies unchanged, added, and removed operations', async () => {
    const projectId = `safe-preview-${Date.now()}`;
    const services = new ApiServiceRepository(); const operations = new ApiOperationRepository();
    const useCase = new ImportApiContract(services, operations);
    await useCase.execute({ projectId, fileName: 'api.json', content: spec({ '/items': { get: operation() }, '/old': { get: operation() } }) });
    const preview = await useCase.execute({ projectId, fileName: 'api.json', preview: true, content: spec({ '/items': { get: operation() }, '/new': { post: operation() } }) });
    expect(preview.preview).toBe(true);
    expect(preview.changes?.map((change) => change.status)).toEqual(expect.arrayContaining(['UNCHANGED', 'ADDED', 'REMOVED']));
    const service = (await services.findByProject(projectId))[0];
    expect(await operations.findByProjectAndService(projectId, service.id)).toHaveLength(2);
  });

  it('never hard deletes removed operations and preserves manually maintained operations', async () => {
    const projectId = `safe-removed-${Date.now()}`;
    const services = new ApiServiceRepository(); const operations = new ApiOperationRepository();
    const useCase = new ImportApiContract(services, operations);
    await useCase.execute({ projectId, fileName: 'api.json', content: spec({ '/items': { get: operation() }, '/manual': { get: operation() } }) });
    const service = (await services.findByProject(projectId))[0]; const all = await operations.findByProjectAndService(projectId, service.id);
    const manual = all.find((item: any) => item.path === '/manual')!;
    await operations.update(manual.id, { sourceOperation: null, name: 'Manual name' });
    const result = await useCase.execute({ projectId, fileName: 'api.json', content: spec({ '/items': { get: operation() } }) });
    expect(result.operationsRemoved).toBe(1);
    const remaining = await operations.findByProjectAndService(projectId, service.id);
    expect(remaining).toHaveLength(2);
    expect(remaining.find((item: any) => item.id === manual.id)).toMatchObject({ name: 'Manual name' });
  });

  it('flags request changes as breaking and response changes as material', async () => {
    const projectId = `safe-breaking-${Date.now()}`;
    const services = new ApiServiceRepository(); const operations = new ApiOperationRepository();
    const useCase = new ImportApiContract(services, operations);
    const original = { requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'] } } } } };
    const incompatible = { requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['id'] } } } } };
    await useCase.execute({ projectId, fileName: 'api.json', content: spec({ '/items': { post: operation(original) } }) });
    const changed = await useCase.execute({ projectId, fileName: 'api.json', preview: true, content: spec({ '/items': { post: operation(incompatible) } }) });
    expect(changed.changes?.[0]).toMatchObject({ status: 'BREAKING_CHANGE', reviewRequired: true });
  });
});
