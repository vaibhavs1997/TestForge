import type { PersistenceDriver } from '../../config';
import { InMemoryAuditLogRepository } from '../audit/AuditLogRepository';
import { FileAuditLogRepository } from '../audit/FileAuditLogRepository';
import type { AuditLogRepository } from '../../domain/audit';

export function createAuditLogRepository(driver: PersistenceDriver = 'json'): AuditLogRepository {
  if (driver === 'memory') {
    return new InMemoryAuditLogRepository();
  }
  return new FileAuditLogRepository();
}

export default createAuditLogRepository;
