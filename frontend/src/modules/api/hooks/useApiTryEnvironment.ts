import React from 'react';
import type { EnvironmentDto } from '../../../types/apiModels';

const STORAGE_PREFIX = 'testforge:api-try-environment';

/**
 * Persists the environment used for API Try / execution preview per project.
 * Execution module can read the same localStorage key later.
 */
export function useApiTryEnvironment(projectId: string, environments: EnvironmentDto[]) {
  const storageKey = `${STORAGE_PREFIX}:${projectId}`;
  const [environmentId, setEnvironmentIdState] = React.useState('');

  const envSignature = React.useMemo(
    () => environments.map((e) => e.id).join('\n'),
    [environments],
  );

  React.useEffect(() => {
    if (!projectId) return;
    const stored = localStorage.getItem(storageKey);
    if (stored && environments.some((e) => e.id === stored)) {
      setEnvironmentIdState(stored);
      return;
    }
    setEnvironmentIdState('');
  }, [projectId, storageKey, envSignature, environments]);

  const setEnvironmentId = React.useCallback(
    (id: string) => {
      setEnvironmentIdState(id);
      if (id) localStorage.setItem(storageKey, id);
      else localStorage.removeItem(storageKey);
    },
    [storageKey],
  );

  const selectedEnvironment =
    environments.find((e) => e.id === environmentId) ?? null;

  return {
    environmentId,
    setEnvironmentId,
    selectedEnvironment,
  };
}

export function getStoredApiTryEnvironmentId(projectId: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`${STORAGE_PREFIX}:${projectId}`);
}
