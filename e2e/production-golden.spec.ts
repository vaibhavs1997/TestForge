import { expect, test } from '@playwright/test';
import jwt from 'jsonwebtoken';
import { readFile } from 'node:fs/promises';

const api = 'http://127.0.0.1:3100/api';
const secret = 'e2e-only-jwt-secret-not-for-production';
const token = (projects: string[] | '*') => jwt.sign({ sub: 'e2e-user', projects }, secret, { expiresIn: '5m' });
const headers = (projects: string[] | '*') => ({ Authorization: `Bearer ${token(projects)}` });
const unwrap = async (response: any) => {
  expect(response.ok(), `${response.status()} ${await response.text()}`).toBeTruthy();
  const body = await response.json(); return body.data;
};

async function createExecutableFixture(request: any, options: { name: string; path: string; environment?: Record<string, unknown>; confirmMappings?: boolean }) {
  const project = await unwrap(await request.post(`${api}/projects`, { headers: headers('*'), data: { name: options.name, projectKey: `${options.name}-${Date.now()}` } }));
  const projectId = project.id;
  const contract = JSON.stringify({ openapi: '3.0.0', info: { title: options.name, version: '1' }, servers: [{ url: 'http://127.0.0.1:3102' }], paths: { [options.path]: { get: { operationId: `${options.name}-operation`, responses: { '200': { description: 'ok' } } } }, '/confirmed': { get: { operationId: `${options.name}-confirmed`, responses: { '200': { description: 'ok' } } } } } });
  await unwrap(await request.post(`${api}/projects/${projectId}/import`, { headers: { ...headers('*'), 'content-type': 'multipart/form-data; boundary=e2e' }, data: `--e2e\r\nContent-Disposition: form-data; name="file"; filename="fixture.json"\r\nContent-Type: application/json\r\n\r\n${contract}\r\n--e2e--\r\n` }));
  const environment = await unwrap(await request.post(`${api}/projects/${projectId}/environments`, { headers: headers('*'), data: { name: 'fixture', baseUrl: 'http://127.0.0.1:3102', variables: {}, ...options.environment } }));
  const requirement = await unwrap(await request.post(`${api}/projects/${projectId}/requirements`, { headers: headers('*'), data: { title: `${options.name} requirement`, description: 'AC: verify fixture', category: 'Functional', confidence: 1, source: 'manual', approvalStatus: 'APPROVED', acceptanceCriteria: ['verify fixture'] } }));
  await unwrap(await request.post(`${api}/projects/${projectId}/requirements/${requirement.id}/strategy`, { headers: headers('*') }));
  const designs = await unwrap(await request.post(`${api}/projects/${projectId}/requirements/${requirement.id}/designs`, { headers: headers('*') }));
  const services = await unwrap(await request.get(`${api}/projects/${projectId}/services`, { headers: headers('*') }));
  const operations = await unwrap(await request.get(`${api}/projects/${projectId}/services/${services[0].id}/apis`, { headers: headers('*') }));
  if (options.confirmMappings !== false) for (const design of designs) {
    // Switch through a second valid operation so the public update flow records
    // explicit user confirmation even when the matcher selected operation[0].
    await unwrap(await request.patch(`${api}/projects/${projectId}/test-designs/${design.id}`, { headers: headers('*'), data: { status: 'Ready', operationId: operations[1].id, rebuildPayload: true } }));
    await unwrap(await request.patch(`${api}/projects/${projectId}/test-designs/${design.id}`, { headers: headers('*'), data: { status: 'Ready', operationId: operations[0].id, rebuildPayload: true } }));
  }
  const plans = await unwrap(await request.post(`${api}/projects/${projectId}/requirements/${requirement.id}/execution-plans`, { headers: headers('*') }));
  for (const plan of plans) await unwrap(await request.patch(`${api}/projects/${projectId}/execution-plans/${plan.id}`, { headers: headers('*'), data: { status: 'Ready' } }));
  return { projectId, environment, requirement, designs, plans, operation: operations[0], operations };
}

async function createProfile(request: any, projectId: string, environmentId: string, retries = 0) {
  return unwrap(await request.post(`${api}/projects/${projectId}/execution-profiles`, { headers: headers('*'), data: { name: `profile-${Date.now()}`, description: '', defaultEnvironmentId: environmentId, failureMode: 'ContinueOnFailure', retryPolicy: { enabled: retries > 0, maxRetries: retries, retryDelay: 1 }, timeout: 10_000, parallelism: { enabled: false, maxConcurrent: 1 }, assertionMode: 'all', runtimeVariableReset: true, datasetSelectionStrategy: 'first', tags: [], enabled: true, isDefault: true } }));
}

