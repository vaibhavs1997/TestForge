// Knowledge Hub — unified list, type filters, and document import
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRightLeft,
  Scale,
  Share2,
  Variable,
  FileText,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Upload,
  ChevronDown,
  Database,
  Globe,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SearchBar } from '../../../components/shared/SearchBar';
import { Toast } from '../../../components/shared/Toast';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { FlowDialog } from '../components/FlowDialog';
import { AddArticleModal } from '../components/AddArticleModal';
import { RuleDialog } from '../components/RuleDialog';
import { VariableDialog } from '../components/VariableDialog';
import { DependencyDialog } from '../components/DependencyDialog';
import { ImportKnowledgeModal } from '../components/ImportKnowledgeModal';
import { useKnowledgeFlows, useBusinessRules, useRuntimeVariables, useDependencies, useDocumentation } from '../hooks';
import { knowledgeService } from '../services';
import { datasetService } from '../../test-data/services/datasetService';
import { projectStore } from '../../../store/projectStore';
import { toUnifiedItems, type KnowledgeTypeFilter, type UnifiedKnowledgeItem } from '../utils/unifiedKnowledge';
import type {
  KnowledgeSection,
  KnowledgeFlow,
  BusinessRule,
  RuntimeVariable,
  Dependency,
  Documentation,
  KnowledgeFlowFormData,
  BusinessRuleFormData,
  RuntimeVariableFormData,
  DependencyFormData,
  DocumentationFormData,
} from '../types';

const TYPE_CHIPS: { id: KnowledgeTypeFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'all', label: 'All', icon: BookOpen },
  { id: 'flows', label: 'Flows', icon: ArrowRightLeft },
  { id: 'rules', label: 'Rules', icon: Scale },
  { id: 'dependencies', label: 'Dependencies', icon: Share2 },
  { id: 'variables', label: 'Variables', icon: Variable },
  { id: 'documentation', label: 'Docs', icon: FileText },
];

const SECTION_LABELS: Record<KnowledgeSection, string> = {
  flows: 'Business Flow',
  rules: 'Business Rule',
  dependencies: 'Dependency',
  variables: 'Runtime Variable',
  documentation: 'Documentation',
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'Confirmed':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'Deprecated':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    default:
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
  }
};

