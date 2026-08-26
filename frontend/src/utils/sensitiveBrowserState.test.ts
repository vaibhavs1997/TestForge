import { afterEach, describe, expect, it } from 'vitest';
import { clearSensitiveBrowserState } from './sensitiveBrowserState';

describe('clearSensitiveBrowserState', () => {
  afterEach(() => { window.localStorage.clear(); window.sessionStorage.clear(); });

  it('removes legacy request, response, environment and JWT snapshots without exporting literals', () => {
    const literal = 'jwt.secret.value';
    window.localStorage.setItem('testforge_auth_jwt', literal);
    window.localStorage.setItem('testforge:api-workspace:responses:project:1', JSON.stringify({ authorization: `Bearer ${literal}` }));
    window.sessionStorage.setItem('testforge:api-workspace:runtime-data:project:1', literal);
    window.sessionStorage.setItem('testforge:api-workspace-session:project:1', JSON.stringify({ response: literal }));
    window.localStorage.setItem('theme', 'dark');

    clearSensitiveBrowserState();

    const remainingPersistedValues = [window.localStorage, window.sessionStorage]
      .flatMap((storage) => Array.from({ length: storage.length }, (_, index) => storage.getItem(storage.key(index) || '') || ''))
      .join('\n');
    expect(remainingPersistedValues).not.toContain(literal);
    expect(window.localStorage.getItem('testforge_auth_jwt')).toBeNull();
    expect(window.localStorage.getItem('testforge:api-workspace:responses:project:1')).toBeNull();
    expect(window.sessionStorage.getItem('testforge:api-workspace:runtime-data:project:1')).toBeNull();
    expect(window.sessionStorage.getItem('testforge:api-workspace-session:project:1')).toBeNull();
    expect(window.localStorage.getItem('theme')).toBe('dark');
  });
});
