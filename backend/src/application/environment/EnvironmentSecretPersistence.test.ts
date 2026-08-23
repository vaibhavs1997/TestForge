import { describe, expect, it, vi } from 'vitest';
import { maskEnvironmentSecrets, persistEnvironmentSecrets } from './EnvironmentSecretPersistence.js';

describe('EnvironmentSecretPersistence', () => {
  it('stores sensitive environment values by reference and does not return literals', async () => {
    const secretStore = {
      metadata: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue({}),
      update: vi.fn(), get: vi.fn(), delete: vi.fn(),
    };
    const persisted = await persistEnvironmentSecrets({
      projectId: 'project-1', environmentId: 'environment-1',
      variables: { baseUrl: 'https://api.example.test', accessToken: 'jwt-super-secret', apiKey: 'key-super-secret' },
      authentication: { type: 'bearer', token: 'jwt-super-secret' },
    }, secretStore);

    expect(JSON.stringify(persisted)).not.toContain('jwt-super-secret');
    expect(JSON.stringify(persisted)).not.toContain('key-super-secret');
    expect(secretStore.set).toHaveBeenCalledTimes(3);
    const response = maskEnvironmentSecrets(persisted);
    expect(JSON.stringify(response)).not.toContain('jwt-super-secret');
    expect(response).toMatchObject({ variables: { baseUrl: 'https://api.example.test', accessToken: { masked: true } } });
  });

  it('masks legacy sensitive literals on backend reads', () => {
    expect(maskEnvironmentSecrets({ variables: { password: 'old-password', region: 'us-east-1' } }))
      .toEqual({ variables: { password: { masked: true }, region: 'us-east-1' } });
  });
});
