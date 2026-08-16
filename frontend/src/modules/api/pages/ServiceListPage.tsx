// Service list page scoped to a project with search, sort, and filters.
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../constants';
import { notificationInboxQueryKey } from '../../notification/hooks';
import { runUnifiedImport } from '../../import/utils/runUnifiedImport';
import { evaluateUnifiedImport } from '../../import/utils/buildUnifiedImportMessage';
import { PageHeader } from '../../../components/layout/PageHeader';
import { SearchBar } from '../../../components/shared/SearchBar';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { Toast } from '../../../components/shared/Toast';
import { Select } from '../../../components/forms/Select';
import { ServiceDialog } from '../components/ServiceDialog';
import { ImportApiModal, type ImportApiModalData } from '../components/ImportApiModal';
import { AddApiModal, type AddApiModalData } from '../components/AddApiModal';
import { useService, useApiOperations, useImportApiContract } from '../hooks/useService';
import { useEnvironments } from '../../environment/hooks/useEnvironments';
import { useApiTryEnvironment } from '../hooks/useApiTryEnvironment';
import { ApiTryEnvironmentSelect } from '../components/ApiTryEnvironmentSelect';
import { joinBaseUrlAndPath } from '../utils/buildOperationUrl';
import { environmentService } from '../../environment/services/environmentService';
import type { Service, ServiceFormData, ImportSummary, DetectedEnvironment } from '../types';
import { applyImportSummaryToUi, type ImportUiOutcome } from '../utils/importSummary';
import { ChevronRight, Plus, Import, MoreVertical, Play, Edit, Trash2, FolderOpen } from 'lucide-react';
import { ApiOnboardingCard } from '../components/ApiOnboardingCard';
import { toApiOperationView, type ApiOperationView } from '../../../types/apiModels';

type SortField = 'name' | 'protocol' | 'version' | 'status' | 'updatedDate';
type SortDir = 'asc' | 'desc';

function stringifyJsonPretty(value: Record<string, unknown> | null | undefined): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return '{}';
  }
}

