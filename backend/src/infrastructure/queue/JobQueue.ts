// Job queue for long-running tasks (AI pipeline, execution)
// Uses in-memory queue with optional Redis for production

export interface JobDefinition<T = any> {
  id: string;
  type: string;
  data: T;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  result?: any;
  error?: string;
  createdAt: number;
  updatedAt: number;
  attempts: number;
  maxAttempts: number;
}

export interface JobQueueConfig {
  maxConcurrent: number;
  defaultMaxAttempts: number;
}

class InMemoryJobQueue {
  private jobs: Map<string, JobDefinition<any>> = new Map();
  private queue: string[] = [];
  private running: Map<string, NodeJS.Timeout> = new Map();
  private config: JobQueueConfig;

  constructor(config: Partial<JobQueueConfig> = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent || 2,
      defaultMaxAttempts: config.defaultMaxAttempts || 3,
    };
  }

  add<T>(type: string, data: T): JobDefinition<T> {
    const job: JobDefinition<T> = {
      id: `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attempts: 0,
      maxAttempts: this.config.defaultMaxAttempts,
    };

    this.jobs.set(job.id, job);
    this.queue.push(job.id);
    this.processNext();

    return job;
  }

  get<T>(jobId: string): JobDefinition<T> | undefined {
    return this.jobs.get(jobId) as JobDefinition<T> | undefined;
  }

  private async processNext(): Promise<void> {
    if (this.running.size >= this.config.maxConcurrent) {
      return;
    }

    if (this.queue.length === 0) {
      return;
    }

    const jobId = this.queue.shift();
    if (!jobId) return;

    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'pending') {
      return this.processNext();
    }

    job.status = 'running';
    job.updatedAt = Date.now();
    job.attempts++;

    // Simulate async processing (in real implementation, this would call actual handlers)
    const timeout = setTimeout(() => {
      this.running.delete(jobId);
      
      // Mark as completed (or failed based on handler result)
      job.status = 'completed';
      job.progress = 100;
      job.updatedAt = Date.now();
      job.result = { success: true };

      this.processNext();
    }, 1000);

    this.running.set(jobId, timeout);
  }

  getAll(): JobDefinition[] {
    return Array.from(this.jobs.values());
  }

  getByType(type: string): JobDefinition[] {
    return this.getAll().filter(job => job.type === type);
  }

  clear(): void {
    // Stop all running jobs
    for (const timeout of this.running.values()) {
      clearTimeout(timeout);
    }
    this.running.clear();
    this.jobs.clear();
    this.queue = [];
  }
}

// Singleton instance
let jobQueueInstance: InMemoryJobQueue | null = null;

export function getJobQueue(config?: Partial<JobQueueConfig>): InMemoryJobQueue {
  if (!jobQueueInstance) {
    jobQueueInstance = new InMemoryJobQueue(config);
  }
  return jobQueueInstance;
}

export default getJobQueue;