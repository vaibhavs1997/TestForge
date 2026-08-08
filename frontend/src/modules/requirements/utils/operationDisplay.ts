export interface ApiOperationOption {
  id: string;
  serviceId: string;
  name: string;
  method: string;
  path: string;
  serviceName?: string;
}

export function formatOperationLabel(op: Pick<ApiOperationOption, 'method' | 'path' | 'name'>): string {
  const path = op.path || '/';
  return `${op.method} ${path}${op.name ? ` — ${op.name}` : ''}`;
}

export function formatOperationShort(op: Pick<ApiOperationOption, 'method' | 'path'>): string {
  return `${op.method} ${op.path || '/'}`;
}

export function findOperation(
  operations: ApiOperationOption[],
  operationId?: string,
): ApiOperationOption | undefined {
  if (!operationId) return undefined;
  return operations.find((o) => o.id === operationId);
}

export function resolveOperationLabel(
  operations: ApiOperationOption[],
  operationId?: string,
): string {
  const op = findOperation(operations, operationId);
  if (op) return formatOperationShort(op);
  if (!operationId) return 'Not mapped';
  return `Unknown (${operationId.slice(0, 8)}…)`;
}