test('production preview loads and routes its API requests through the built-artifact proxy', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  const health = await page.request.get('/api/auth/config');
  expect(health.ok()).toBeTruthy();
});

test('golden API workflow uses authenticated public flows and retains safety decisions', async ({ request }) => {
  const suffix = `e2e-${Date.now()}`;
  const project = await unwrap(await request.post(`${api}/projects`, { headers: headers('*'), data: { name: `Golden ${suffix}`, projectKey: suffix, description: 'deterministic production-artifact fixture' } }));
  const projectId = project.id;
  const contract = JSON.stringify({ openapi: '3.0.0', info: { title: 'Fixture API', version: '1' }, servers: [{ url: 'http://127.0.0.1:3102' }], paths: { '/widgets': { get: { operationId: 'listWidgets', responses: { '200': { description: 'ok' } } } } } });
  await unwrap(await request.post(`${api}/projects/${projectId}/import`, { headers: { ...headers('*'), 'content-type': 'multipart/form-data; boundary=e2e' }, data: `--e2e\r\nContent-Disposition: form-data; name="file"; filename="fixture.json"\r\nContent-Type: application/json\r\n\r\n${contract}\r\n--e2e--\r\n` }));
  const environment = await unwrap(await request.post(`${api}/projects/${projectId}/environments`, { headers: headers('*'), data: { name: 'fixture', baseUrl: 'http://127.0.0.1:3102', variables: { apiToken: 'e2e-secret-value' } } }));
  expect(JSON.stringify(environment)).not.toContain('e2e-secret-value');
  const requirement = await unwrap(await request.post(`${api}/projects/${projectId}/requirements`, { headers: headers('*'), data: { title: 'List widgets', description: 'AC: list returns 200', category: 'Functional', confidence: 1, source: 'manual', approvalStatus: 'APPROVED', acceptanceCriteria: ['list returns 200'] } }));
  await unwrap(await request.post(`${api}/projects/${projectId}/requirements/${requirement.id}/strategy`, { headers: headers('*') }));
  const designs = await unwrap(await request.post(`${api}/projects/${projectId}/requirements/${requirement.id}/designs`, { headers: headers('*') }));
  expect(Array.isArray(designs)).toBeTruthy();
  const services = await unwrap(await request.get(`${api}/projects/${projectId}/services`, { headers: headers('*') }));
  const operations = await unwrap(await request.get(`${api}/projects/${projectId}/services/${services[0].id}/apis`, { headers: headers('*') }));
  for (const design of designs) {
    await unwrap(await request.patch(`${api}/projects/${projectId}/test-designs/${design.id}`, { headers: headers('*'), data: { status: 'Ready', operationId: operations[0].id, rebuildPayload: true } }));
  }
  const plans = await unwrap(await request.post(`${api}/projects/${projectId}/requirements/${requirement.id}/execution-plans`, { headers: headers('*') }));
  for (const plan of plans) {
    await unwrap(await request.patch(`${api}/projects/${projectId}/execution-plans/${plan.id}`, { headers: headers('*'), data: { status: 'Ready' } }));
  }
  const readyPlans = await unwrap(await request.get(`${api}/projects/${projectId}/requirements/${requirement.id}/execution-plans`, { headers: headers('*') }));
  expect(readyPlans.every((plan: any) => plan.status === 'Ready')).toBeTruthy();
  const suite = await unwrap(await request.post(`${api}/projects/${projectId}/suites`, { headers: headers('*'), data: { name: 'Golden suite', executionPlans: readyPlans.map((item: any, index: number) => ({ executionPlanId: item.id, order: index + 1 })), defaultEnvironmentId: environment.id, status: 'Active' } }));
  const run = await unwrap(await request.post(`${api}/projects/${projectId}/suites/${suite.id}/execute`, { headers: headers('*'), data: { failureMode: 'ContinueOnFailure' } }));
  const report = await unwrap(await request.post(`${api}/projects/${projectId}/reports/generate/${run.id}`, { headers: headers('*') }));
  expect(JSON.stringify(report)).not.toContain('e2e-secret-value');
});

