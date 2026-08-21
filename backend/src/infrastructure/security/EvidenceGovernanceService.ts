import type { EvidencePersistenceMode, EvidencePolicy } from '../../domain/evidence/EvidencePolicy.js';
import { defaultEvidencePolicy } from '../../domain/evidence/EvidencePolicy.js';
import { sensitiveDataRedactor, SensitiveDataRedactionService } from './SensitiveDataRedactionService.js';

export class EvidenceGovernanceService {
  constructor(private readonly policy: EvidencePolicy = defaultEvidencePolicy) {}
  protect(value: unknown, kind: 'request' | 'response' | 'runtime' | 'snapshot' | 'report' | 'audit' | 'export' | 'jira' = 'report'): unknown {
    const mode: EvidencePersistenceMode = this.policy.mode;
    if (mode === 'DO_NOT_PERSIST') return undefined;
    if (mode === 'METADATA_ONLY') return this.metadata(value);
    const safe = sensitiveDataRedactor.redact(value);
    const limit = kind === 'request' ? this.policy.maxRequestBytes : this.policy.maxResponseBytes;
    return this.truncate(safe, limit);
  }
  private metadata(value: unknown) { const text = JSON.stringify(value ?? null); return { omitted: true, byteLength: Buffer.byteLength(text), reason: 'evidence-policy:metadata-only' }; }
  private truncate(value: unknown, limit: number): unknown { const text = JSON.stringify(value); if (Buffer.byteLength(text) <= limit) return value; return { value: text.slice(0, limit), truncated: true, originalBytes: Buffer.byteLength(text) }; }
}
export const defaultEvidenceGovernance = new EvidenceGovernanceService();
