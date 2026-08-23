import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LocalSecretStore } from './LocalSecretStore.js';
import { SecretResolutionService } from '../../application/security/SecretResolutionService.js';
import { SensitiveDataRedactionService } from './SensitiveDataRedactionService.js';
import { EvidenceGovernanceService } from './EvidenceGovernanceService.js';
import { RetentionService } from '../../application/retention/RetentionService.js';

describe('Phase 4.9 secret and evidence governance', () => {
  let cwd = ''; let dir = '';
  beforeEach(() => { cwd = process.cwd(); dir = mkdtempSync(join(tmpdir(), 'tf-secret-')); process.chdir(dir); });
  afterEach(() => { process.chdir(cwd); rmSync(dir, { recursive: true, force: true }); });

  it('resolves secret references transiently and rotates without plaintext persistence', async () => {
    const store = new LocalSecretStore();
    await store.set({ id: 'api-token', projectId: 'p', value: 'first-secret', classification: 'CREDENTIAL' });
    const environment = { variables: { token: { secretRef: 'api-token' } } };
    const resolved = await new SecretResolutionService(store).resolve(environment);
    expect(resolved.variables.token).toBe('first-secret');
    expect(environment.variables.token).toEqual({ secretRef: 'api-token' });
    expect(readFileSync(join(dir, 'data/runtime/secrets.enc.json'), 'utf8')).not.toContain('first-secret');
    const metadata = await store.update('api-token', 'rotated-secret');
    expect(metadata.version).toBe(2);
    expect(await store.get('api-token')).toBe('rotated-secret');
  });

  it('redacts nested and configured sensitive fields without changing outbound input', () => {
    const redactor = new SensitiveDataRedactionService(); redactor.configureSensitiveFields(['nationalId']);
    const outbound = { nested: { nationalId: '123', authorization: 'Bearer abc' }, html: '<token>valid-security-test</token>' };
    const safe = redactor.redact(outbound);
    expect(safe.nested).toEqual({ nationalId: '[REDACTED]', authorization: '[REDACTED]' });
    expect(outbound.nested.nationalId).toBe('123');
    expect(outbound.html).toContain('valid-security-test');
  });

  it('applies every evidence persistence mode and payload limits', () => {
    const value = { request: { authorization: 'Bearer secret', body: 'x'.repeat(100) } };
    expect(new EvidenceGovernanceService({ mode: 'FULL', maxRequestBytes: 500, maxResponseBytes: 500 }).protect(value, 'request')).toEqual({ request: { authorization: '[REDACTED]', body: 'x'.repeat(100) } });
    expect(new EvidenceGovernanceService({ mode: 'REDACT_SENSITIVE', maxRequestBytes: 500, maxResponseBytes: 500 }).protect(value, 'request')).toEqual({ request: { authorization: '[REDACTED]', body: 'x'.repeat(100) } });
    expect(new EvidenceGovernanceService({ mode: 'METADATA_ONLY', maxRequestBytes: 1, maxResponseBytes: 1 }).protect(value, 'request')).toMatchObject({ omitted: true, byteLength: expect.any(Number) });
    expect(new EvidenceGovernanceService({ mode: 'DO_NOT_PERSIST', maxRequestBytes: 1, maxResponseBytes: 1 }).protect(value, 'request')).toBeUndefined();
    expect(new EvidenceGovernanceService({ mode: 'REDACT_SENSITIVE', maxRequestBytes: 20, maxResponseBytes: 20 }).protect(value, 'request')).toMatchObject({ truncated: true });
  });

  it('purges protected evidence while preserving traceability metadata', () => {
    const items = [{ id: 'run-1', createdAt: 0, requirementId: 'ac-1', payload: 'secret' }];
    const purged = new RetentionService().purge(items, 1, (item) => ({ ...item, payload: '[PURGED]' }));
    expect(purged[0]).toMatchObject({ id: 'run-1', requirementId: 'ac-1', payload: '[PURGED]' });
  });
});
