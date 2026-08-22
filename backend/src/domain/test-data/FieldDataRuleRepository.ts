import type { FieldDataRuleEntity } from './FieldDataRuleEntity.js';
export interface FieldDataRuleRepository {
  create(rule: FieldDataRuleEntity): Promise<FieldDataRuleEntity>;
  update(id: string, patch: Partial<FieldDataRuleEntity>): Promise<FieldDataRuleEntity>;
  findById(id: string): Promise<FieldDataRuleEntity | null>;
  findByProject(projectId: string): Promise<FieldDataRuleEntity[]>;
  findByOperation(projectId: string, operationId: string): Promise<FieldDataRuleEntity[]>;
}
