export interface RetentionPolicy { executionEvidenceDays?: number; reportsDays?: number; auditDays?: number; versionHistoryDays?: number; importedTestDataDays?: number; temporaryArtifactsDays?: number; }
/** Replaces protected evidence while retaining IDs/status/timestamps needed for traceability. */
export class RetentionService {
  purge<T extends { createdAt?: number; id?: string }>(items: T[], olderThanDays: number, redact: (item: T) => T): T[] { const cutoff = Date.now() - olderThanDays * 86_400_000; return items.map((item) => (item.createdAt ?? Date.now()) < cutoff ? redact(item) : item); }
}
