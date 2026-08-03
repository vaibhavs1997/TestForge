// Knowledge Hub page - foundation for the AI Knowledge Hub
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Sparkles,
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
import { useKnowledgeFlows, useBusinessRules, useRuntimeVariables, useDependencies, useDocumentation } from '../hooks';
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

export interface KnowledgePageProps {}

const SECTION_ICONS = {
  flows: ArrowRightLeft,
  rules: Scale,
  dependencies: Share2,
  variables: Variable,
  documentation: FileText,
};

const SECTION_DESCRIPTIONS: Record<KnowledgeSection, string> = {
  flows: 'Model how the project behaves as ordered sequences of steps.',
  rules: 'Capture business rules that govern system behavior.',
  dependencies: 'Describe how components and tokens depend on each other.',
  variables: 'Track runtime variables such as tokens, IDs, and credentials.',
  documentation: 'Free-form notes and documentation for your team.',
};

const sectionItems = [
  { id: 'flows' as KnowledgeSection, label: 'Business Flows' },
  { id: 'rules' as KnowledgeSection, label: 'Business Rules' },
  { id: 'dependencies' as KnowledgeSection, label: 'Dependencies' },
  { id: 'variables' as KnowledgeSection, label: 'Runtime Variables' },
  { id: 'documentation' as KnowledgeSection, label: 'Documentation' },
];

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
    'Service': 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    'Database': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    'Queue': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    'Cache': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    'External': 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
    'Token': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    'Config': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  };
  return variants[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
};

