import { describe, expect, it } from 'vitest';
import { runtimeFlow, userFacingScope, userFacingStrategy } from './ExecutionDataWorkspace';

describe('Test Data usability labels', () => {
  it('uses user-facing labels for strategies and change scopes', () => {
    expect(userFacingStrategy('GENERATE')).toBe('Generate automatically');
    expect(userFacingStrategy('LINKED_RESPONSE')).toBe('From previous API');
    expect(userFacingStrategy('FIXED', 'OMIT')).toBe('Do not send');
    expect(userFacingScope('SUITE_RUN')).toBe('Stays the same for this suite run');
  });

  it('keeps same semantic fields readable as operation-specific behavior', () => {
    expect(`${userFacingStrategy('GENERATE')} / register`).not.toBe(`${userFacingStrategy('REUSE')} / login`);
  });

  it('renders a protocol-neutral producer to consumer flow', () => {
    expect(runtimeFlow({ sourceReference: { operationId: 'createIdentity' }, input: { operationId: 'authenticate', path: 'identityId' } }))
      .toBe('createIdentity → authenticate → identityId');
  });

  it('describes absent runtime metadata without REST or GraphQL assumptions', () => {
    expect(runtimeFlow({ input: { path: 'value' } })).toBe('An earlier operation → Operation → value');
  });
});