test('authorization and execution safety remain enforced in production artifacts', async ({ request }) => {
  const project = await unwrap(await request.post(`${api}/projects`, { headers: headers('*'), data: { name: `Isolated ${Date.now()}`, projectKey: `i${Date.now()}` } }));
  const forbidden = await request.get(`${api}/projects/${project.id}/environments`, { headers: headers([]) });
  expect(forbidden.status()).toBe(403);
  const unsafe = await request.post(`${api}/projects/${project.id}/api-execution`, { headers: headers('*'), data: { requestUrl: 'http://169.254.169.254/latest/meta-data', method: 'GET' } });
  expect(unsafe.ok()).toBeTruthy();
  expect((await unsafe.json()).data.ok).toBe(false);
});

test('safe contract re-import preserves the operation and marks it review-required', async ({ request }) => {
  const suffix = `reimport-${Date.now()}`;
  const project = await unwrap(await request.post(`${api}/projects`, { headers: headers('*'), data: { name: suffix, projectKey: suffix } }));
  const projectId = project.id;
  const upload = async (contract: object) => unwrap(await request.post(`${api}/projects/${projectId}/import`, {
    headers: { ...headers('*'), 'content-type': 'multipart/form-data; boundary=e2e' },
    data: `--e2e\r\nContent-Disposition: form-data; name="file"; filename="contract.json"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(contract)}\r\n--e2e--\r\n`,
  }));
  const base = { openapi: '3.0.0', info: { title: 'Reimport fixture', version: '1' } };
  await upload({ ...base, paths: { '/orders': { get: { operationId: 'listOrders', responses: { '200': { description: 'ok' } } } } } });
  const services = await unwrap(await request.get(`${api}/projects/${projectId}/services`, { headers: headers('*') }));
  const [before] = await unwrap(await request.get(`${api}/projects/${projectId}/services/${services[0].id}/apis`, { headers: headers('*') }));
  const result = await upload({ ...base, paths: {} });
  expect(result.changes).toEqual(expect.arrayContaining([expect.objectContaining({ operationId: before.id, status: 'REMOVED', reviewRequired: true })]));
  const after = await unwrap(await request.get(`${api}/projects/${projectId}/services/${services[0].id}/apis`, { headers: headers('*') }));
  expect(after).toEqual(expect.arrayContaining([expect.objectContaining({ id: before.id, status: 'Review Required' })]));
});

test('low-confidence endpoint mapping is blocked until a user confirms it', async ({ request }) => {
  const fixture = await createExecutableFixture(request, { name: `mapping-${Date.now()}`, path: '/widgets', confirmMappings: false, environment: { tier: 'DEVELOPMENT', executionPolicy: { mappingConfidenceThreshold: 100 } } });
  const blocked = await request.post(`${api}/projects/${fixture.projectId}/executions/${fixture.plans[0].id}/start`, { headers: headers('*'), data: {} });
  expect(blocked.status()).toBe(400);
  expect(await blocked.text()).toContain('endpoint mapping is unresolved or below');
  for (const design of fixture.designs) await unwrap(await request.patch(`${api}/projects/${fixture.projectId}/test-designs/${design.id}`, { headers: headers('*'), data: { status: 'Ready', operationId: fixture.operations[1].id, rebuildPayload: true } }));
  const regenerated = await unwrap(await request.post(`${api}/projects/${fixture.projectId}/requirements/${fixture.requirement.id}/execution-plans`, { headers: headers('*') }));
  const permitted = await request.post(`${api}/projects/${fixture.projectId}/executions/${regenerated[0].id}/start`, { headers: headers('*'), data: {} });
  expect(permitted.status()).toBe(201);
});

test('a 2xx retry still fails when its assertions fail', async ({ request }) => {
  const fixture = await createExecutableFixture(request, { name: `retry-${Date.now()}`, path: '/retry-assert', environment: { tier: 'DEVELOPMENT', executionPolicy: { outboundEgressPolicy: { allowLoopback: true, allowPrivateNetworks: true, allowedHosts: ['127.0.0.1'], allowedPorts: [3102] } } } });
  const profile = await createProfile(request, fixture.projectId, fixture.environment.id, 1);
  const run = await unwrap(await request.post(`${api}/projects/${fixture.projectId}/executions/${fixture.plans[0].id}/start`, { headers: headers('*'), data: { executionProfileId: profile.id } }));
  expect(run.stepResults[0].status).toBe('Failed');
  expect(run.stepResults[0].attempts).toHaveLength(2);
  expect(run.stepResults[0].attempts[1].statusCode).toBe(200);
});

