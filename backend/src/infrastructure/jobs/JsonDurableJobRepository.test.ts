import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonDurableJobRepository, newJob } from './JsonDurableJobRepository.js';

describe('JsonDurableJobRepository runtime semantics', () => {
  let cwd = ''; let dir = '';
  beforeEach(() => { cwd = process.cwd(); dir = mkdtempSync(join(tmpdir(), 'tf-job-')); process.chdir(dir); });
  afterEach(() => { process.chdir(cwd); rmSync(dir, { recursive: true, force: true }); });
  const create = () => newJob({ projectId: 'p', jobType: 'SUITE_EXECUTION', payload: {}, createdBy: 'x', maxAttempts: 2, idempotencyKey: 'same' });
  it('suppresses duplicate occurrences and excludes concurrent claims', async () => { const r = new JsonDurableJobRepository(); const j = await r.enqueue(create()); expect((await r.enqueue(create())).jobId).toBe(j.jobId); const claims = await Promise.all([r.claim('a', 1000), r.claim('b', 1000)]); expect(claims.filter(Boolean)).toHaveLength(1); });
  it('renews and recovers expired leases', async () => { const r = new JsonDurableJobRepository(); const j = await r.enqueue(create()); await r.claim('a', 1); await r.renewLease(j.jobId, 'a', 1000); expect(await r.claim('b', 1)).toBeNull(); await r.renewLease(j.jobId, 'a', 1); await new Promise((resolve) => setTimeout(resolve, 5)); expect(await r.claim('b', 1000)).not.toBeNull(); });
  it('retries then succeeds or exhausts', async () => { const r = new JsonDurableJobRepository(); const j = await r.enqueue(create()); await r.claim('a', 1); await r.fail(j.jobId, 'a', { token: 'secret' }); expect((await r.findById(j.jobId))?.status).toBe('QUEUED'); const claimed = await r.claim('b', 1); if (!claimed) throw new Error('Expected retry to be claimed'); await r.acknowledge(claimed.jobId, 'b'); expect((await r.findById(j.jobId))?.status).toBe('SUCCEEDED'); const x = await r.enqueue(newJob({ ...create(), idempotencyKey: 'x' })); await r.claim('a', 1); await r.fail(x.jobId, 'a', {}); await r.claim('a', 1); await r.fail(x.jobId, 'a', {}); expect((await r.findById(x.jobId))?.status).toBe('FAILED'); });
  it('cancels queued and running jobs and never reclaims them', async () => { const r = new JsonDurableJobRepository(); const q = await r.enqueue(create()); await r.cancel(q.jobId); expect(await r.claim('a', 1)).toBeNull(); const running = await r.enqueue(newJob({ ...create(), idempotencyKey: 'running' })); await r.claim('a', 1); await r.cancel(running.jobId); expect((await r.findById(running.jobId))?.status).toBe('CANCELLED'); expect(await r.claim('b', 1)).toBeNull(); });
  it('persists the execution-run link before acknowledgement', async () => { const r = new JsonDurableJobRepository(); const j = await r.enqueue(create()); await r.claim('a', 1000); await r.updatePayload(j.jobId, 'a', { executionRunId: 'run-1' }); expect((await r.findById(j.jobId))?.payload.executionRunId).toBe('run-1'); });
  it('sanitizes persisted failures', async () => { const r = new JsonDurableJobRepository(); const j = await r.enqueue(create()); await r.claim('a', 1); await r.fail(j.jobId, 'a', { nested: { authorization: 'Bearer secret' } }); expect((await r.findById(j.jobId))?.error).toEqual({ nested: { authorization: '[REDACTED]' } }); });
});
