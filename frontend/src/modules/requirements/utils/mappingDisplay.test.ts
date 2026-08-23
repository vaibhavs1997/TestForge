import { describe, expect, it } from 'vitest';
import { getMappingDisplay } from './mappingDisplay';

describe('mapping display', () => {
  it('does not treat legacy metadata as confirmed', () => {
    expect(getMappingDisplay({ operationId: 'op-1' })).toMatchObject({ state: 'legacy', stateLabel: 'Legacy / review', provenance: undefined });
  });
});
