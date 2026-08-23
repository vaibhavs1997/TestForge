import type { PersistenceDriver } from '../../config.js';
import { InMemoryAuditLogRepository } from '../audit/AuditLogRepository.js';
import { FileAuditLogRepository } from '../audit/FileAuditLogRepository.js';
import type { AuditLogRepository } from '../../domain/audit/index.js';

export function createAuditLogRepository(driver: PersistenceDriver = 'json'): AuditLogRepository {
  if (driver === 'memory') {
    return new InMemoryAuditLogRepository();
  }
  return new FileAuditLogRepository();
}

export default createAuditLogRepository;
