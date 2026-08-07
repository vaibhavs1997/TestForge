// External libraries
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { useSuites } from '../hooks';
import { projectStore } from '../../../store/projectStore';
import { WorkflowOptionalBanner } from '../../../components/shared/WorkflowOptionalBanner';
import type { TestSuite, TestSuiteFormData, SuiteExecutionPolicy, SuiteStatus } from '../types';
import { FlaskConical, Plus, Copy, Archive, Trash2, GripVertical, ChevronUp, ChevronDown, Clock, Layers } from 'lucide-react';

// Styles

export interface SuitePageProps {}

export const SuitePage: React.FC<SuitePageProps> = () => {
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const selectedProjectId = projectStore((state) => state.selectedProjectId);
  const projectId = routeProjectId ?? selectedProjectId ?? '1';
  const { suites, isLoading, create, update, remove, addExecutionPlan, removeExecutionPlan, reorderExecutionPlans } = useSuites(projectId);

  const [search, setSearch] = React.useState('');
  const [selectedSuite, setSelectedSuite] = React.useState<TestSuite | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteSuite, setDeleteSuite] = React.useState<TestSuite | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [newSuiteName, setNewSuiteName] = React.useState('');
  const [newSuiteDescription, setNewSuiteDescription] = React.useState('');
  const [newSuiteTags, setNewSuiteTags] = React.useState('');
  const [newSuitePolicy, setNewSuitePolicy] = React.useState<SuiteExecutionPolicy>('Sequential');
  const [newSuiteStatus, setNewSuiteStatus] = React.useState<SuiteStatus>('Draft');
  const [newExecutionPlanId, setNewExecutionPlanId] = React.useState('');

  React.useEffect(() => {
    if (suites.length > 0 && !selectedSuite) {
      setSelectedSuite(suites[0]);
    }
  }, [suites, selectedSuite]);

  const filteredSuites = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return suites.filter((suite) => {
      const matchesSearch =
        !term ||
        suite.name.toLowerCase().includes(term) ||
        suite.description.toLowerCase().includes(term) ||
        suite.tags.some(tag => tag.name.toLowerCase().includes(term));
      return matchesSearch;
    });
  }, [search, suites]);

  const getStatusBadge = (status: SuiteStatus) => {
    const variants: Record<SuiteStatus, 'success' | 'warning' | 'secondary'> = {
      'Active': 'success',
      'Draft': 'secondary',
      'Archived': 'warning',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getPolicyBadge = (policy: SuiteExecutionPolicy) => {
    return <Badge variant='outline'>{policy}</Badge>;
  };

  const handleCreateSuite = () => {
    if (!newSuiteName.trim()) return;
    const tags = newSuiteTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
      .map((name, index) => ({ id: `tag-${Date.now()}-${index}`, name }));

    const payload: TestSuiteFormData = {
      name: newSuiteName,
      description: newSuiteDescription,
      tags,
      executionPlans: [],
      defaultEnvironmentId: '',
      executionPolicy: newSuitePolicy,
      estimatedDuration: 0,
      status: newSuiteStatus,
    };

    create({ projectId, ...payload });
    setNewSuiteName('');
    setNewSuiteDescription('');
    setNewSuiteTags('');
    setNewSuitePolicy('Sequential');
    setNewSuiteStatus('Draft');
    setCreateOpen(false);
  };

  const handleDuplicateSuite = (suite: TestSuite) => {
    const payload: TestSuiteFormData = {
      name: `${suite.name} (Copy)`,
      description: suite.description,
      tags: suite.tags.map(t => ({ ...t, id: `tag-${Date.now()}-${t.name}` })),
      executionPlans: suite.executionPlans.map(item => ({ ...item })),
      defaultEnvironmentId: suite.defaultEnvironmentId,
      executionPolicy: suite.executionPolicy,
      estimatedDuration: suite.estimatedDuration,
      status: 'Draft',
    };
    create({ projectId, ...payload });
  };

  const handleArchiveSuite = (suite: TestSuite) => {
    update({ projectId, suiteId: suite.id, status: 'Archived' });
  };

  const handleDeleteSuite = () => {
    if (!deleteSuite) return;
    remove({ projectId, suiteId: deleteSuite.id });
    setDeleteOpen(false);
    setDeleteSuite(undefined);
    if (selectedSuite?.id === deleteSuite.id) {
      setSelectedSuite(null);
    }
  };

  const handleAddExecutionPlan = (suite: TestSuite) => {
    if (!newExecutionPlanId.trim()) return;
    addExecutionPlan({ projectId, suiteId: suite.id, executionPlanId: newExecutionPlanId });
    setNewExecutionPlanId('');
  };

  const handleRemoveExecutionPlan = (suite: TestSuite, executionPlanId: string) => {
    removeExecutionPlan({ projectId, suiteId: suite.id, executionPlanId });
  };

  const handleMovePlan = (suite: TestSuite, index: number, direction: 'up' | 'down') => {
    const plans = [...suite.executionPlans].sort((a, b) => a.order - b.order);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= plans.length) return;

    const [moved] = plans.splice(index, 1);
    plans.splice(targetIndex, 0, moved);
    const orderedPlanIds = plans.map(p => p.executionPlanId);
    reorderExecutionPlans({ projectId, suiteId: suite.id, orderedPlanIds });
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'Not estimated';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      <WorkflowOptionalBanner
        projectId={projectId}
        description="Suites group execution plans for batch or scheduled runs. Running from Requirements → Run tests does not require a suite."
        primaryLink={{
          label: 'Run tests',
          path: `/projects/${projectId}/execution`,
        }}
      />

      {/* Page Header */}
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Test suites</h1>
          <p className='mt-1 text-sm text-text-secondary'>
            Optional: bundle execution plans for CI or the scheduler.
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <SearchBar value={search} onChange={setSearch} placeholder='Search test suites...' className='sm:w-80' />
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            Create Suite
          </Button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Left Panel - Test Suites List */}
        <Card className='lg:col-span-2'>
          <CardContent className='p-0'>
            {isLoading ? (
              <div className='p-8 text-center text-text-secondary'>Loading suites...</div>
            ) : filteredSuites.length === 0 ? (
              <EmptyState
                icon={<FlaskConical className='h-12 w-12' />}
                title={search ? 'No matching suites' : 'No test suites yet'}
                description={search ? 'Try adjusting your search criteria.' : 'Create a suite when you need to run many plans together or on a schedule.'}
                action={search ? undefined : { label: 'Create suite', onClick: () => setCreateOpen(true) }}
                secondaryAction={
                  search
                    ? undefined
                    : {
                        label: 'Go to requirements',
                        onClick: () => navigate(`/projects/${projectId}/requirements`),
                      }
                }
              />
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead className='border-b border-border'>
                    <tr className='text-left text-sm text-text-secondary'>
                      <th className='px-4 py-3 font-medium'>Suite Name</th>
                      <th className='px-4 py-3 font-medium'>Description</th>
                      <th className='px-4 py-3 font-medium'>Tags</th>
                      <th className='px-4 py-3 font-medium'>Plans</th>
                      <th className='px-4 py-3 font-medium'>Policy</th>
                      <th className='px-4 py-3 font-medium'>Status</th>
                      <th className='px-4 py-3 font-medium'></th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-border'>
                    {filteredSuites.map((suite) => (
                      <tr
                        key={suite.id}
                        className={`hover:bg-surface transition-colors cursor-pointer ${
                          selectedSuite?.id === suite.id ? 'bg-surface' : ''
                        }`}
                        onClick={() => setSelectedSuite(suite)}
                      >
                        <td className='px-4 py-4'>
                          <div className='flex items-center gap-3'>
                            <div className='h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center'>
                              <FlaskConical className='h-4 w-4 text-purple-600' />
                            </div>
                            <div className='font-medium text-text'>{suite.name}</div>
                          </div>
                        </td>
                        <td className='px-4 py-4'>
                          <div className='text-sm text-text-secondary line-clamp-1'>{suite.description || '—'}</div>
                        </td>
                        <td className='px-4 py-4'>
                          <div className='flex gap-1'>
                            {suite.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag.id} variant='outline' className='text-xs'>{tag.name}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className='px-4 py-4 text-sm text-text-secondary'>{suite.executionPlans.length}</td>
                        <td className='px-4 py-4'>{getPolicyBadge(suite.executionPolicy)}</td>
                        <td className='px-4 py-4'>{getStatusBadge(suite.status)}</td>
                        <td className='px-4 py-4'>
                          <div className='flex items-center gap-1' onClick={(e) => e.stopPropagation()}>
                            <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => handleDuplicateSuite(suite)} title='Duplicate'>
                              <Copy className='h-4 w-4' />
                            </Button>
                            <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => handleArchiveSuite(suite)} title='Archive'>
                              <Archive className='h-4 w-4' />
                            </Button>
                            <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => { setDeleteSuite(suite); setDeleteOpen(true); }} title='Delete'>
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel - Suite Details */}
        {selectedSuite && (
          <Card className='lg:col-span-1'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-base'>Suite Details</CardTitle>
                {getStatusBadge(selectedSuite.status)}
              </div>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* Suite Info */}
              <div>
                <h3 className='text-lg font-semibold text-text'>{selectedSuite.name}</h3>
                <p className='text-sm text-text-secondary mt-1'>{selectedSuite.description || 'No description'}</p>
              </div>

              {/* Key Information */}
              <div>
                <h4 className='text-sm font-semibold text-text mb-3'>Key Information</h4>
                <div className='space-y-2'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-text-secondary'>Suite ID</span>
                    <span className='font-medium text-text'>{selectedSuite.id}</span>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-text-secondary'>Tags</span>
                    <div className='flex gap-1'>
                      {selectedSuite.tags.length > 0 ? selectedSuite.tags.map((tag) => (
                        <Badge key={tag.id} variant='outline' className='text-xs'>{tag.name}</Badge>
                      )) : <span className='text-text-secondary'>—</span>}
                    </div>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-text-secondary'>Execution Policy</span>
                    {getPolicyBadge(selectedSuite.executionPolicy)}
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-text-secondary'>Default Environment</span>
                    <span className='font-medium text-text'>{selectedSuite.defaultEnvironmentId || '—'}</span>
                  </div>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-text-secondary'>Estimated Duration</span>
                    <span className='font-medium text-text flex items-center gap-1'>
                      <Clock className='h-3 w-3' />
                      {formatDuration(selectedSuite.estimatedDuration)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Execution Plans */}
              <div>
                <h4 className='text-sm font-semibold text-text mb-3 flex items-center gap-2'>
                  <Layers className='h-4 w-4' />
                  Execution Plans ({selectedSuite.executionPlans.length})
                </h4>
                <div className='space-y-2'>
                  {selectedSuite.executionPlans.length === 0 ? (
                    <p className='text-sm text-text-secondary'>No execution plans added yet.</p>
                  ) : (
                    [...selectedSuite.executionPlans]
                      .sort((a, b) => a.order - b.order)
                      .map((plan, index) => (
                        <div key={plan.executionPlanId} className='flex items-center justify-between rounded-lg border border-border p-2'>
                          <div className='flex items-center gap-2'>
                            <GripVertical className='h-4 w-4 text-text-secondary' />
                            <span className='text-sm font-medium text-text'>{index + 1}. {plan.executionPlanId}</span>
                          </div>
                          <div className='flex items-center gap-1'>
                            <Button variant='ghost' size='sm' className='h-6 w-6 p-0' onClick={() => handleMovePlan(selectedSuite, index, 'up')} disabled={index === 0}>
                              <ChevronUp className='h-3 w-3' />
                            </Button>
                            <Button variant='ghost' size='sm' className='h-6 w-6 p-0' onClick={() => handleMovePlan(selectedSuite, index, 'down')} disabled={index === selectedSuite.executionPlans.length - 1}>
                              <ChevronDown className='h-3 w-3' />
                            </Button>
                            <Button variant='ghost' size='sm' className='h-6 w-6 p-0' onClick={() => handleRemoveExecutionPlan(selectedSuite, plan.executionPlanId)}>
                              <Trash2 className='h-3 w-3' />
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
                <div className='mt-3 flex gap-2'>
                  <input
                    value={newExecutionPlanId}
                    onChange={(e) => setNewExecutionPlanId(e.target.value)}
                    placeholder='Execution Plan ID'
                    className='flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text'
                  />
                  <Button size='sm' variant='outline' onClick={() => handleAddExecutionPlan(selectedSuite)}>
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Suite Modal */}
      {createOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <Card className='w-full max-w-lg'>
            <CardHeader>
              <CardTitle>Create Test Suite</CardTitle>
              <CardDescription>Create a reusable collection of execution plans.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <label className='text-sm font-medium text-text'>Name *</label>
                <input
                  value={newSuiteName}
                  onChange={(e) => setNewSuiteName(e.target.value)}
                  placeholder='Suite name'
                  className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                />
              </div>
              <div>
                <label className='text-sm font-medium text-text'>Description</label>
                <textarea
                  value={newSuiteDescription}
                  onChange={(e) => setNewSuiteDescription(e.target.value)}
                  placeholder='Suite description'
                  rows={3}
                  className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                />
              </div>
              <div>
                <label className='text-sm font-medium text-text'>Tags (comma separated)</label>
                <input
                  value={newSuiteTags}
                  onChange={(e) => setNewSuiteTags(e.target.value)}
                  placeholder='Auth, Security, Critical'
                  className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='text-sm font-medium text-text'>Execution Policy</label>
                  <select
                    value={newSuitePolicy}
                    onChange={(e) => setNewSuitePolicy(e.target.value as SuiteExecutionPolicy)}
                    className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                  >
                    <option value='Sequential'>Sequential</option>
                    <option value='FailFast'>Fail Fast</option>
                    <option value='ContinueOnError'>Continue on Error</option>
                  </select>
                </div>
                <div>
                  <label className='text-sm font-medium text-text'>Status</label>
                  <select
                    value={newSuiteStatus}
                    onChange={(e) => setNewSuiteStatus(e.target.value as SuiteStatus)}
                    className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                  >
                    <option value='Draft'>Draft</option>
                    <option value='Active'>Active</option>
                    <option value='Archived'>Archived</option>
                  </select>
                </div>
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <Button variant='outline' onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateSuite} disabled={!newSuiteName.trim()}>Create Suite</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title='Delete Test Suite'
        message={`Deleting "${deleteSuite?.name}" cannot be undone.`}
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={handleDeleteSuite}
        onCancel={() => { setDeleteOpen(false); setDeleteSuite(undefined); }}
      />
    </div>
  );
};

export default SuitePage;