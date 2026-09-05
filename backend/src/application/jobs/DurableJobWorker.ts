import { randomUUID } from 'node:crypto';
import type { DurableJobRepository } from '../../domain/jobs/DurableJob.js';
import { ExecuteSuite } from '../suite/ExecuteSuite.js';
import { logger } from '../../infrastructure/logging/Logger.js';
import { metrics } from '../../infrastructure/metrics/Metrics.js';

export class DurableJobWorker {
  private timer: NodeJS.Timeout | null = null;
  private stopping = false;
  private active = 0;
  private readonly pending = new Set<Promise<void>>();
  readonly workerId = randomUUID();

  constructor(private readonly jobs: DurableJobRepository, private readonly executeSuite: ExecuteSuite,
    private readonly concurrency = 1, private readonly leaseMs = 30000) {
    if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('Worker concurrency must be a positive integer');
  }

  start(interval = 250): void {
    if (this.timer) return;
    this.stopping = false;
    const poll = () => void this.tick().catch(error => logger.error('Durable worker polling failed', { error }));
    this.timer = setInterval(poll, interval);
    poll();
  }

  async stop(): Promise<void> {
    this.stopping = true;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    await Promise.allSettled([...this.pending]);
  }

  async tick(): Promise<void> {
    if (this.stopping) return;
    metrics.setGauge('durable_worker_active_jobs', this.active);
    await Promise.all(Array.from({ length: this.concurrency }, () => this.workOnce()));
  }

  async workOnce(): Promise<void> {
    if (this.stopping || this.active >= this.concurrency) return;
    // Reserve the slot before awaiting claim: ticks may overlap during disk IO.
    this.active++;
    const work = this.processJob();
    this.pending.add(work);
    try { await work; } finally { this.active--; this.pending.delete(work); }
  }

  private async processJob(): Promise<void> {
    const job = await this.jobs.claim(this.workerId, this.leaseMs, ['SUITE_EXECUTION']);
    if (!job) return;
    metrics.increment('durable_jobs_running_total');
    const started = Date.now();
    let leaseLost = false;
    const renew = setInterval(() => {
      void this.jobs.renewLease(job.jobId, this.workerId, this.leaseMs).then(lease => {
        if (!lease) leaseLost = true;
      }).catch(error => {
        leaseLost = true;
        logger.error('Durable job lease renewal failed', { jobId: job.jobId, error });
      });
    }, Math.max(1000, this.leaseMs / 2));
    try {
      const payload = job.payload as any;
      if ((await this.jobs.findById(job.jobId))?.status === 'CANCELLED') return;
      let linked = false;
      const run = await this.executeSuite.execute(payload.suiteId, undefined, payload.executionProfileId || undefined,
        payload.environmentId || undefined, async created => {
          if (leaseLost) throw new Error('Execution job lease was lost');
          linked = true;
          await this.jobs.updatePayload(job.jobId, this.workerId, { ...payload, executionRunId: created.id });
          if ((await this.jobs.findById(job.jobId))?.status === 'CANCELLED') throw new Error('Execution cancelled');
        }, payload.executionRunId);
      if (leaseLost) return;
      if (!linked && !payload.executionRunId) await this.jobs.updatePayload(job.jobId, this.workerId, { ...payload, executionRunId: run.id });
      if ((await this.jobs.findById(job.jobId))?.status === 'CANCELLED' || run.status === 'Cancelled') {
        await this.jobs.cancel(job.jobId); return;
      }
      if (run.status !== 'Completed' || (run.summary && (run.summary.failed > 0 || run.summary.blocked > 0 || run.summary.skipped > 0 || run.summary.totalSteps === 0))) {
        await this.jobs.fail(job.jobId, this.workerId, { message: 'Linked execution run did not complete successfully' }); return;
      }
      await this.jobs.acknowledge(job.jobId, this.workerId);
      metrics.increment('durable_jobs_succeeded_total');
    } catch (error) {
      if (leaseLost || (await this.jobs.findById(job.jobId))?.status === 'CANCELLED') return;
      logger.error('Durable job failed', { jobId: job.jobId, error });
      await this.jobs.fail(job.jobId, this.workerId, { message: error instanceof Error ? error.message : String(error) });
      metrics.increment('durable_jobs_failed_total');
    } finally {
      metrics.observe('durable_job_duration_seconds', (Date.now() - started) / 1000);
      clearInterval(renew);
    }
  }
}
