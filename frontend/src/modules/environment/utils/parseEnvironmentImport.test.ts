import { describe, expect, it } from 'vitest';
import { resolveEnvironmentBaseUrl } from './parseEnvironmentImport';

describe('resolveEnvironmentBaseUrl', () => {
  it('detects service-prefixed base URL variables used by imported env files', () => {
    expect(resolveEnvironmentBaseUrl({ ident_base_url: 'https://identity.example.test/' }))
      .toBe('https://identity.example.test');
  });

  it('keeps the explicit environment base URL when one is supplied', () => {
    expect(resolveEnvironmentBaseUrl({ ident_base_url: 'https://identity.example.test' }, 'https://api.example.test/'))
      .toBe('https://api.example.test');
  });
});
