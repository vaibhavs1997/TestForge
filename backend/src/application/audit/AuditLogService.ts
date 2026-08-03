// AuditLogService - Application Service for Audit Log Framework
// Subscribes to EventBus and logs important actions.

import { EventBus, EventType, ModuleName, DomainEvent } from '../../domain/events/EventBus';
import { AuditLogEntity, AuditAction, AuditModule } from '../../domain/audit/AuditLogEntity';
import { AuditLogRepository } from '../../domain/audit/AuditLogRepository';

export class AuditLogService {
  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    eventBus: EventBus
  ) {
    this.setupEventSubscriptions(eventBus);
  }

  private setupEventSubscriptions(eventBus: EventBus): void {
    // Subscribe to all modules
    const modules: ModuleName[] = [
      'api', 'environment', 'dataset', 'analysis', 'knowledge', 'requirements',
      'strategy', 'design', 'execution', 'pipeline', 'recommendation', 'scheduler', 'report'
    ];

    const actionMapping: Record<EventType, AuditAction> = {
      'IMPORTED': 'CREATE',
      'UPDATED': 'UPDATE',
      'DELETED': 'DELETE',
      'APPROVED': 'APPROVE',
      'REJECTED': 'REJECT',
      'GENERATED': 'GENERATE',
      'INVALIDATED': 'DELETE',
      'COMPLETED': 'EXECUTE',
      'FAILED': 'EXECUTE',
    };

    for (const module of modules) {
      for (const [eventType, auditAction] of Object.entries(actionMapping)) {
        eventBus.subscribe(eventType as EventType, module, async (event) => {
          await this.handleEvent(event, auditAction);
        });
      }
    }
  }

  private async handleEvent(event: DomainEvent, action: AuditAction): Promise<void> {
    const module = this.mapModule(event.module);
    const entityType = this.extractEntityType(event.payload);

    const auditLog = new AuditLogEntity(
      crypto.randomUUID(),
      event.projectId,
      module,
      entityType,
      event.entityId,
      action,
      'System',
      event.timestamp,
      event.payload?.oldValue || null,
      event.payload?.newValue || null,
      event.payload?.metadata || {}
    );

    await this.auditLogRepository.create(auditLog);
  }

  private mapModule(module: ModuleName): AuditModule {
    const mapping: Partial<Record<ModuleName, AuditModule>> = {
      'api': 'API',
      'environment': 'Environment',
      'dataset': 'Dataset',
      'analysis': 'Analysis',
      'knowledge': 'Knowledge',
      'requirements': 'Requirement',
      'strategy': 'ExecutionPlan',
      'design': 'Assertion',
      'execution': 'Execution',
      'pipeline': 'ExecutionPlan',
      'recommendation': 'Report',
      'scheduler': 'Scheduler',
    };
    return mapping[module] || 'Project';
  }

  private extractEntityType(payload?: Record<string, any>): string {
    if (!payload) return 'Unknown';
    return payload.entityType || 'Unknown';
  }

  async logAction(params: {
    projectId: string;
    module: AuditModule;
    entityType: string;
    entityId: string;
    action: AuditAction;
    oldValue?: Record<string, any> | null;
    newValue?: Record<string, any> | null;
    metadata?: Record<string, any>;
  }): Promise<AuditLogEntity> {
    const log = new AuditLogEntity(
      crypto.randomUUID(),
      params.projectId,
      params.module,
      params.entityType,
      params.entityId,
      params.action,
      'System',
      Date.now(),
      params.oldValue || null,
      params.newValue || null,
      params.metadata || {}
    );

    return this.auditLogRepository.create(log);
  }

  async getLogs(projectId: string, filters?: {
    module?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    startDate?: number;
    endDate?: number;
  }): Promise<AuditLogEntity[]> {
    return this.auditLogRepository.findByProjectAndFilters(projectId, filters);
  }

  async getLogById(id: string): Promise<AuditLogEntity> {
    const log = await this.auditLogRepository.findById(id);
    if (!log) {
      throw new Error(`Audit log with id ${id} not found`);
    }
    return log;
  }
}

export default AuditLogService;