test('scheduled execution applies the same default egress block and explicit fixture allowlist', async ({ request }) => {
  const scheduleRun = async (fixture: any) => {
    const profile = await createProfile(request, fixture.projectId, fixture.environment.id);
    const suite = await unwrap(await request.post(`${api}/projects/${fixture.projectId}/suites`, { headers: headers('*'), data: { name: `suite-${Date.now()}`, executionPlans: fixture.plans.map((plan: any, index: number) => ({ executionPlanId: plan.id, order: index + 1 })), defaultEnvironmentId: fixture.environment.id, status: 'Active' } }));
    const schedule = await unwrap(await request.post(`${api}/projects/${fixture.projectId}/schedules`, { headers: headers('*'), data: { name: `schedule-${Date.now()}`, description: '', suiteId: suite.id, executionProfileId: profile.id, environmentId: fixture.environment.id, cronExpression: '* * * * *', timezone: 'UTC', enabled: false } }));
    await unwrap(await request.post(`${api}/projects/${fixture.projectId}/schedules/${schedule.id}/run`, { headers: headers('*') }));
    return schedule;
  };
  const blocked = await createExecutableFixture(request, { name: `scheduled-block-${Date.now()}`, path: '/widgets' });
  const blockedSchedule = await scheduleRun(blocked);
  await expect.poll(async () => (JSON.parse(await readFile('backend/data/runtime/jobs.json', 'utf8')).find((job: any) => job.payload.scheduleId === blockedSchedule.id) || {}).status, { timeout: 8_000 }).toBe('SUCCEEDED');
  const blockedJob = JSON.parse(await readFile('backend/data/runtime/jobs.json', 'utf8')).find((job: any) => job.payload.scheduleId === blockedSchedule.id);
  const blockedRun = await unwrap(await request.get(`${api}/projects/${blocked.projectId}/executions/${blockedJob.payload.executionRunId}`, { headers: headers('*') }));
  expect(blockedRun.stepResults[0].error).toContain('network safety policy');
  const allowed = await createExecutableFixture(request, { name: `scheduled-allow-${Date.now()}`, path: '/widgets', environment: { tier: 'DEVELOPMENT', executionPolicy: { outboundEgressPolicy: { allowLoopback: true, allowPrivateNetworks: true, allowedHosts: ['127.0.0.1'], allowedPorts: [3102] } } } });
  const allowedSchedule = await scheduleRun(allowed);
  await expect.poll(async () => (JSON.parse(await readFile('backend/data/runtime/jobs.json', 'utf8')).find((job: any) => job.payload.scheduleId === allowedSchedule.id) || {}).status, { timeout: 8_000 }).toBe('SUCCEEDED');
});

