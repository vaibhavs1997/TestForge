import { describe, expect, it } from 'vitest';
import { ExecutionController } from './ExecutionController.js';
describe('execution snapshot serialization', () => {
  it('returns the stored sanitized snapshot without secret values', async () => { const run: any = { id: 'run', projectId: 'project', stepResults: [{ executionSnapshot: { baseSnapshotId: 'base', request: { headers: { Authorization: '[REDACTED]' }, body: { password: '[REDACTED]' }, method: 'GET', url: 'x' }, resolvedFields: [{ source: 'SECRET', reference: 'vault:key', fingerprint: 'abc' }] } }] }; const response: any = { status: () => response, json: (x: any) => { response.body = x; } }; await new ExecutionController({} as any, { findById: async () => run } as any, {} as any).getExecution({ params: { runId: 'run' } } as any, response); expect(JSON.stringify(response.body)).toContain('vault:key'); expect(JSON.stringify(response.body)).not.toContain('secret'); });
});
