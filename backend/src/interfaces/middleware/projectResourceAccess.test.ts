import { describe, it, expect, vi } from 'vitest';
import { createProjectResourceAuthorizer } from './projectResourceAccess.js';

function setup() {
  const findById = vi.fn(async (id: string) => id === 'missing' ? null : id === 'foreign-column' ? {datasetId:'foreign'} : {projectId: id === 'foreign' ? 'other' : 'mine'});
  const c = new Proxy({}, {get: () => ({findById, metadata:findById})});
  const authorize = createProjectResourceAuthorizer(c as any);
  const request = (params: any = {}, body: any = {}, query: any = {}) => ({ route: {}, originalUrl:'/api/projects/mine/requirements', params:{projectId:'mine',...params}, body, query } as any);
  return {authorize, request};
}
describe('project resource references', () => {
  it.each(['requirementId','testDesignId','executionPlanId','runId','reportId','datasetId','suiteId','analysisId','executionProfileId','providerId'])('rejects a foreign %s even under an authorized project URL', async key => {
    const {authorize,request} = setup();
    await expect(authorize(request({[key]:'foreign'}))).rejects.toThrow('not found in this project');
  });
  it('rejects foreign request-body references, nested suite plans, and query datasets', async () => {
    const {authorize,request} = setup();
    await expect(authorize(request({}, {executionPlans:[{executionPlanId:'foreign'}]}))).rejects.toThrow();
    await expect(authorize(request({}, {providerId:'foreign'}))).rejects.toThrow();
    await expect(authorize(request({}, {}, {datasetId:'foreign'}))).rejects.toThrow();
    await expect(authorize(request({columnId:'foreign-column'}))).rejects.toThrow();
  });
  it('allows owned references without treating API payload IDs as control-plane IDs', async () => {
    const {authorize,request} = setup();
    await expect(authorize(request({requirementId:'owned'}, {operationId:'owned', body:{projectId:'payload-project',datasetId:'payload-id'}}))).resolves.toBeUndefined();
  });
});