const getSeverityBadgeVariant = (severity: string) => {
  switch (severity) {
    case 'High':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'Medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'Low':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  }
};

const getDependencyTypeBadgeVariant = (type: string) => {
  const variants: Record<string, string> = {
    Service: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    Database: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-purple-300',
    Queue: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    Cache: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    External: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
    Token: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    Config: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  };
  return variants[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
};

function renderItemMeta(item: UnifiedKnowledgeItem) {
  const raw = item.raw as Record<string, unknown>;
  switch (item.type) {
    case 'flows':
      return (
        <Badge className={getStatusBadgeVariant(String(raw.status))} variant='outline'>
          {String(raw.status)}
        </Badge>
      );
    case 'rules':
      return (
        <>
          <Badge className={getSeverityBadgeVariant(String(raw.severity))} variant='outline'>
            {String(raw.severity)}
          </Badge>
          <Badge variant={raw.isActive ? 'success' : 'secondary'}>
            {raw.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </>
      );
    case 'variables':
      return <Badge variant='outline'>{String(raw.scope)}</Badge>;
    case 'dependencies':
      return (
        <>
          <Badge className={getDependencyTypeBadgeVariant(String(raw.dependencyType))} variant='outline'>
            {String(raw.dependencyType)}
          </Badge>
          {raw.isRequired ? <Badge variant='secondary'>Required</Badge> : null}
        </>
      );
    case 'documentation':
      return (
        <>
          <Badge variant='outline'>{String(raw.category || 'General')}</Badge>
          {Array.isArray(raw.linkedApiOperationIds) && raw.linkedApiOperationIds.length > 0 ? (
            <Badge variant='secondary'>{raw.linkedApiOperationIds.length} API link{raw.linkedApiOperationIds.length === 1 ? '' : 's'}</Badge>
          ) : null}
        </>
      );
    default:
      return null;
  }
}

export const KnowledgePage: React.FC = () => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const selectedProjectId = projectStore((state) => state.selectedProjectId);
  const projectId = routeProjectId ?? selectedProjectId ?? '';
  const queryClient = useQueryClient();
  const [workspaceStats, setWorkspaceStats] = React.useState({ importedApis: 0, datasets: 0 });

  const flowHooks = useKnowledgeFlows(projectId);
  const ruleHooks = useBusinessRules(projectId);
  const variableHooks = useRuntimeVariables(projectId);
  const dependencyHooks = useDependencies(projectId);
  const docHooks = useDocumentation(projectId);

  const { flows, isLoading: flowsLoading, isError: flowsError, error: flowsErrorObj } = flowHooks;
  const { rules, isLoading: rulesLoading, isError: rulesError, error: rulesErrorObj } = ruleHooks;
  const { variables, isLoading: variablesLoading, isError: variablesError, error: variablesErrorObj } = variableHooks;
  const { dependencies, isLoading: dependenciesLoading, isError: dependenciesError, error: dependenciesErrorObj } = dependencyHooks;
  const { docs, isLoading: docsLoading, isError: docsError, error: docsErrorObj } = docHooks;

  const isLoading = flowsLoading || rulesLoading || variablesLoading || dependenciesLoading || docsLoading;
  const hasError = flowsError || rulesError || variablesError || dependenciesError || docsError;
  const firstError = flowsErrorObj || rulesErrorObj || variablesErrorObj || dependenciesErrorObj || docsErrorObj;

  const [typeFilter, setTypeFilter] = React.useState<KnowledgeTypeFilter>('all');
  const [search, setSearch] = React.useState('');
  const [addMenuOpen, setAddMenuOpen] = React.useState(false);
  const addMenuRef = React.useRef<HTMLDivElement>(null);

  const [importOpen, setImportOpen] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);

  const [flowDialogOpen, setFlowDialogOpen] = React.useState(false);
  const [selectedFlow, setSelectedFlow] = React.useState<KnowledgeFlow | undefined>();
  const [ruleDialogOpen, setRuleDialogOpen] = React.useState(false);
  const [selectedRule, setSelectedRule] = React.useState<BusinessRule | undefined>();
  const [variableDialogOpen, setVariableDialogOpen] = React.useState(false);
  const [selectedVariable, setSelectedVariable] = React.useState<RuntimeVariable | undefined>();
  const [dependencyDialogOpen, setDependencyDialogOpen] = React.useState(false);
  const [selectedDependency, setSelectedDependency] = React.useState<Dependency | undefined>();
  const [docDialogOpen, setDocDialogOpen] = React.useState(false);
  const [selectedDoc, setSelectedDoc] = React.useState<Documentation | undefined>();

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<UnifiedKnowledgeItem | undefined>();
  const [deleteAllOpen, setDeleteAllOpen] = React.useState(false);
  const [isDeletingAll, setIsDeletingAll] = React.useState(false);
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState<'success' | 'error'>('success');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    const importsKey = `testforge:api-workspace:imports:project:${projectId}`;
    const loadWorkspaceStats = async () => {
      let importedApis = 0;
      try {
        const raw = localStorage.getItem(importsKey);
        const artifacts = raw ? JSON.parse(raw) as Array<{ kind: string; endpoints?: unknown[] }> : [];
        importedApis = artifacts.filter((artifact) => artifact.kind === 'api').reduce((count, artifact) => count + (artifact.endpoints?.length || 0), 0);
      } catch { importedApis = 0; }
      try {
        const datasets = await datasetService.listDatasets(projectId);
        if (!cancelled) setWorkspaceStats({ importedApis, datasets: datasets.length });
      } catch {
        if (!cancelled) setWorkspaceStats({ importedApis, datasets: 0 });
      }
    };
    void loadWorkspaceStats();
    return () => { cancelled = true; };
  }, [projectId]);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const allItems = React.useMemo(
    () => toUnifiedItems({ flows, rules, variables, dependencies, docs }),
    [flows, rules, variables, dependencies, docs]
  );

  const counts = React.useMemo(
    () => ({
      all: allItems.length,
      flows: flows.length,
      rules: rules.length,
      dependencies: dependencies.length,
      variables: variables.length,
      documentation: docs.length,
    }),
    [allItems.length, flows.length, rules.length, dependencies.length, variables.length, docs.length]
  );

  const filteredItems = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (!term) return true;
      return (
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        ((item.raw as { tags?: string[] }).tags?.some((tag) => tag.toLowerCase().includes(term)) ?? false)
      );
    });
  }, [allItems, typeFilter, search]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message);
    setToastType(type);
    setToastOpen(true);
  };

  const invalidateKnowledge = () => {
    queryClient.invalidateQueries({ queryKey: ['knowledge', projectId] });
  };

  const handleImport = async (files: File[]) => {
    setIsImporting(true);
    try {
      const result = await knowledgeService.importDocuments(projectId, files);
      invalidateKnowledge();
      const total =
        result.created.flows +
        result.created.rules +
        result.created.variables +
        result.created.dependencies +
        result.created.documentation;
      if (total === 0 && result.errors.length > 0) {
        showToast(result.errors.slice(0, 3).join(' · ') || 'Import failed', 'error');
      } else if (result.errors.length > 0) {
        showToast(
          `Imported ${total} item(s) from ${result.filesProcessed} file(s); ${result.errors.length} warning(s)`,
          'success'
        );
        setImportOpen(false);
      } else {
        showToast(`Imported ${total} item(s) from ${result.filesProcessed} file(s)`, 'success');
        setImportOpen(false);
      }
    } catch (e: any) {
      showToast(e?.response?.data?.message || e?.message || 'Import failed', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const openCreate = (section: KnowledgeSection) => {
    setAddMenuOpen(false);
    switch (section) {
      case 'flows':
        setSelectedFlow(undefined);
        setFlowDialogOpen(true);
        break;
      case 'rules':
        setSelectedRule(undefined);
        setRuleDialogOpen(true);
        break;
      case 'variables':
        setSelectedVariable(undefined);
        setVariableDialogOpen(true);
        break;
      case 'dependencies':
        setSelectedDependency(undefined);
        setDependencyDialogOpen(true);
        break;
      case 'documentation':
        setSelectedDoc(undefined);
        setDocDialogOpen(true);
        break;
    }
  };

  const openEdit = (item: UnifiedKnowledgeItem) => {
    switch (item.type) {
      case 'flows':
        setSelectedFlow(item.raw as KnowledgeFlow);
        setFlowDialogOpen(true);
        break;
      case 'rules':
        setSelectedRule(item.raw as BusinessRule);
        setRuleDialogOpen(true);
        break;
      case 'variables':
        setSelectedVariable(item.raw as RuntimeVariable);
        setVariableDialogOpen(true);
        break;
      case 'dependencies':
        setSelectedDependency(item.raw as Dependency);
        setDependencyDialogOpen(true);
        break;
      case 'documentation':
        setSelectedDoc(item.raw as Documentation);
        setDocDialogOpen(true);
        break;
    }
  };

  const handleFlowSubmit = async (data: KnowledgeFlowFormData) => {
    setIsSubmitting(true);
    try {
      if (data.id) await flowHooks.updateAsync({ flowId: data.id, ...data });
      else await flowHooks.createAsync(data);
      showToast(data.id ? 'Business Flow updated' : 'Business Flow created', 'success');
      setFlowDialogOpen(false);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save flow', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRuleSubmit = async (data: BusinessRuleFormData) => {
    setIsSubmitting(true);
    try {
      if (data.id) await ruleHooks.updateAsync({ ruleId: data.id, ...data });
      else await ruleHooks.createAsync(data);
      showToast(data.id ? 'Business Rule updated' : 'Business Rule created', 'success');
      setRuleDialogOpen(false);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save rule', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVariableSubmit = async (data: RuntimeVariableFormData) => {
    setIsSubmitting(true);
    try {
      if (data.id) await variableHooks.updateAsync({ variableId: data.id, ...data });
      else await variableHooks.createAsync(data);
      showToast(data.id ? 'Variable updated' : 'Variable created', 'success');
      setVariableDialogOpen(false);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save variable', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDependencySubmit = async (data: DependencyFormData) => {
    setIsSubmitting(true);
    try {
      if (data.id) await dependencyHooks.updateAsync({ dependencyId: data.id, ...data });
      else await dependencyHooks.createAsync(data);
      showToast(data.id ? 'Dependency updated' : 'Dependency created', 'success');
      setDependencyDialogOpen(false);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save dependency', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDocSubmit = async (data: DocumentationFormData) => {
    setIsSubmitting(true);
    try {
      if (data.id) await docHooks.updateAsync({ docId: data.id, ...data });
      else await docHooks.createAsync(data);
      showToast(data.id ? 'Documentation updated' : 'Documentation created', 'success');
      setDocDialogOpen(false);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save documentation', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      switch (itemToDelete.type) {
        case 'flows':
          await flowHooks.removeAsync(itemToDelete.id);
          break;
        case 'rules':
          await ruleHooks.removeAsync(itemToDelete.id);
          break;
        case 'variables':
          await variableHooks.removeAsync(itemToDelete.id);
          break;
        case 'dependencies':
          await dependencyHooks.removeAsync(itemToDelete.id);
          break;
        case 'documentation':
          await docHooks.removeAsync(itemToDelete.id);
          break;
      }
      showToast('Deleted successfully', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to delete', 'error');
    } finally {
      setDeleteOpen(false);
      setItemToDelete(undefined);
    }
  };

  const handleDeleteAll = async () => {
    if (allItems.length === 0) {
      setDeleteAllOpen(false);
      return;
    }

    setIsDeletingAll(true);
    try {
      // Delete sequentially so concurrent repository writes cannot overwrite one another.
      for (const item of flows) await flowHooks.removeAsync(item.id);
      for (const item of rules) await ruleHooks.removeAsync(item.id);
      for (const item of variables) await variableHooks.removeAsync(item.id);
      for (const item of dependencies) await dependencyHooks.removeAsync(item.id);
      for (const item of docs) await docHooks.removeAsync(item.id);

      invalidateKnowledge();
      setTypeFilter('all');
      setSearch('');
      showToast('All knowledge deleted', 'success');
    } catch (err: any) {
      invalidateKnowledge();
      showToast(err?.response?.data?.message || err?.message || 'Failed to delete all knowledge', 'error');
    } finally {
      setIsDeletingAll(false);
      setDeleteAllOpen(false);
    }
  };

  const primaryCreateSection: KnowledgeSection | null =
    typeFilter !== 'all' ? typeFilter : null;

  if (!projectId) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16 text-center text-text-secondary">
        Open a project to manage project knowledge.
      </div>
    );
  }

  return (
    <div className='min-h-screen'>
      <div className='mx-auto max-w-7xl px-6 py-8'>
        <div className='mb-6 flex flex-wrap items-start justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold text-text'>Knowledge</h1>
            <p className='mt-1 max-w-2xl text-sm text-text-secondary'>
              Upload documentation, tag it, and connect it to the API and Test Data workspace.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Button variant='outline' onClick={() => setImportOpen(true)}>
              <Upload className='mr-2 h-4 w-4' />
              Import
            </Button>
            {primaryCreateSection ? (
              <Button onClick={() => openCreate(primaryCreateSection)}>
                <Plus className='mr-2 h-4 w-4' />
                Add {SECTION_LABELS[primaryCreateSection]}
              </Button>
            ) : (
              <div className='relative' ref={addMenuRef}>
                <Button onClick={() => setAddMenuOpen((v) => !v)}>
                  <Plus className='mr-2 h-4 w-4' />
                  Add
                  <ChevronDown className='ml-1 h-4 w-4' />
                </Button>
                {addMenuOpen && (
                  <div className='absolute right-0 z-20 mt-1 w-52 rounded-lg border border-border bg-surface py-1 shadow-lg'>
                    {(TYPE_CHIPS.filter((c) => c.id !== 'all') as { id: KnowledgeSection; label: string }[]).map((chip) => (
                      <button
                        key={chip.id}
                        type='button'
                        className='flex w-full px-3 py-2 text-left text-sm text-text hover:bg-primary/10'
                        onClick={() => openCreate(chip.id)}
                      >
                        {SECTION_LABELS[chip.id]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className='mb-6 grid gap-3 sm:grid-cols-3'>
          <div className='rounded-lg border border-border bg-surface p-4'><div className='flex items-center gap-2 text-xs font-medium text-text-secondary'><Globe className='h-4 w-4' /> API endpoints</div><p className='mt-2 text-2xl font-semibold text-text'>{workspaceStats.importedApis}</p><p className='mt-1 text-xs text-text-secondary'>Imported in the API workspace</p></div>
          <div className='rounded-lg border border-border bg-surface p-4'><div className='flex items-center gap-2 text-xs font-medium text-text-secondary'><Database className='h-4 w-4' /> Test data datasets</div><p className='mt-2 text-2xl font-semibold text-text'>{workspaceStats.datasets}</p><p className='mt-1 text-xs text-text-secondary'>Available for endpoint workflows</p></div>
          <div className='rounded-lg border border-border bg-surface p-4'><div className='flex items-center gap-2 text-xs font-medium text-text-secondary'><BookOpen className='h-4 w-4' /> Knowledge items</div><p className='mt-2 text-2xl font-semibold text-text'>{allItems.length}</p><p className='mt-1 text-xs text-text-secondary'>Persisted project context</p></div>
        </div>

        <div className='mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'>
          {TYPE_CHIPS.map((chip) => {
            const Icon = chip.icon;
            const count = counts[chip.id];
            const active = typeFilter === chip.id;
            return (
              <button
                key={chip.id}
                type='button'
                onClick={() => setTypeFilter(chip.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  active ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:border-primary/50'
                }`}
              >
                <div className='flex items-center gap-2 text-xs font-medium text-text-secondary'>
                  <Icon className='h-3.5 w-3.5' />
                  {chip.label}
                </div>
                <p className='mt-1 text-xl font-semibold text-text'>{count}</p>
              </button>
            );
          })}
        </div>

        <div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder='Search all knowledge…'
            className='sm:max-w-md'
          />
          <Button
            type='button'
            variant='destructive'
            onClick={() => setDeleteAllOpen(true)}
            disabled={allItems.length === 0 || isDeletingAll}
          >
            <Trash2 className='mr-2 h-4 w-4' />
            Delete all
          </Button>
        </div>

        {isLoading ? (
          <div className='flex justify-center py-16'>
            <p className='text-sm text-text-secondary'>Loading knowledge…</p>
          </div>
        ) : hasError ? (
          <div className='flex justify-center py-16'>
            <p className='text-sm text-error'>Error: {(firstError as Error)?.message || 'Unknown error'}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={<BookOpen className='h-12 w-12' />}
            title={search ? 'No matches' : 'No knowledge yet'}
            description={
              search
                ? 'Try a different search or clear the type filter.'
                : 'Optional: document flows and business rules for richer AI test ideas. Not required for the main import → requirement → run path.'
            }
            action={
              search
                ? undefined
                : {
                    label: 'Import knowledge',
                    onClick: () => setImportOpen(true),
                  }
            }
          />
        ) : (
          <div className='space-y-3'>
            {filteredItems.map((item) => (
              <Card key={`${item.type}-${item.id}`} className='overflow-hidden'>
                <div className='flex items-center justify-between gap-3 p-4'>
                  <div className='min-w-0 flex-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Badge variant='secondary' className='text-xs'>
                        {item.typeLabel}
                      </Badge>
                      <h3 className='text-sm font-semibold text-text'>{item.title}</h3>
                      {renderItemMeta(item)}
                    </div>
                    <p className='mt-1 line-clamp-2 text-sm text-text-secondary'>
                      {item.description || 'No description'}
                    </p>
                  </div>
                  <div className='flex shrink-0 items-center gap-1'>
                    <Button variant='ghost' size='sm' onClick={() => openEdit(item)} aria-label='Edit'>
                      <Edit className='h-4 w-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => {
                        setItemToDelete(item);
                        setDeleteOpen(true);
                      }}
                      aria-label='Delete'
                    >
                      <Trash2 className='h-4 w-4 text-error' />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ImportKnowledgeModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
        isImporting={isImporting}
      />

      <FlowDialog
        open={flowDialogOpen}
        onClose={() => setFlowDialogOpen(false)}
        onSubmit={handleFlowSubmit}
        flow={
          selectedFlow
            ? {
                id: selectedFlow.id,
                projectId: selectedFlow.projectId,
                name: selectedFlow.name,
                description: selectedFlow.description,
                tags: selectedFlow.tags,
                status: selectedFlow.status,
                steps: selectedFlow.steps,
              }
            : undefined
        }
        projectId={projectId}
        isSubmitting={isSubmitting}
      />

      <RuleDialog
        open={ruleDialogOpen}
        onClose={() => setRuleDialogOpen(false)}
        onSubmit={handleRuleSubmit}
        rule={
          selectedRule
            ? {
                id: selectedRule.id,
                projectId: selectedRule.projectId,
                name: selectedRule.name,
                description: selectedRule.description,
                ruleType: selectedRule.ruleType,
                condition: selectedRule.condition,
                expectedOutcome: selectedRule.expectedOutcome,
                severity: selectedRule.severity,
                linkedApiOperationIds: selectedRule.linkedApiOperationIds,
                linkedRequirementIds: selectedRule.linkedRequirementIds,
                tags: selectedRule.tags,
                isActive: selectedRule.isActive,
              }
            : undefined
        }
        projectId={projectId}
        isSubmitting={isSubmitting}
      />

      <VariableDialog
        open={variableDialogOpen}
        onClose={() => setVariableDialogOpen(false)}
        onSubmit={handleVariableSubmit}
        variable={
          selectedVariable
            ? {
                id: selectedVariable.id,
                projectId: selectedVariable.projectId,
                name: selectedVariable.name,
                description: selectedVariable.description,
                scope: selectedVariable.scope,
                defaultValue: selectedVariable.defaultValue,
                isSensitive: selectedVariable.isSensitive,
                linkedApiOperationIds: selectedVariable.linkedApiOperationIds,
                linkedRequirementIds: selectedVariable.linkedRequirementIds,
                tags: selectedVariable.tags,
              }
            : undefined
        }
        projectId={projectId}
        isSubmitting={isSubmitting}
      />

      <DependencyDialog
        open={dependencyDialogOpen}
        onClose={() => setDependencyDialogOpen(false)}
        onSubmit={handleDependencySubmit}
        dependency={
          selectedDependency
            ? {
                id: selectedDependency.id,
                projectId: selectedDependency.projectId,
                name: selectedDependency.name,
                description: selectedDependency.description,
                dependencyType: selectedDependency.dependencyType,
                target: selectedDependency.target,
                version: selectedDependency.version,
                isRequired: selectedDependency.isRequired,
                linkedApiOperationIds: selectedDependency.linkedApiOperationIds,
                linkedRequirementIds: selectedDependency.linkedRequirementIds,
                tags: selectedDependency.tags,
              }
            : undefined
        }
        projectId={projectId}
        isSubmitting={isSubmitting}
      />

      <AddArticleModal
        open={docDialogOpen}
        onClose={() => setDocDialogOpen(false)}
        onCreate={handleDocSubmit}
        initialData={
          selectedDoc
            ? {
                id: selectedDoc.id,
                projectId: selectedDoc.projectId,
                title: selectedDoc.title,
                content: selectedDoc.content,
                category: selectedDoc.category,
                tags: selectedDoc.tags,
                linkedApiOperationIds: selectedDoc.linkedApiOperationIds,
                linkedRequirementIds: selectedDoc.linkedRequirementIds,
                author: selectedDoc.author,
                version: selectedDoc.version,
              }
            : undefined
        }
        isSubmitting={isSubmitting}
      />

      <ConfirmDialog
        open={deleteOpen}
        title='Delete knowledge item'
        message={`Delete "${itemToDelete?.title}"? This cannot be undone.`}
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteOpen(false);
          setItemToDelete(undefined);
        }}
      />

      <ConfirmDialog
        open={deleteAllOpen}
        title='Delete all knowledge?'
        message={`This will permanently delete all ${allItems.length} knowledge item${allItems.length === 1 ? '' : 's'} from this project.`}
        confirmLabel='Delete all'
        cancelLabel='Keep knowledge'
        variant='destructive'
        isLoading={isDeletingAll}
        onConfirm={handleDeleteAll}
        onCancel={() => {
          if (!isDeletingAll) setDeleteAllOpen(false);
        }}
      />

      <Toast message={toastMessage} open={toastOpen} onClose={() => setToastOpen(false)} type={toastType} />
    </div>
  );
};

export default KnowledgePage;
