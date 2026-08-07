// External libraries
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { projectStore } from '../../../store/projectStore';
import { queryKeys } from '../../../constants';
import { environmentService } from '../services/environmentService';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Toast } from '../../../components/shared/Toast';
import { ErrorAlert } from '../../../components/shared/ErrorAlert';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { ImportEnvironmentModal, type ImportEnvironmentModalData } from '../components/ImportEnvironmentModal';
import { Plus, Cloud, Upload, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEnvironments } from '../hooks/useEnvironments';
import { EnvironmentDialog, type EnvironmentDialogData } from '../components/EnvironmentDialog';
import { parseEnvironmentImport } from '../utils/parseEnvironmentImport';

// Styles

export interface EnvironmentPageProps {}

interface Environment {
  id: string;
  projectId: string;
  name: string;
  description: string;
  baseUrl: string;
  authentication: any;
  variables: Record<string, string>;
  timeout: number;
  createdAt: number;
  updatedAt: number;
}

export const EnvironmentPage: React.FC<EnvironmentPageProps> = () => {
  const navigate = useNavigate();
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const selectedProjectId = projectStore((s) => s.selectedProjectId);
  const projectId = routeProjectId ?? selectedProjectId ?? '1';
  const queryClient = useQueryClient();
  const { environments, isLoading, isError, error, createAsync, updateAsync, removeAsync } = useEnvironments(projectId);
  
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<string>('All');
  const [importOpen, setImportOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = React.useState<Environment | undefined>(undefined);
  const [editOpen, setEditOpen] = React.useState(false);
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState<'success' | 'error'>('success');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const filteredEnvironments = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return environments.filter((env) => {
      const matchesSearch =
        env.name.toLowerCase().includes(term) ||
        (env.description ?? '').toLowerCase().includes(term);
      const matchesFilter = filter === 'All' || env.name.toLowerCase().includes(filter.toLowerCase());
      return matchesSearch && matchesFilter;
    });
  }, [search, filter, environments]);

  const handleDelete = async () => {
    if (!selectedEnvironment) return;
    try {
      await removeAsync(selectedEnvironment.id);
      setDeleteOpen(false);
      setToastType('success');
      setToastMessage('Environment deleted successfully');
      setToastOpen(true);
    } catch (err: any) {
      setToastType('error');
      setToastMessage(err?.message || 'Failed to delete environment');
      setToastOpen(true);
    }
  };

  const handleEnvironmentSubmit = async (data: EnvironmentDialogData) => {
    setIsSubmitting(true);
    try {
      if (data.id) {
        await updateAsync(data.id, {
          name: data.name,
          baseUrl: data.baseUrl,
          description: data.description,
          authentication: data.authentication,
          variables: data.variables,
          timeout: data.timeout,
        });
        setToastMessage('Environment updated successfully');
      } else {
        await createAsync({
          projectId,
          name: data.name,
          baseUrl: data.baseUrl,
          description: data.description,
          authentication: data.authentication,
          variables: data.variables,
          timeout: data.timeout,
        });
        setToastMessage('Environment created successfully');
      }
      setToastType('success');
      setEditOpen(false);
      setToastOpen(true);
    } catch (err: any) {
      setToastType('error');
      setToastMessage(err?.message || 'Failed to save environment');
      setToastOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (data: ImportEnvironmentModalData) => {
    setIsSubmitting(true);
    try {
      const format = data.format;
      const payloads: Array<{
        name: string;
        baseUrl: string;
        description?: string;
        variables?: Record<string, string>;
        timeout?: number;
      }> = [];
      const fileErrors: string[] = [];

      if (data.source === 'file' && data.files?.length) {
        for (const file of data.files) {
          try {
            const parsed = await parseEnvironmentImport({ file, format });
            for (const env of parsed) {
              payloads.push({
                name: env.name,
                baseUrl: env.baseUrl,
                description: env.description,
                variables: env.variables,
                timeout: env.timeout,
              });
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Import failed';
            fileErrors.push(`${file.name}: ${msg}`);
          }
        }
      } else if (data.source === 'url' && data.url) {
        const parsed = await parseEnvironmentImport({ url: data.url, format });
        for (const env of parsed) {
          payloads.push({
            name: env.name,
            baseUrl: env.baseUrl,
            description: env.description,
            variables: env.variables,
            timeout: env.timeout,
          });
        }
      } else {
        throw new Error('Select files or enter a URL.');
      }

      if (payloads.length === 0) {
        if (fileErrors.length > 0) {
          throw new Error(fileErrors.join('\n\n'));
        }
        throw new Error('No environments found in the selected files or URL.');
      }

      const result = await environmentService.batchUpsertEnvironments(projectId, payloads);
      await queryClient.invalidateQueries({ queryKey: queryKeys.environments(projectId) });

      setImportOpen(false);
      const lines: string[] = [];
      if (result.created > 0) {
        lines.push(`Created ${result.created} environment${result.created === 1 ? '' : 's'}.`);
      }
      if (result.updated > 0) {
        lines.push(`Updated ${result.updated} environment${result.updated === 1 ? '' : 's'}.`);
      }
      if (fileErrors.length > 0) {
        lines.push(...fileErrors.map((e) => `⚠ ${e}`));
      }
      setToastType(fileErrors.length > 0 && result.environments.length === 0 ? 'error' : 'success');
      setToastMessage(lines.join('\n') || 'Import completed.');
      setToastOpen(true);
    } catch (err: unknown) {
      setToastType('error');
      setToastMessage(err instanceof Error ? err.message : 'Failed to import environment');
      setToastOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pageModals = (
    <>
      <ImportEnvironmentModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(data) => void handleImport(data)}
        isImporting={isSubmitting}
      />
      <EnvironmentDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEnvironmentSubmit}
        environment={selectedEnvironment}
        isSubmitting={isSubmitting}
      />
      <ConfirmDialog
        open={deleteOpen}
        title='Delete Environment'
        message={`Deleting "${selectedEnvironment?.name}" cannot be undone.`}
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
      <Toast message={toastMessage} type={toastType} open={toastOpen} onClose={() => setToastOpen(false)} />
    </>
  );

  const headerActions = (
    <>
      <Button variant='outline' onClick={() => setImportOpen(true)}>
        <Upload className='mr-2 h-4 w-4' />
        Import Environment
      </Button>
      <Button onClick={() => { setSelectedEnvironment(undefined); setEditOpen(true); }}>
        <Plus className='mr-2 h-4 w-4' />
        Create Environment
      </Button>
    </>
  );

  if (isLoading) {
    return (
      <div className='mx-auto max-w-7xl px-4 py-8'>
        <PageHeader
          title='Target environment'
          description='Base URL and variables used when you run tests or try APIs.'
        />
        <div className='flex items-center justify-center py-12'>
          <p className='text-sm text-text-secondary'>Loading environments...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className='mx-auto max-w-7xl px-4 py-8'>
        <PageHeader
          title='Target environment'
          description='Base URL and variables used when you run tests or try APIs.'
        />
        <ErrorAlert
          title='Failed to load environments'
          message={error?.message || 'An unexpected error occurred while loading environments.'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const showEmptyProjectState =
    environments.length === 0 && !search.trim() && filter === 'All';

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      <PageHeader
        title='Target environment'
        description='Base URL and variables used when you run tests or try APIs.'
      >
        {headerActions}
      </PageHeader>

      {environments.length > 0 && (
        <Card className="mb-6 border-primary/20">
          <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-text-secondary">Active for runs</p>
              <p className="font-semibold text-text">{environments[0].name}</p>
              <p className="text-sm text-text-secondary truncate max-w-xl">{environments[0].baseUrl || 'No base URL set'}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setSelectedEnvironment(environments[0] as Environment); setEditOpen(true); }}>
              Edit
            </Button>
          </CardContent>
        </Card>
      )}

      {showEmptyProjectState ? (
        <EmptyState
          icon={<Cloud className='h-12 w-12' />}
          title='No environment yet'
          description='After importing APIs, add an environment with your API base URL (e.g. staging). You can also import Postman env files.'
          action={{ label: 'Create environment', onClick: () => setEditOpen(true) }}
          secondaryAction={{
            label: 'Import APIs first',
            onClick: () => navigate(`/projects/${projectId}/apis`),
          }}
        />
      ) : (
        <>
          <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center'>
            <SearchBar value={search} onChange={setSearch} placeholder='Search environments...' className='sm:w-80' />
            <div className='flex gap-2'>
              {['All', 'Development', 'Testing', 'Staging', 'Production'].map((type) => (
                <Button key={type} variant={filter === type ? 'default' : 'outline'} size='sm' onClick={() => setFilter(type)}>
                  {type === 'All' ? 'All' : type}
                </Button>
              ))}
            </div>
            <div className='flex items-center gap-2'>
              <select className='rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'>
                <option>Sort by: Name</option>
                <option>Sort by: Last Updated</option>
              </select>
            </div>
          </div>

          {filteredEnvironments.length === 0 ? (
            <EmptyState
              icon={<Cloud className='h-12 w-12' />}
              title='No environments match your filters'
              description='Try adjusting search or filters.'
            />
          ) : (
            <Card>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead className='border-b border-border bg-surface'>
                    <tr>
                      <th className='px-4 py-3 text-left'>Name</th>
                      <th className='px-4 py-3 text-left'>Base URL</th>
                      <th className='px-4 py-3 text-left'>Authentication</th>
                      <th className='px-4 py-3 text-left'>Variables</th>
                      <th className='px-4 py-3 text-left'>Status</th>
                      <th className='px-4 py-3 text-left'>Last Updated</th>
                      <th className='px-4 py-3 text-right'>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnvironments.map((env) => {
                      const authType = env.authentication?.type || 'None';
                      const varCount = Object.keys(env.variables || {}).length;
                      const lastUpdated = env.updatedAt ? new Date(env.updatedAt).toLocaleDateString() : 'Never';

                      return (
                        <tr key={env.id} className='border-b border-border last:border-b-0 hover:bg-surface/50'>
                          <td className='px-4 py-3 font-medium'>{env.name}</td>
                          <td className='px-4 py-3 font-mono text-xs'>{env.baseUrl}</td>
                          <td className='px-4 py-3'>
                            <Badge variant='outline'>{authType}</Badge>
                          </td>
                          <td className='px-4 py-3 text-center'>{varCount}</td>
                          <td className='px-4 py-3'>
                            <Badge variant='default' className='bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'>Default</Badge>
                          </td>
                          <td className='px-4 py-3 text-text-secondary'>{lastUpdated}</td>
                          <td className='px-4 py-3'>
                            <div className='flex items-center justify-end gap-1'>
                              <Button variant='ghost' size='sm' onClick={() => { setSelectedEnvironment(env); setEditOpen(true); }}>
                                <Edit className='h-4 w-4' />
                              </Button>
                              <Button variant='ghost' size='sm' onClick={() => { setSelectedEnvironment(env); setDeleteOpen(true); }}>
                                <Trash2 className='h-4 w-4' />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {pageModals}
    </div>
  );
};

export default EnvironmentPage;