function parseJsonSafely(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

const methodFilterOptions = [
  { value: '', label: 'All Methods' },
  { value: 'REST', label: 'REST' },
  { value: 'GraphQL', label: 'GraphQL' },
  { value: 'SOAP', label: 'SOAP' },
  { value: 'gRPC', label: 'gRPC' },
  { value: 'Other', label: 'Other' },
];

// Local Operation interface for UI use — mirrors what ServiceListPage expects.
type OperationLocal = ApiOperationView;

interface ServiceWithOperations extends Service {
  operations: OperationLocal[];
}

interface TreeNode {
  name: string;
  type: 'folder' | 'service';
  path: string;
  children?: TreeNode[];
  service?: ServiceWithOperations;
}

interface FolderViewProps {
  services: ServiceWithOperations[];
  selectedService: ServiceWithOperations | null;
  selectedOperation: OperationLocal | null;
  expandedServices: Set<string>;
  onToggleExpand: (id: string) => void;
  onServiceClick: (service: ServiceWithOperations) => void;
  onOperationClick: (operation: OperationLocal) => void;
  onEditService: (event: React.MouseEvent, service: Service) => void;
  onDeleteService: (event: React.MouseEvent, service: ServiceWithOperations) => void;
  getMethodColor: (method: string) => string;
}

const FolderView = ({
  services,
  selectedService,
  selectedOperation,
  expandedServices,
  onToggleExpand,
  onServiceClick,
  onOperationClick,
  onEditService,
  onDeleteService,
  getMethodColor,
}: FolderViewProps) => {
  // Build a tree structure from services with folder paths
  const tree = React.useMemo(() => {
    const rootNodes: TreeNode[] = [];
    const folderMap = new Map<string, TreeNode>();

    // First pass: create all nodes
    for (const service of services) {
      const folderPath = service.folderPath?.trim() || '';
      
      if (folderPath) {
        const parts = folderPath.split('/').filter(Boolean);
        let currentPath = '';
        
        // Create folder hierarchy
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          
          if (!folderMap.has(currentPath)) {
            const node: TreeNode = {
              name: part,
              type: 'folder',
              path: currentPath,
              children: [],
            };
            folderMap.set(currentPath, node);
            
            // Add to parent or root
            if (i === 0) {
              rootNodes.push(node);
            } else {
              const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
              const parent = folderMap.get(parentPath);
              if (parent && parent.children) {
                parent.children.push(node);
              }
            }
          }
        }
        
        // Add service to the deepest folder
        const deepestFolder = folderMap.get(folderPath);
        if (deepestFolder && deepestFolder.children) {
          deepestFolder.children.push({
            name: service.name,
            type: 'service',
            path: folderPath,
            service,
          });
        }
      } else {
        // No folder path - add to root
        rootNodes.push({
          name: service.name,
          type: 'service',
          path: '',
          service,
        });
      }
    }

    // Sort: folders first, then services, alphabetically
    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      nodes.forEach(node => {
        if (node.children) {
          sortNodes(node.children);
        }
      });
    };

    sortNodes(rootNodes);
    return rootNodes;
  }, [services]);

  const renderNode = (node: TreeNode, depth: number): JSX.Element => {
    if (node.type === 'folder') {
      const folderId = `folder-${node.path}`;
      const isExpanded = expandedServices.has(folderId);
      
      return (
        <div key={node.path}>
          <div
            className='flex items-center gap-2 px-3 py-1.5 hover:bg-surface/50 cursor-pointer'
            style={{ paddingLeft: `${depth * 16 + 12}px` }}
            onClick={() => onToggleExpand(folderId)}
          >
            <ChevronRight
              className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
            <FolderOpen className='h-4 w-4 shrink-0 text-text-secondary' />
            <span className='text-sm font-medium text-text'>{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <div>
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else if (node.type === 'service' && node.service) {
      const service = node.service;
      const isSelected = selectedService?.id === service.id;
      const isExpanded = expandedServices.has(service.id);
      
      return (
        <div key={service.id}>
          <div
            className={`flex items-center gap-1 rounded-lg pr-1 transition-colors ${
              isSelected ? 'bg-primary text-white' : 'hover:bg-surface text-text'
            }`}
            style={{ paddingLeft: `${depth * 16 + 12}px` }}
          >
            <button
              type='button'
              onClick={() => onServiceClick(service)}
              className='flex min-w-0 flex-1 items-center px-3 py-2 text-left'
            >
              <div className='flex min-w-0 items-center gap-2'>
                <ChevronRight
                  className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
                <div className='min-w-0'>
                  <div className='truncate text-sm font-medium'>{service.name}</div>
                  <div className='text-xs opacity-75'>
                    {service.operations.length} operation{service.operations.length === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
            </button>
            <div className='flex shrink-0 items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100'>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className={`h-8 w-8 p-0 ${isSelected ? 'text-white hover:bg-white/20' : ''}`}
                aria-label={`Edit ${service.name}`}
                onClick={(e) => onEditService(e, service)}
              >
                <Edit className='h-4 w-4' aria-hidden />
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className={`h-8 w-8 p-0 ${isSelected ? 'text-white hover:bg-white/20 hover:text-white' : 'text-red-600 hover:text-red-700 dark:text-red-400'}`}
                aria-label={`Delete ${service.name}`}
                onClick={(e) => onDeleteService(e, service)}
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            </div>
          </div>
          {isExpanded && (
            <div className='ml-4 space-y-1'>
              {service.operations.map((operation) => (
                <button
                  key={operation.id}
                  onClick={() => onOperationClick(operation)}
                  className={`w-full flex items-center justify-between rounded px-3 py-2 text-left transition-colors ${
                    selectedOperation?.id === operation.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-surface text-text-secondary'
                  }`}
                >
                  <div className='flex min-w-0 items-center gap-2'>
                    <Badge className={`text-xs ${getMethodColor(operation.method)}`} variant='outline'>
                      {operation.method}
                    </Badge>
                    <div className='min-w-0'>
                      <div className='truncate text-sm font-medium'>
                        {operation.apiName || operation.name || operation.path}
                      </div>
                    </div>
                  </div>
                  <div className={`h-2 w-2 rounded-full ${operation.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }
    return <></>;
  };

  return (
    <div className='space-y-1'>
      {tree.map(node => renderNode(node, 0))}
    </div>
  );
};

/** Local JSON editor that keeps raw text state and only emits parsed objects. */
const RequestBodyEditor = ({
  value,
  onChange,
}: {
  value: Record<string, unknown> | null | undefined;
  onChange: (value: Record<string, unknown> | null) => void;
}) => {
  const [raw, setRaw] = React.useState(() => stringifyJsonPretty(value));

  React.useEffect(() => {
    setRaw(stringifyJsonPretty(value));
  }, [value]);

  const handleChange = (text: string) => {
    setRaw(text);
    if (!text.trim()) {
      onChange({});
      return;
    }
    try {
      const parsed = JSON.parse(text);
      onChange(parsed);
    } catch {
      // keep raw text while invalid; don't call onChange
    }
  };

  return (
    <textarea
      value={raw}
      onChange={(e) => handleChange(e.target.value)}
      className='h-64 w-full rounded-lg border border-border bg-surface p-3 font-mono text-sm text-text'
      spellCheck={false}
    />
  );
};

 

export const ServiceListPage = ({ projectId: propProjectId, projectName }: { projectId?: string; projectName?: string }) => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const projectId = routeProjectId ?? propProjectId ?? '1';
  const queryClient = useQueryClient();
  const { services, create, createAsync, update, remove, refetchServices } = useService(projectId);
  const { importContractAsync, isImporting } = useImportApiContract(projectId);
  const { environments: environmentList, isLoading: environmentsLoading } = useEnvironments(projectId);
  const environments = environmentList ?? [];
  const { environmentId, setEnvironmentId, selectedEnvironment } = useApiTryEnvironment(
    projectId,
    environments,
  );

  // Fetch all operations for every service in this project
  const serviceIds = React.useMemo(() => services.map((s) => s.id), [services]);
  const { operations: rawOperations, createOperationAsync, updateOperationAsync } = useApiOperations(projectId, serviceIds);

  const [search, setSearch] = React.useState('');
  const [selectedService, setSelectedService] = React.useState<ServiceWithOperations | null>(null);
  const [selectedOperation, setSelectedOperation] = React.useState<OperationLocal | null>(null);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [operationEditDraft, setOperationEditDraft] = React.useState<OperationLocal | null>(null);
  const restoredDraftIds = React.useRef<Set<string>>(new Set());
  const [methodFilter, setMethodFilter] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [addApiOpen, setAddApiOpen] = React.useState(false);
  const [editService, setEditService] = React.useState<Service | undefined>(undefined);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteService, setDeleteService] = React.useState<Service | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [toastOpen, setToastOpen] = React.useState(false);
  const [expandedServices, setExpandedServices] = React.useState<Set<string>>(new Set());
  const [pendingAutoSelect, setPendingAutoSelect] = React.useState(false);

  // Import contract state
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [progressToastOpen, setProgressToastOpen] = React.useState(false);
  const [progressMessage, setProgressMessage] = React.useState('');
  const [summaryToastOpen, setSummaryToastOpen] = React.useState(false);
  const [summaryMessage, setSummaryMessage] = React.useState('');
  const [summaryToastType, setSummaryToastType] = React.useState<'success' | 'warning' | 'info'>('success');
  const [errorToastOpen, setErrorToastOpen] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');
  
  // Environment detection state
  const [envConfirmOpen, setEnvConfirmOpen] = React.useState(false);
  const [detectedEnvironments, setDetectedEnvironments] = React.useState<DetectedEnvironment[]>([]);
  const [selectedEnvIds, setSelectedEnvIds] = React.useState<Set<string>>(new Set());
  const [isCreatingEnvironments, setIsCreatingEnvironments] = React.useState(false);
  const selectedOperationId = selectedOperation?.id;
  const selectedOperationBody = selectedOperation?.sampleRequestBody;
  const operationDraftId = operationEditDraft?.id;
  const operationDraftBody = operationEditDraft?.sampleRequestBody;

  // Build services with operations, merging fetched operations per service
  const servicesWithOperations: ServiceWithOperations[] = React.useMemo(() => {
    return services.map((service) => {
      const serviceOps = rawOperations
        .filter((op) => op.serviceId === service.id)
        .map((op) => toApiOperationView(op, service.name));
      return {
        ...service,
        operations: serviceOps,
      };
    });
  }, [services, rawOperations]);

  const executionBaseUrl = selectedEnvironment?.baseUrl?.trim() ?? '';
  const operationFullUrl = React.useMemo(() => {
    if (!selectedOperation) return '';
    if (executionBaseUrl) {
      return joinBaseUrlAndPath(executionBaseUrl, selectedOperation.path);
    }
    const svcBase = selectedService?.baseUrl?.trim();
    if (svcBase) return joinBaseUrlAndPath(svcBase, selectedOperation.path);
    return '';
  }, [selectedOperation, executionBaseUrl, selectedService?.baseUrl]);

  // Auto-select and expand the first service + first operation when data is available.
  // Handles the case where operations load asynchronously AFTER services.
  React.useEffect(() => {
    if (servicesWithOperations.length === 0) return;
    const firstService = servicesWithOperations[0];

    if (!selectedService) {
      setSelectedService(firstService);
      setExpandedServices((prev) => new Set(prev).add(firstService.id));
    }

    // Select the first operation once operations are available
    if (!selectedOperation && firstService.operations.length > 0) {
      setSelectedOperation(firstService.operations[0]);
    }
  }, [servicesWithOperations, selectedService, selectedOperation]);

  // After an import completes, auto-select the first service + first operation.
  // Keep the flag until BOTH services and operations have loaded.
  React.useEffect(() => {
    if (!pendingAutoSelect) return;
    if (servicesWithOperations.length === 0) return; // services not loaded yet
    const firstService = servicesWithOperations[0];
    if (firstService.operations.length === 0) return; // operations not loaded yet — keep flag
    setPendingAutoSelect(false);
    setSelectedService(firstService);
    setExpandedServices((prev) => new Set(prev).add(firstService.id));
    setSelectedOperation(firstService.operations[0]);
    setActiveTab('overview');
  }, [pendingAutoSelect, servicesWithOperations]);

  // Clear selection when the service was deleted or list refreshed
  React.useEffect(() => {
    if (!selectedService) return;
    if (!services.some((s) => s.id === selectedService.id)) {
      setSelectedService(null);
      setSelectedOperation(null);
    }
  }, [services, selectedService]);

  // Keep selected service in sync after import/refetch (e.g. baseUrl populated)
  React.useEffect(() => {
    if (!selectedService?.id) return;
    const latest = servicesWithOperations.find((s) => s.id === selectedService.id);
    if (!latest) return;
    if (
      latest.baseUrl !== selectedService.baseUrl
      || latest.operations.length !== selectedService.operations.length
      || latest.name !== selectedService.name
    ) {
      setSelectedService(latest);
      if (
        selectedOperation
        && !latest.operations.some((op) => op.id === selectedOperation.id)
        && latest.operations.length > 0
      ) {
        setSelectedOperation(latest.operations[0]);
      }
    }
  }, [servicesWithOperations, selectedService, selectedOperation]);

  const handleToggleExpand = (id: string) => {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleServiceClick = (service: ServiceWithOperations) => {
    handleToggleExpand(service.id);
    setSelectedService(service);
    if (service.operations.length > 0) {
      setSelectedOperation(service.operations[0]);
    }
    setActiveTab('overview');
  };

  const handleOperationClick = (operation: OperationLocal) => {
    setSelectedOperation(operation);
    setActiveTab('overview');
  };

  // Restore Request body draft from sessionStorage when switching operations or on mount.
  React.useEffect(() => {
    if (!selectedOperationId || !selectedOperation) return;
    if (restoredDraftIds.current.has(selectedOperationId)) return;

    const stored = sessionStorage.getItem(`operation-draft-${selectedOperationId}`);
    const parsed = stored ? parseJsonSafely(stored) : null;
    if (stored && parsed && !parsed.ok) {
      sessionStorage.removeItem(`operation-draft-${selectedOperationId}`);
    }

    const base = parsed?.ok
      ? { ...selectedOperation, sampleRequestBody: parsed.value as Record<string, unknown> | null }
      : { ...selectedOperation };
    setOperationEditDraft(base);
    restoredDraftIds.current.add(selectedOperationId);
  }, [selectedOperationId, selectedOperation, selectedOperationBody]);

  // Persist Request body draft to sessionStorage whenever it changes.
  React.useEffect(() => {
    if (!operationDraftId) return;
    if (operationDraftBody !== undefined) {
      sessionStorage.setItem(`operation-draft-${operationDraftId}`, JSON.stringify(operationDraftBody));
    } else {
      sessionStorage.removeItem(`operation-draft-${operationDraftId}`);
    }
  }, [operationDraftId, operationDraftBody]);

  const handleOperationDraftChange = (field: keyof OperationLocal, value: string | Record<string, unknown> | null) => {
    setOperationEditDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const saveOperationEdit = async () => {
    if (!selectedOperation || !operationEditDraft) return;
    try {
      const updated = await updateOperationAsync({
        apiId: selectedOperation.id,
        serviceId: selectedOperation.serviceId || '',
        name: operationEditDraft.name || operationEditDraft.apiName || '',
        method: operationEditDraft.method,
        path: operationEditDraft.path,
        description: operationEditDraft.description,
        authenticationType: operationEditDraft.authenticationType,
        status: operationEditDraft.status === 'active' ? 'Active' : 'Inactive',
      });
      // Sync the selected operation with the backend response so edits survive refresh/navigation
      if (updated) {
        setSelectedOperation((prev) => {
          if (!prev) return prev;
          const normalized = {
            ...updated,
            status: (updated.status === 'Active' ? 'active' : updated.status === 'Inactive' ? 'inactive' : updated.status) as OperationLocal['status'],
            // Preserve sampleRequestBody from draft since backend doesn't return it
            sampleRequestBody: (operationEditDraft?.sampleRequestBody ?? (updated as any).sampleRequestBody) as Record<string, unknown> | null | undefined,
          } as OperationLocal;
          return { ...prev, ...normalized };
        });
      }
      setSummaryMessage('API endpoint updated successfully.');
      setSummaryToastOpen(true);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to update API endpoint.');
      setErrorToastOpen(true);
    }
  };

  const handleCreate = (data: ServiceFormData) => {
    create(data);
    setCreateOpen(false);
  };

  const handleUpdate = (data: ServiceFormData) => {
    if (editService) {
      update(editService.id, data);
      setEditOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteService) return;
    const name = deleteService.name;
    try {
      await remove(deleteService.id);
      if (selectedService?.id === deleteService.id) {
        setSelectedService(null);
        setSelectedOperation(null);
      }
      setExpandedServices((prev) => {
        const next = new Set(prev);
        next.delete(deleteService.id);
        return next;
      });
      await refetchServices();
      setSummaryMessage(`Deleted service "${name}".`);
      setSummaryToastOpen(true);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to delete service.');
      setErrorToastOpen(true);
    } finally {
      setDeleteOpen(false);
      setDeleteService(undefined);
    }
  };

  const openDeleteServiceDialog = (
    event: React.MouseEvent,
    service: ServiceWithOperations,
  ) => {
    event.stopPropagation();
    setDeleteService(service);
    setDeleteOpen(true);
  };

  const openEditServiceDialog = (event: React.MouseEvent, service: Service) => {
    event.stopPropagation();
    setEditService(service);
    setEditOpen(true);
  };

  const deleteServiceOperationCount =
    deleteService
      ? servicesWithOperations.find((s) => s.id === deleteService.id)?.operations.length ?? 0
      : 0;

  const showImportOutcome = (message: string, outcome: ImportUiOutcome) => {
    if (outcome === 'error') {
      setErrorMessage(message);
      setErrorToastOpen(true);
      return;
    }
    setSummaryToastType(outcome === 'warning' ? 'warning' : 'success');
    setSummaryMessage(message);
    setSummaryToastOpen(true);
  };

  const handleImportApi = (data: ImportApiModalData) => {
    const onImportSuccess = (summary: ImportSummary) => {
      setProgressToastOpen(false);
      setUploadProgress(0);
      setPendingAutoSelect(true);
      applyImportSummaryToUi(summary, {
        onEnvironments: (envs) => {
          setDetectedEnvironments(envs);
          setSelectedEnvIds(new Set(envs.map((e) => `${e.name}-${e.baseUrl}`)));
          setEnvConfirmOpen(true);
        },
        onMessage: (message, outcome) => {
          showImportOutcome(message, outcome);
        },
      });
    };

    const onImportError = (error: unknown) => {
      setProgressToastOpen(false);
      setUploadProgress(0);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        err?.response?.data?.message || err?.message || 'Import failed. Please try again.';
      setErrorMessage(msg);
      setErrorToastOpen(true);
    };

    if (data.source === 'file' && data.items?.length) {
      const items = data.items;
      const singleApiOnly =
        items.length === 1 && items[0].kind === 'api-contract';

      if (singleApiOnly) {
        setUploadProgress(0);
        setProgressMessage('Starting upload…');
        setProgressToastOpen(true);

        importContractAsync({
          file: items[0].file,
          onUploadProgress: (e: { total?: number; loaded: number }) => {
            if (e.total && e.total > 0) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(percent);
              setProgressMessage(`Uploading… ${percent}%`);
            }
          },
        })
          .then(onImportSuccess)
          .catch(onImportError);
      } else {
        setUploadProgress(-1);
        setProgressMessage(`Importing ${items.length} file(s)…`);
        setProgressToastOpen(true);

        void runUnifiedImport(projectId, items)
          .then((result) => {
            setProgressToastOpen(false);
            setUploadProgress(0);
            setPendingAutoSelect(true);
            void queryClient.invalidateQueries({ queryKey: queryKeys.services(projectId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.operations(projectId) });
            void queryClient.invalidateQueries({ queryKey: queryKeys.environments(projectId) });
            void queryClient.invalidateQueries({ queryKey: notificationInboxQueryKey() });
            void refetchServices();

            const { message, outcome } = evaluateUnifiedImport(result);
            showImportOutcome(message, outcome);
          })
          .catch(onImportError);
      }
    } else if (data.source === 'url' && data.url?.trim()) {
      setUploadProgress(0);
      setProgressMessage('Fetching contract from URL…');
      setProgressToastOpen(true);

      importContractAsync({ url: data.url.trim() })
        .then(onImportSuccess)
        .catch(onImportError);
    } else {
      setErrorMessage('Choose a file or enter a valid URL.');
      setErrorToastOpen(true);
      return;
    }

    setImportOpen(false);
  };

  const handleCreateSelectedEnvironments = async () => {
    setIsCreatingEnvironments(true);
    try {
      const selected = detectedEnvironments.filter(e => selectedEnvIds.has(`${e.name}-${e.baseUrl}`));
      let created = 0;
      let updated = 0;
      for (const env of selected) {
        const result = await environmentService.upsertEnvironment(projectId, {
          name: env.name,
          baseUrl: env.baseUrl,
          description: env.description,
        });
        if (result.action === 'created') created += 1;
        else updated += 1;
      }
      setEnvConfirmOpen(false);
      const parts: string[] = [];
      if (created > 0) parts.push(`${created} created`);
      if (updated > 0) parts.push(`${updated} updated`);
      setSummaryMessage(`✔ Environments synced (${parts.join(', ') || 'no changes'}).`);
      setSummaryToastOpen(true);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to sync environments');
      setErrorToastOpen(true);
    } finally {
      setIsCreatingEnvironments(false);
    }
  };

  const handleSkipEnvironments = () => {
    setEnvConfirmOpen(false);
    setSummaryMessage('Import completed successfully.');
    setSummaryToastOpen(true);
  };

  // Collect all existing APIs for duplicate checking
  const existingApis = React.useMemo(() => {
    return servicesWithOperations.flatMap((s) =>
      s.operations.map((op) => ({
        method: op.method,
        endpointPath: op.path,
      })),
    );
  }, [servicesWithOperations]);

  const existingServiceNames = React.useMemo(() => {
    return services.map((s) => s.name);
  }, [services]);

  const handleAddApi = async (data: AddApiModalData) => {
    let service = services.find((s: Service) => s.name.toLowerCase() === data.serviceName.toLowerCase());

    if (!service) {
      service = await createAsync({
        projectId,
        name: data.serviceName,
        description: data.apiName,
        version: data.version,
      });
    }

    await createOperationAsync({
      serviceId: service!.id,
      name: data.apiName,
      method: data.method,
      path: data.endpointPath,
      description: data.description || 'No description provided',
      authenticationType: data.authentication,
      status: 'Active',
    });

    const updatedService = servicesWithOperations.find((s) => s.id === service!.id);
    if (updatedService) {
      setSelectedService(updatedService);
      setExpandedServices((prev) => new Set(prev).add(updatedService.id));
    }
    setActiveTab('overview');

    setAddApiOpen(false);
    setToastOpen(true);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'request', label: 'Request' },
    { id: 'params', label: 'Params' },
    { id: 'headers', label: 'Headers' },
    { id: 'history', label: 'History' },
  ];

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'POST':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'PUT':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'PATCH':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'DELETE':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      {/* Page Header */}
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>APIs</h1>
          <p className='mt-1 text-sm text-text-secondary'>
            Imported contract endpoints — used to map and run generated tests.
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <Button variant='outline' onClick={() => setImportOpen(true)}>
            <Import className='mr-2 h-4 w-4' />
            Import / Sync APIs
          </Button>
          <Button onClick={() => setAddApiOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            Add API
          </Button>
        </div>
      </div>

      <ApiOnboardingCard
        projectId={projectId}
        onImport={() => setImportOpen(true)}
        hasServices={services.length > 0}
        operationCount={rawOperations?.length ?? 0}
        hasEnvironment={environments.length > 0}
      />

      {/* Search (left) and method filter (right) */}
      <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder='Search services or endpoints...'
          className='w-full sm:max-w-xl lg:max-w-2xl'
        />
        <div className='flex items-center gap-3'>
          <Select
            options={methodFilterOptions}
            value={methodFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMethodFilter(e.target.value)}
            className='h-10 w-full sm:w-44 sm:shrink-0'
          />
          <ApiTryEnvironmentSelect
            projectId={projectId}
            environments={environments}
            value={environmentId}
            onChange={setEnvironmentId}
            isLoading={environmentsLoading}
            compact
          />
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Left Panel - Service Tree */}
        <Card className='lg:col-span-1'>
          <div className='border-b border-border px-4 py-3'>
            <div className='flex items-center justify-between'>
              <h3 className='text-sm font-semibold text-text'>Services</h3>
              <span className='text-xs text-text-secondary'>{services.length}</span>
            </div>
          </div>
          <div className='p-4'>
            {servicesWithOperations.length === 0 ? (
              <div className='py-8 text-center'>
                <FolderOpen className='mx-auto mb-2 h-8 w-8 text-text-secondary' />
                <p className='text-sm text-text-secondary'>No services yet</p>
              </div>
            ) : (
              <FolderView
                services={servicesWithOperations}
                selectedService={selectedService}
                selectedOperation={selectedOperation}
                expandedServices={expandedServices}
                onToggleExpand={handleToggleExpand}
                onServiceClick={handleServiceClick}
                onOperationClick={handleOperationClick}
                onEditService={openEditServiceDialog}
                onDeleteService={openDeleteServiceDialog}
                getMethodColor={getMethodColor}
              />
            )}
          </div>
        </Card>

        {/* Right Panel - Operation Details */}
        <Card className='lg:col-span-2'>
          {selectedOperation ? (
            <div>
              {/* Operation Header */}
              <div className='border-b border-border p-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <Badge className={`${getMethodColor(selectedOperation.method)} font-mono`}>
                      {selectedOperation.method}
                    </Badge>
                    <code className='text-sm font-mono text-text'>{selectedOperation.path}</code>
                    <Badge variant={selectedOperation.status === 'active' ? 'success' : 'secondary'}>
                      {selectedOperation.status}
                    </Badge>
                  </div>
                  <div className='flex flex-wrap items-center justify-end gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      disabled={!selectedEnvironment || !selectedOperation}
                      title={
                        selectedEnvironment
                          ? 'Execution will use the selected environment (coming soon)'
                          : 'Select an environment first'
                      }
                      onClick={() => {
                        if (!selectedEnvironment || !selectedOperation) return;
                        setSummaryToastType('info');
                        setSummaryMessage(
                          `Try It will call ${joinBaseUrlAndPath(selectedEnvironment.baseUrl, selectedOperation.path)} using "${selectedEnvironment.name}" when execution is wired.`,
                        );
                        setSummaryToastOpen(true);
                      }}
                    >
                      <Play className='mr-2 h-4 w-4' />
                      Try It
                    </Button>
                    <Button variant='outline' size='sm' onClick={() => void saveOperationEdit()}>
                      Save
                    </Button>
                    <Button variant='ghost' size='sm'>
                      <MoreVertical className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className='border-b border-border'>
                <div className='flex gap-1 px-4'>
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-text-secondary hover:text-text'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className='p-6'>
                {activeTab === 'overview' && (
                  <div className='space-y-6'>
                    {/* Description */}
                    <div>
                      <h3 className='text-sm font-semibold text-text mb-2'>Description</h3>
                      {operationEditDraft ? (
                        <textarea
                          value={operationEditDraft.description}
                          onChange={(e) => handleOperationDraftChange('description', e.target.value)}
                          className='w-full rounded-lg border border-border bg-surface p-3 text-sm text-text'
                          rows={3}
                        />
                      ) : (
                        <p className='text-sm text-text-secondary'>
                          {selectedOperation.description || 'No description provided.'}
                        </p>
                      )}
                    </div>

                    {/* Tags */}
                    <div>
                      <h3 className='text-sm font-semibold text-text mb-2'>Tags</h3>
                      <div className='flex gap-2'>
                        {(selectedOperation.tags || []).length > 0 ? (
                          (selectedOperation.tags || []).map((tag) => (
                            <Badge key={tag} variant='outline'>{tag}</Badge>
                          ))
                        ) : (
                          <p className='text-sm text-text-secondary'>No tags</p>
                        )}
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <h3 className='text-sm font-semibold text-text mb-1'>Service Name</h3>
                        <p className='text-sm text-text-secondary'>
                          {selectedOperation.serviceName || selectedService?.name}
                        </p>
                      </div>
                      <div>
                        <h3 className='text-sm font-semibold text-text mb-1'>Version</h3>
                        <p className='text-sm text-text-secondary'>
                          {selectedOperation.version || 'v1'}
                        </p>
                      </div>
                      <div>
                        <h3 className='text-sm font-semibold text-text mb-1'>Endpoint Path</h3>
                        {operationEditDraft ? (
                          <input
                            value={operationEditDraft.path}
                            onChange={(e) => handleOperationDraftChange('path', e.target.value)}
                            className='w-full rounded-lg border border-border bg-surface p-2 text-sm font-mono text-text'
                          />
                        ) : (
                          <code className='text-sm text-text-secondary'>{selectedOperation.path}</code>
                        )}
                      </div>
                      <div>
                        <h3 className='text-sm font-semibold text-text mb-1'>Service base URL</h3>
                        <code className='text-sm text-text-secondary break-all'>
                          {selectedService?.baseUrl?.trim() || '—'}
                        </code>
                        <p className='mt-1 text-xs text-text-secondary'>From the API contract (reference only).</p>
                      </div>
                      <div>
                        <h3 className='text-sm font-semibold text-text mb-1'>Full URL</h3>
                        {operationFullUrl ? (
                          <code className='text-sm text-text-secondary break-all'>{operationFullUrl}</code>
                        ) : (
                          <p className='text-sm text-text-secondary'>Select an environment to build the request URL.</p>
                        )}
                      </div>
                      <div>
                        <h3 className='text-sm font-semibold text-text mb-1'>Authentication</h3>
                        {operationEditDraft ? (
                          <input
                            value={operationEditDraft.authenticationType || operationEditDraft.authentication || ''}
                            onChange={(e) => handleOperationDraftChange('authenticationType', e.target.value)}
                            className='w-full rounded-lg border border-border bg-surface p-2 text-sm text-text'
                          />
                        ) : (
                          <p className='text-sm text-text-secondary'>
                            {selectedOperation.authentication || 'None'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'request' && (
                  <div className='space-y-4'>
                    <h3 className='text-sm font-semibold text-text'>Request Body</h3>
                    <RequestBodyEditor
                      value={operationEditDraft ? operationEditDraft.sampleRequestBody : selectedOperation.sampleRequestBody}
                      onChange={(value) => handleOperationDraftChange('sampleRequestBody', value)}
                    />
                    {selectedOperation.requiredRequestBodyFields && selectedOperation.requiredRequestBodyFields.length > 0 && (
                      <div>
                        <h3 className='text-sm font-semibold text-text mb-2'>Required Fields</h3>
                        <div className='flex flex-wrap gap-2'>
                          {selectedOperation.requiredRequestBodyFields.map((field) => (
                            <Badge key={field} variant='outline'>{field}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'params' && (
                  <div className='space-y-4'>
                    <h3 className='text-sm font-semibold text-text'>Params</h3>
                    <div className='rounded-lg border border-border p-4'>
                      <p className='text-sm text-text-secondary'>No parameters defined for this endpoint.</p>
                    </div>
                  </div>
                )}

                {activeTab === 'headers' && (
                  <div className='space-y-4'>
                    <h3 className='text-sm font-semibold text-text'>Headers</h3>
                    <div className='rounded-lg border border-border p-4'>
                      <p className='text-sm text-text-secondary'>No headers defined for this endpoint.</p>
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className='space-y-4'>
                    <h3 className='text-sm font-semibold text-text'>History</h3>
                    <div className='rounded-lg border border-border p-4'>
                      <p className='text-sm text-text-secondary'>No activity yet.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className='flex h-96 items-center justify-center'>
              <p className='text-sm text-text-secondary'>Select an operation to view details</p>
            </div>
          )}
        </Card>
      </div>

      {/* Empty State when no APIs exist */}
      {servicesWithOperations.length === 0 && (
        <div className='mt-8 flex flex-col items-center justify-center py-12 text-center'>
          <div className='mb-4 text-text-secondary'>
            <FolderOpen className='h-12 w-12' />
          </div>
          <h3 className='text-lg font-semibold text-text'>No APIs Found</h3>
          <p className='mt-1 text-sm text-text-secondary max-w-sm'>
            Import an API contract or create your first API manually.
          </p>
          <div className='mt-4 flex gap-2'>
            <Button variant='outline' onClick={() => setImportOpen(true)}>
              <Import className='mr-2 h-4 w-4' />
              Import API Contract
            </Button>
            <Button onClick={() => setAddApiOpen(true)}>
              <Plus className='mr-2 h-4 w-4' />
              Add API
            </Button>
          </div>
        </div>
      )}

      {/* Service Dialog (for edit) */}
      <ServiceDialog open={editOpen} mode='edit' service={editService} onSubmit={handleUpdate} onCancel={() => setEditOpen(false)} />
      <ConfirmDialog
        open={deleteOpen}
        title='Delete service'
        message={
          deleteServiceOperationCount > 0
            ? `Delete "${deleteService?.name}" and all ${deleteServiceOperationCount} operation${deleteServiceOperationCount === 1 ? '' : 's'}? This cannot be undone.`
            : `Delete "${deleteService?.name}"? This cannot be undone.`
        }
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteService(undefined);
        }}
      />

      <ImportApiModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImportApi}
        isImporting={isImporting}
        uploadProgress={uploadProgress}
      />

      <AddApiModal
        open={addApiOpen}
        onClose={() => setAddApiOpen(false)}
        onCreate={handleAddApi}
        existingApis={existingApis}
        existingServiceNames={existingServiceNames}
      />

      <Toast
        message='API created successfully.'
        open={toastOpen}
        onClose={() => setToastOpen(false)}
      />

      {/* Environment Detection Confirmation Dialog */}
      {envConfirmOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <Card className='mx-4 w-full max-w-2xl'>
            <CardHeader>
              <CardTitle>Detected Environments</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <p className='text-sm text-text-secondary'>
                The imported API specification contains server definitions. Select environments to create or update (existing names are replaced).
              </p>
              <div className='max-h-96 overflow-y-auto rounded-lg border border-border'>
                <table className='w-full text-sm'>
                  <thead className='border-b border-border bg-surface'>
                    <tr>
                      <th className='px-4 py-2 text-left'>Select</th>
                      <th className='px-4 py-2 text-left'>Environment Name</th>
                      <th className='px-4 py-2 text-left'>Base URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detectedEnvironments.map((env, idx) => {
                      const envKey = `${env.name}-${env.baseUrl}`;
                      const isSelected = selectedEnvIds.has(envKey);
                      return (
                        <tr key={idx} className='border-b border-border last:border-b-0 hover:bg-surface/50'>
                          <td className='px-4 py-3'>
                            <input
                              type='checkbox'
                              checked={isSelected}
                              onChange={(e) => {
                                setSelectedEnvIds(prev => {
                                  const next = new Set(prev);
                                  if (e.target.checked) {
                                    next.add(envKey);
                                  } else {
                                    next.delete(envKey);
                                  }
                                  return next;
                                });
                              }}
                              className='h-4 w-4 rounded border-border'
                            />
                          </td>
                          <td className='px-4 py-3 font-medium'>{env.name}</td>
                          <td className='px-4 py-3 font-mono text-xs'>{env.baseUrl}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter className='justify-end gap-2'>
              <Button variant='outline' onClick={handleSkipEnvironments} disabled={isCreatingEnvironments}>
                Skip
              </Button>
              <Button onClick={handleCreateSelectedEnvironments} disabled={isCreatingEnvironments || selectedEnvIds.size === 0}>
                Sync Selected ({selectedEnvIds.size})
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Upload progress toast */}
      <Toast
        message={progressMessage || 'Uploading…'}
        open={progressToastOpen}
        onClose={() => setProgressToastOpen(false)}
        duration={0}
        type='info'
      />

      {/* Import summary toast */}
      <Toast
        message={summaryMessage}
        open={summaryToastOpen}
        onClose={() => setSummaryToastOpen(false)}
        duration={10000}
        type={summaryToastType}
      />

      {/* Error toast */}
      <Toast
        message={errorMessage}
        open={errorToastOpen}
        onClose={() => setErrorToastOpen(false)}
        duration={0}
        type='error'
      />
    </div>
  );
};

export default ServiceListPage;
