import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TestCaseVersionService } from './TestCaseVersionService.js';

describe('TestCaseVersionService provenance persistence', () => {
  it('reloads immutable provenance and preserves the old snapshot when later content changes', () => {
    const root = mkdtempSync(join(tmpdir(), 'testforge-provenance-'));
    const file = join(root, 'versions.json');
    try {
      const first = new TestCaseVersionService(file);
      const [v1] = first.ingest('project-1', [{ requirementId: 'req-1', acceptanceCriterionId: 'ac-1', operationId: 'op-1', scenarioIntent: 'scenario', payload: {}, assertions: [], mapping: { confidence: 80, state: 'confirmed' }, generationProvenance: { generatedAt: 1, mode: 'DETERMINISTIC', requirement: { id: 'req-1', version: 1 }, acceptanceCriteria: [{ id: 'ac-1', version: 1 }], mapping: { confidence: 80, state: 'confirmed', provenance: 'matcher' }, knowledgeSourceIds: ['flow-1'], testData: { fieldRuleIds: [], sourceFields: [] } } }]);
      const reloaded = new TestCaseVersionService(file);
      expect(reloaded.getVersion(v1.id).content.generationProvenance?.mode).toBe('DETERMINISTIC');
      const [v2] = reloaded.ingest('project-1', [{ ...reloaded.getVersion(v1.id).content, generationProvenance: { ...reloaded.getVersion(v1.id).content.generationProvenance!, mode: 'FALLBACK', fallback: { from: 'AI_GENERATED', reason: 'safe' } } }]);
      expect(reloaded.history(v1.testCaseId)).toHaveLength(2);
      expect(reloaded.getVersion(v1.id).content.generationProvenance?.mode).toBe('DETERMINISTIC');
      expect(v2.content.generationProvenance?.mode).toBe('FALLBACK');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
