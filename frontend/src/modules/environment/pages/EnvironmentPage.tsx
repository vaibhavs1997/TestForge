// External libraries
import React from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Toast } from '../../../components/shared/Toast';
import { ErrorAlert } from '../../../components/shared/ErrorAlert';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { ImportEnvironmentModal, type ImportEnvironmentModalData } from '../components/ImportEnvironmentModal';
import { Plus, Cloud, Upload, Edit, Trash2 } from 'lucide-react';
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
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const projectId = routeProjectId || '1';
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
      const matchesSearch = env.name.toLowerCase().includes(term) || env.description.toLowerCase().includes(term);
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
      const parsed =
        data.source === 'file' && data.file
          ? await parseEnvironmentImport({ file: data.file, format: data.format })
          : data.source === 'url' && data.url
            ? await parseEnvironmentImport({ url: data.url, format: data.format })
            : [];

      if (parsed.length === 0) {
        throw new Error('No environments found in the file or URL.');
      }

      let created = 0;
      for (const env of parsed) {
        try {
          await createAsync({
            projectId,
            name: env.name,
            baseUrl: env.baseUrl,
            description: env.description,
            variables: env.variables,
            timeout: env.timeout,
          });
          created += 1;
        } catch (err: any) {
          const msg = err?.message || '';
          if (msg.toLowerCase().includes('already exists')) {
            continue;
          }
          throw err;
        }
      }

      if (created === 0) {
        throw new Error('All environments in the file already exist in this project.');
      }

      setImportOpen(false);
      setToastType('success');
      setToastMessage(
        `Imported ${created} environment${created === 1 ? '' : 's'} successfully.`,
      );
      setToastOpen(true);
    } catch (err: any) {
      setToastType('error');
      setToastMessage(err?.message || 'Failed to import environment');
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
          title='Environments'
          description='Manage reusable execution environments for this project.'
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
          title='Environments'
          description='Manage reusable execution environments for this project.'
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
        title='Environments'
        description='Manage reusable execution environments for this project.'
      >
        {headerActions}
      </PageHeader>

      {showEmptyProjectState ? (
        <EmptyState
          icon={<Cloud className='h-12 w-12' />}
          title='No environments found'
          description='Create your first environment or import one from a file.'
          action={{ label: 'Create Environment', onClick: () => setEditOpen(true) }}
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
                      <th className='px-4 py-3 text-left'>Description</th>
                      <th className='px-4 py-3 text-left'>Base URL</th>
                      <th className='px-4 py-3 text-left'>Authentication</th>
                      <th className='px-4 py-3 text-left'>Variables</th>
                      <th className='px-4 py-3 text-left'>Timeout</th>
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
                          <td className='px-4 py-3 text-text-secondary'>{env.description || '—'}</td>
                          <td className='px-4 py-3 font-mono text-xs'>{env.baseUrl}</td>
                          <td className='px-4 py-3'>
                            <Badge variant='outline'>{authType}</Badge>
                          </td>
                          <td className='px-4 py-3 text-center'>{varCount}</td>
                          <td className='px-4 py-3'>{env.timeout}ms</td>
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
