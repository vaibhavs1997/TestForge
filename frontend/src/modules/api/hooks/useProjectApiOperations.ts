import { useMemo } from 'react';
import { useServices, useApiOperations } from './useService';
import type { ApiOperationOption } from '../../requirements/utils/operationDisplay';

export function useProjectApiOperations(projectId?: string) {
  const { services, isLoading: servicesLoading } = useServices(projectId);
  const serviceIds = useMemo(() => (services ?? []).map((s) => s.id), [services]);
  const { operations, isLoading: operationsLoading } = useApiOperations(projectId, serviceIds);

  const operationOptions: ApiOperationOption[] = useMemo(
    () =>
      (operations ?? []).map((op) => ({
        id: op.id,
        serviceId: op.serviceId,
        name: op.name,
        method: op.method,
        path: op.path,
        serviceName: op.serviceName,
      })),
    [operations],
  );

  const operationById = useMemo(() => {
    const map = new Map<string, ApiOperationOption>();
    operationOptions.forEach((op) => map.set(op.id, op));
    return map;
  }, [operationOptions]);

  return {
    operations: operationOptions,
    operationById,
    isLoading: servicesLoading || operationsLoading,
  };
}

export default useProjectApiOperations;