test('scheduled durable execution cancels an active slow run without executing remaining steps', async ({ request }) => {
  const suffix = `cancel-${Date.now()}`;
  const project = await unwrap(await request.post(`${api}/projects`, { headers: headers('*'), data: { name: suffix, projectKey: suffix } }));
  const projectId = project.id;
  const contract = JSON.stringify({ openapi: '3.0.0', info: { title: 'Slow fixture', version: '1' }, servers: [{ url: 'http://127.0.0.1:3102' }], paths: { '/slow': { get: { operationId: 'slow', responses: { '200': { description: 'ok' } } } } } });
  await unwrap(await request.post(`${api}/projects/${projectId}/import`, { headers: { ...headers('*'), 'content-type': 'multipart/form-data; boundary=e2e' }, data: `--e2e\r\nContent-Disposition: form-data; name="file"; filename="slow.json"\r\nContent-Type: application/json\r\n\r\n${contract}\r\n--e2e--\r\n` }));
  const environment = await unwrap(await request.post(`${api}/projects/${projectId}/environments`, { headers: headers('*'), data: { name: 'slow', baseUrl: 'http://127.0.0.1:3102', variables: {}, tier: 'DEVELOPMENT', executionPolicy: { outboundEgressPolicy: { allowLoopback: true, allowPrivateNetworks: true, allowedHosts: ['127.0.0.1'], allowedPorts: [3102] } } } }));
  const requirement = await unwrap(await request.post(`${api}/projects/${projectId}/requirements`, { headers: headers('*'), data: { title: 'Slow cancellation', description: 'AC: cancellation', category: 'Functional', confidence: 1, source: 'manual', approvalStatus: 'APPROVED', acceptanceCriteria: ['cancel slow request'] } }));
  await unwrap(await request.post(`${api}/projects/${projectId}/requirements/${requirement.id}/strategy`, { headers: headers('*') }));
  const designs = await unwrap(await request.post(`${api}/projects/${projectId}/requirements/${requirement.id}/designs`, { headers: headers('*') }));
  const services = await unwrap(await request.get(`${api}/projects/${projectId}/services`, { headers: headers('*') }));
  const operations = await unwrap(await request.get(`${api}/projects/${projectId}/services/${services[0].id}/apis`, { headers: headers('*') }));
  for (const design of designs) await unwrap(await request.patch(`${api}/projects/${projectId}/test-designs/${design.id}`, { headers: headers('*'), data: { status: 'Ready', operationId: operations[0].id, rebuildPayload: true } }));
  const plans = await unwrap(await request.post(`${api}/projects/${projectId}/requirements/${requirement.id}/execution-plans`, { headers: headers('*') }));
  for (const plan of plans) await unwrap(await request.patch(`${api}/projects/${projectId}/execution-plans/${plan.id}`, { headers: headers('*'), data: { status: 'Ready' } }));
  const suite = await unwrap(await request.post(`${api}/projects/${projectId}/suites`, { headers: headers('*'), data: { name: 'Slow suite', executionPlans: plans.map((plan: any, index: number) => ({ executionPlanId: plan.id, order: index + 1 })), defaultEnvironmentId: environment.id, status: 'Active' } }));
  const profile = await unwrap(await request.post(`${api}/projects/${projectId}/execution-profiles`, { headers: headers('*'), data: { name: 'slow profile', description: '', defaultEnvironmentId: environment.id, failureMode: 'ContinueOnFailure', retryPolicy: { enabled: false, maxRetries: 0, retryDelay: 0 }, timeout: 10_000, parallelism: { enabled: false, maxConcurrent: 1 }, assertionMode: 'all', runtimeVariableReset: true, datasetSelectionStrategy: 'first', tags: [], enabled: true, isDefault: true } }));
  const schedule = await unwrap(await request.post(`${api}/projects/${projectId}/schedules`, { headers: headers('*'), data: { name: 'Slow schedule', description: '', suiteId: suite.id, executionProfileId: profile.id, environmentId: environment.id, cronExpression: '* * * * *', timezone: 'UTC', enabled: false } }));
  await unwrap(await request.post(`${api}/projects/${projectId}/schedules/${schedule.id}/run`, { headers: headers('*') }));
  await expect.poll(async () => (await (await request.get('http://127.0.0.1:3102/__fixture/state')).json()).slowStarted, { timeout: 8_000 }).toBeGreaterThan(0);
  const run = await expect.poll(async () => { const runs = await unwrap(await request.get(`${api}/projects/${projectId}/executions`, { headers: headers('*') })); return runs.find((item: any) => item.status === 'Running') || null; }, { timeout: 8_000 }).not.toBeNull();
  const activeRun = (await unwrap(await request.get(`${api}/projects/${projectId}/executions`, { headers: headers('*') }))).find((item: any) => item.status === 'Running');
  await unwrap(await request.post(`${api}/projects/${projectId}/executions/${activeRun.id}/cancel`, { headers: headers('*') }));
  await expect.poll(async () => (await unwrap(await request.get(`${api}/projects/${projectId}/executions/${activeRun.id}`, { headers: headers('*') }))).status).toBe('Cancelled');
  await new Promise(resolve => setTimeout(resolve, 2_200));
  const finalRun = await unwrap(await request.get(`${api}/projects/${projectId}/executions/${activeRun.id}`, { headers: headers('*') }));
  expect(finalRun.status).toBe('Cancelled');
  const state = await (await request.get('http://127.0.0.1:3102/__fixture/state')).json();
  // The in-flight response may finish at the fixture after its client has
  // been aborted. Exactly one completion proves no subsequent suite step was
  // dispatched, while the run must remain cancellation-dominant.
  expect(state.slowStarted).toBe(1);
  expect(state.completedRequests).toBe(1);
  const jobs = JSON.parse(await readFile('backend/data/runtime/jobs.json', 'utf8'));
  expect(jobs).toEqual(expect.arrayContaining([expect.objectContaining({ projectId, status: 'CANCELLED', payload: expect.objectContaining({ executionRunId: activeRun.id }) })]));
  expect(finalRun.stepResults.length).toBeLessThan(plans.length);
});
