import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FieldDataRuleRepository as IFieldDataRuleRepository } from '../../domain/test-data/FieldDataRuleRepository.js';
import type { FieldDataRuleEntity } from '../../domain/test-data/FieldDataRuleEntity.js';
import { readJsonArray, writeJsonArray } from '../persistence/JsonFileStore.js';

export class FieldDataRuleRepository implements IFieldDataRuleRepository {
  private file(projectId: string) { return path.join(process.cwd(), 'data', 'test-data', projectId, 'field-data-rules.json'); }
  private async read(projectId: string): Promise<FieldDataRuleEntity[]> { return readJsonArray(this.file(projectId)); }
  async create(rule: FieldDataRuleEntity) { const rows = await this.read(rule.projectId); rows.push(rule); await writeJsonArray(this.file(rule.projectId), rows); return rule; }
  async update(id: string, patch: Partial<FieldDataRuleEntity>) {
    const root = path.join(process.cwd(), 'data', 'test-data');
    for (const projectId of fs.existsSync(root) ? fs.readdirSync(root) : []) { const rows = await this.read(projectId); const index = rows.findIndex((row) => row.id === id); if (index >= 0) { const updated = { ...rows[index], ...patch, updatedAt: Date.now() } as FieldDataRuleEntity; rows[index] = updated; await writeJsonArray(this.file(projectId), rows); return updated; } }
    throw new Error(`Field data rule ${id} not found`);
  }
  async findById(id: string) { const root = path.join(process.cwd(), 'data', 'test-data'); for (const projectId of fs.existsSync(root) ? fs.readdirSync(root) : []) { const found = (await this.read(projectId)).find((row) => row.id === id); if (found) return found; } return null; }
  async findByProject(projectId: string) { return this.read(projectId); }
  async findByOperation(projectId: string, operationId: string) { return (await this.read(projectId)).filter((row) => row.input.operationId === operationId); }
  async deleteByProject(projectId: string): Promise<number> {
    const rows = await this.read(projectId);
    if (rows.length === 0) return 0;
    await writeJsonArray(this.file(projectId), []);
    return rows.length;
  }
}
