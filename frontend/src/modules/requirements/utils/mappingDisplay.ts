import type { TestDesign } from '../types';

export function getMappingDisplay(design: Pick<TestDesign, 'operationId' | 'mappingState' | 'mappingProvenance'>) {
  const state = design.mappingState ?? (design.operationId ? 'legacy' : 'unmapped');
  return {
    state,
    stateLabel: state === 'review' ? 'Needs review' : state === 'confirmed' ? 'Confirmed' : state === 'legacy' ? 'Legacy / review' : 'Unmapped',
    provenance: design.mappingProvenance,
  };
}
