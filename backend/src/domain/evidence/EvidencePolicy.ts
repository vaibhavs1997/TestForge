export type EvidencePersistenceMode = 'FULL' | 'REDACT_SENSITIVE' | 'METADATA_ONLY' | 'DO_NOT_PERSIST';
export type SensitiveDataClassification = 'SECRET' | 'CREDENTIAL' | 'PII' | 'FINANCIAL' | 'CUSTOM';
export interface EvidencePolicy { mode: EvidencePersistenceMode; maxRequestBytes: number; maxResponseBytes: number; }
export const defaultEvidencePolicy: EvidencePolicy = { mode: 'REDACT_SENSITIVE', maxRequestBytes: 64_000, maxResponseBytes: 128_000 };
