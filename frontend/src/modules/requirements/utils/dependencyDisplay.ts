import type { TestDesign } from '../types';
import type { ApiOperationOption } from './operationDisplay';
import { resolveOperationLabel } from './operationDisplay';

export interface DisplayDependencyEdge {
  sourceOperationId: string;
  targetOperationId: string;
}

/** Builds a stable, de-duplicated, cycle-safe chain for a generated design. */
export function buildDependencyChain(designs: TestDesign[], design: TestDesign): DisplayDependencyEdge[] {
  const edges = new Map<string, DisplayDependencyEdge>();
  for (const item of designs) {
    for (const dependency of item.dependencies ?? []) {
      if (!dependency.sourceOperationId || !dependency.targetOperationId) continue;
      const key = `${dependency.sourceOperationId}->${dependency.targetOperationId}`;
      if (!edges.has(key)) edges.set(key, {
        sourceOperationId: dependency.sourceOperationId,
        targetOperationId: dependency.targetOperationId,
      });
    }
  }

  const incoming = new Map<string, DisplayDependencyEdge[]>();
  for (const edge of edges.values()) {
    const list = incoming.get(edge.targetOperationId) ?? [];
    list.push(edge);
    incoming.set(edge.targetOperationId, list);
  }

  const result: DisplayDependencyEdge[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (targetOperationId: string) => {
    if (visiting.has(targetOperationId) || visited.has(targetOperationId)) return;
    visiting.add(targetOperationId);
    for (const edge of incoming.get(targetOperationId) ?? []) {
      const key = `${edge.sourceOperationId}->${edge.targetOperationId}`;
      if (!result.some((item) => `${item.sourceOperationId}->${item.targetOperationId}` === key)) result.unshift(edge);
      visit(edge.sourceOperationId);
    }
    visiting.delete(targetOperationId);
    visited.add(targetOperationId);
  };
  visit(design.operationId);
  return result;
}

export function formatDependencyEdge(edge: DisplayDependencyEdge, operations: ApiOperationOption[]): string {
  return `${resolveOperationLabel(operations, edge.sourceOperationId)} → ${resolveOperationLabel(operations, edge.targetOperationId)}`;
}