export const KnowledgePage: React.FC<KnowledgePageProps> = () => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const projectId = routeProjectId || '1';
  const navigate = useNavigate();

  const {
    flows,
    isLoading: flowsLoading,
    isError: flowsError,
    error: flowsErrorObj,
    createAsync: createFlowAsync,
    updateAsync: updateFlowAsync,
    removeAsync: removeFlowAsync,
  } = useKnowledgeFlows(projectId);

  const {
    rules,
    isLoading: rulesLoading,
    isError: rulesError,
    error: rulesErrorObj,
    createAsync: createRuleAsync,
    updateAsync: updateRuleAsync,
    removeAsync: removeRuleAsync,
  } = useBusinessRules(projectId);

  const {
    variables,
    isLoading: variablesLoading,
    isError: variablesError,
    error: variablesErrorObj,
    createAsync: createVariableAsync,
    updateAsync: updateVariableAsync,
    removeAsync: removeVariableAsync,
  } = useRuntimeVariables(projectId);

  const {
    dependencies,
    isLoading: dependenciesLoading,
    isError: dependenciesError,
    error: dependenciesErrorObj,
    createAsync: createDependencyAsync,
    updateAsync: updateDependencyAsync,
    removeAsync: removeDependencyAsync,
  } = useDependencies(projectId);

  const {
    docs,
    isLoading: docsLoading,
    isError: docsError,
    error: docsErrorObj,
    createAsync: createDocAsync,
    updateAsync: updateDocAsync,
    removeAsync: removeDocAsync,
  } = useDocumentation(projectId);

  const [activeSection, setActiveSection] = React.useState<KnowledgeSection>('flows');
  const [search, setSearch] = React.useState('');
  const [flowDialogOpen, setFlowDialogOpen] = React.useState(false);
  const [selectedFlow, setSelectedFlow] = React.useState<KnowledgeFlow | undefined>(undefined);
  const [ruleDialogOpen, setRuleDialogOpen] = React.useState(false);
  const [selectedRule, setSelectedRule] = React.useState<BusinessRule | undefined>(undefined);
  const [variableDialogOpen, setVariableDialogOpen] = React.useState(false);
  const [selectedVariable, setSelectedVariable] = React.useState<RuntimeVariable | undefined>(undefined);
  const [dependencyDialogOpen, setDependencyDialogOpen] = React.useState(false);
  const [selectedDependency, setSelectedDependency] = React.useState<Dependency | undefined>(undefined);
  const [docDialogOpen, setDocDialogOpen] = React.useState(false);
  const [selectedDoc, setSelectedDoc] = React.useState<Documentation | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState<{ type: KnowledgeSection; item: any } | undefined>(undefined);
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState<'success' | 'error'>('success');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleFlowSubmit = async (data: KnowledgeFlowFormData) => {
    setIsSubmitting(true);
    try {
      if (data.id) {
        await updateFlowAsync({ flowId: data.id, ...data });
        setToastMessage('Business Flow updated successfully');
      } else {
        await createFlowAsync(data);
        setToastMessage('Business Flow created successfully');
      }
      setToastType('success');
      setFlowDialogOpen(false);
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to save Business Flow');
      setToastType('error');
    } finally {
      setIsSubmitting(false);
      setToastOpen(true);
    }
  };

  const handleRuleSubmit = async (data: BusinessRuleFormData) => {
    setIsSubmitting(true);
    try {
      if (data.id) {
        await updateRuleAsync({ ruleId: data.id, ...data });
        setToastMessage('Business Rule updated successfully');
      } else {
        await createRuleAsync(data);
        setToastMessage('Business Rule created successfully');
      }
      setToastType('success');
      setRuleDialogOpen(false);
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to save Business Rule');
      setToastType('error');
    } finally {
      setIsSubmitting(false);
      setToastOpen(true);
    }
  };

  const handleVariableSubmit = async (data: RuntimeVariableFormData) => {
    setIsSubmitting(true);
    try {
      if (data.id) {
        await updateVariableAsync({ variableId: data.id, ...data });
        setToastMessage('Runtime Variable updated successfully');
      } else {
        await createVariableAsync(data);
        setToastMessage('Runtime Variable created successfully');
      }
      setToastType('success');
      setVariableDialogOpen(false);
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to save Runtime Variable');
      setToastType('error');
    } finally {
      setIsSubmitting(false);
      setToastOpen(true);
    }
  };

  const handleDependencySubmit = async (data: DependencyFormData) => {
    setIsSubmitting(true);
    try {
      if (data.id) {
        await updateDependencyAsync({ dependencyId: data.id, ...data });
        setToastMessage('Dependency updated successfully');
      } else {
        await createDependencyAsync(data);
        setToastMessage('Dependency created successfully');
      }
      setToastType('success');
      setDependencyDialogOpen(false);
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to save Dependency');
      setToastType('error');
    } finally {
      setIsSubmitting(false);
      setToastOpen(true);
    }
  };

  const handleDocSubmit = async (data: DocumentationFormData) => {
    setIsSubmitting(true);
    try {
      if (data.id) {
        await updateDocAsync({ docId: data.id, ...data });
        setToastMessage('Documentation updated successfully');
      } else {
        await createDocAsync(data);
        setToastMessage('Documentation created successfully');
      }
      setToastType('success');
      setDocDialogOpen(false);
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to save Documentation');
      setToastType('error');
    } finally {
      setIsSubmitting(false);
      setToastOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      const { type, item } = itemToDelete;
      switch (type) {
        case 'flows':
          await removeFlowAsync(item.id);
          setToastMessage('Business Flow deleted successfully');
          break;
        case 'rules':
          await removeRuleAsync(item.id);
          setToastMessage('Business Rule deleted successfully');
          break;
        case 'variables':
          await removeVariableAsync(item.id);
          setToastMessage('Runtime Variable deleted successfully');
          break;
        case 'dependencies':
          await removeDependencyAsync(item.id);
          setToastMessage('Dependency deleted successfully');
          break;
        case 'documentation':
          await removeDocAsync(item.id);
          setToastMessage('Documentation deleted successfully');
          break;
      }
      setToastType('success');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to delete');
      setToastType('error');
    } finally {
      setDeleteOpen(false);
      setItemToDelete(undefined);
      setToastOpen(true);
    }
  };

  const getActiveData = () => {
    switch (activeSection) {
      case 'flows':
        return { data: flows, loading: flowsLoading, error: flowsErrorObj };
      case 'rules':
        return { data: rules, loading: rulesLoading, error: rulesErrorObj };
      case 'variables':
        return { data: variables, loading: variablesLoading, error: variablesErrorObj };
      case 'dependencies':
        return { data: dependencies, loading: dependenciesLoading, error: dependenciesErrorObj };
      case 'documentation':
        return { data: docs, loading: docsLoading, error: docsErrorObj };
    }
  };

  const { data: activeData, loading: activeLoading, error: activeError } = getActiveData();

  const getFilteredData = () => {
    const term = search.trim().toLowerCase();
    if (!term) return activeData;
    return (activeData || []).filter((item: any) => {
      return (
        item.name?.toLowerCase().includes(term) ||
        item.title?.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.tags?.some((tag: string) => tag.toLowerCase().includes(term))
      );
    });
  };

  const filteredData = getFilteredData();

  return (
    <div className='flex min-h-screen'>
      {/* Persistent Left Navigation */}
      <aside className='w-64 flex-shrink-0 border-r border-border bg-surface'>
        <div className='border-b border-border p-4'>
          <h2 className='text-sm font-semibold text-text'>Knowledge Hub</h2>
          <p className='mt-1 text-xs text-text-secondary'>Foundation for AI Knowledge</p>
        </div>
        <nav className='space-y-1 p-3'>
          {sectionItems.map((item) => {
            const Icon = SECTION_ICONS[item.id];
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-surface hover:text-text'
                }`}
              >
                <Icon className='h-4 w-4' />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className='min-w-0 flex-1'>
        <div className='mx-auto max-w-7xl px-6 py-8'>
          {/* Page Header */}
          <div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
            <div>
              <h1 className='text-2xl font-bold text-text'>
                {sectionItems.find((s) => s.id === activeSection)?.label}
              </h1>
              <p className='mt-1 text-sm text-text-secondary'>{SECTION_DESCRIPTIONS[activeSection]}</p>
            </div>
            <div className='flex items-center gap-2'>
              <Button variant='outline' onClick={() => navigate('/analysis')}>
                <Sparkles className='mr-2 h-4 w-4' />
                Analyze Project
              </Button>
              {activeSection === 'flows' && (
                <Button onClick={() => { setSelectedFlow(undefined); setFlowDialogOpen(true); }}>
                  <Plus className='mr-2 h-4 w-4' />
                  Create Business Flow
                </Button>
              )}
              {activeSection === 'rules' && (
                <Button onClick={() => { setSelectedRule(undefined); setRuleDialogOpen(true); }}>
                  <Plus className='mr-2 h-4 w-4' />
                  Add Business Rule
                </Button>
              )}
              {activeSection === 'variables' && (
                <Button onClick={() => { setSelectedVariable(undefined); setVariableDialogOpen(true); }}>
                  <Plus className='mr-2 h-4 w-4' />
                  Add Variable
                </Button>
              )}
              {activeSection === 'dependencies' && (
                <Button onClick={() => { setSelectedDependency(undefined); setDependencyDialogOpen(true); }}>
                  <Plus className='mr-2 h-4 w-4' />
                  Add Dependency
                </Button>
              )}
              {activeSection === 'documentation' && (
                <Button onClick={() => { setSelectedDoc(undefined); setDocDialogOpen(true); }}>
                  <Plus className='mr-2 h-4 w-4' />
                  Add Documentation
                </Button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className='mb-6'>
            <SearchBar value={search} onChange={setSearch} placeholder={`Search ${sectionItems.find((s) => s.id === activeSection)?.label.toLowerCase()}...`} className='sm:w-96' />
          </div>

          {/* Section Content */}
          {activeLoading ? (
            <div className='flex items-center justify-center py-16'>
              <p className='text-sm text-text-secondary'>Loading...</p>
            </div>
          ) : activeError ? (
            <div className='flex items-center justify-center py-16'>
              <p className='text-sm text-error'>Error: {(activeError as any)?.message || 'Unknown error'}</p>
            </div>
          ) : filteredData?.length === 0 ? (
            <EmptyState
              icon={<BookOpen className='h-12 w-12' />}
              title={search ? 'No matches found' : 'No items yet'}
              description={search ? 'Try adjusting your search criteria.' : `Create your first ${sectionItems.find((s) => s.id === activeSection)?.label.toLowerCase()} to get started.`}
              action={search ? undefined : {
                label: `Create ${sectionItems.find((s) => s.id === activeSection)?.label}`,
                onClick: () => {
                  switch (activeSection) {
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
                },
              }}
            />
          ) : (
            <div className='space-y-4'>
              {filteredData?.map((item: any) => (
                <Card key={item.id} className='overflow-hidden'>
                  <div className='flex items-center justify-between p-4'>
                    <div className='min-w-0 flex-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <h3 className='text-sm font-semibold text-text'>{item.name || item.title}</h3>
                        {activeSection === 'flows' && (
                          <Badge className={getStatusBadgeVariant(item.status)} variant='outline'>
                            {item.status}
                          </Badge>
                        )}
                        {activeSection === 'rules' && (
                          <>
                            <Badge className={getSeverityBadgeVariant(item.severity)} variant='outline'>
                              {item.severity}
                            </Badge>
                            <Badge variant={item.isActive ? 'success' : 'secondary'}>
                              {item.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </>
                        )}
                        {activeSection === 'variables' && (
                          <Badge variant='outline'>{item.scope}</Badge>
                        )}
                        {activeSection === 'dependencies' && (
                          <>
                            <Badge className={getDependencyTypeBadgeVariant(item.dependencyType)} variant='outline'>
                              {item.dependencyType}
                            </Badge>
                            {item.isRequired && <Badge variant='secondary'>Required</Badge>}
                          </>
                        )}
                        {activeSection === 'documentation' && (
                          <Badge variant='outline'>{item.category}</Badge>
                        )}
                      </div>
                      <p className='mt-1 line-clamp-1 text-sm text-text-secondary'>{item.description || 'No description'}</p>
                      <div className='mt-1 flex flex-wrap items-center gap-2'>
                        {item.tags?.map((tag: string) => (
                          <Badge key={tag} variant='secondary' className='text-xs'>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className='ml-2 flex flex-shrink-0 items-center gap-1'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => {
                          switch (activeSection) {
                            case 'flows':
                              setSelectedFlow(item);
                              setFlowDialogOpen(true);
                              break;
                            case 'rules':
                              setSelectedRule(item);
                              setRuleDialogOpen(true);
                              break;
                            case 'variables':
                              setSelectedVariable(item);
                              setVariableDialogOpen(true);
                              break;
                            case 'dependencies':
                              setSelectedDependency(item);
                              setDependencyDialogOpen(true);
                              break;
                            case 'documentation':
                              setSelectedDoc(item);
                              setDocDialogOpen(true);
                              break;
                          }
                        }}
                        aria-label='Edit'
                      >
                        <Edit className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => { setItemToDelete({ type: activeSection, item }); setDeleteOpen(true); }}
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
      </div>

      {/* Dialogs */}
      <FlowDialog
        open={flowDialogOpen}
        onClose={() => setFlowDialogOpen(false)}
        onSubmit={handleFlowSubmit}
        flow={selectedFlow ? {
          id: selectedFlow.id,
          projectId: selectedFlow.projectId,
          name: selectedFlow.name,
          description: selectedFlow.description,
          tags: selectedFlow.tags,
          status: selectedFlow.status,
          steps: selectedFlow.steps,
        } : undefined}
        projectId={projectId}
        isSubmitting={isSubmitting}
      />

      <AddArticleModal
        open={docDialogOpen}
        onClose={() => setDocDialogOpen(false)}
        onCreate={handleDocSubmit}
        initialData={selectedDoc ? {
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
        } : undefined}
        isSubmitting={isSubmitting}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete ${sectionItems.find((s) => s.id === activeSection)?.label.slice(0, -1)}`}
        message={`Deleting "${itemToDelete?.item?.name || itemToDelete?.item?.title}" cannot be undone.`}
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={handleDelete}
        onCancel={() => { setDeleteOpen(false); setItemToDelete(undefined); }}
      />

      <Toast
        message={toastMessage}
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        type={toastType}
      />
    </div>
  );
};

export default KnowledgePage;