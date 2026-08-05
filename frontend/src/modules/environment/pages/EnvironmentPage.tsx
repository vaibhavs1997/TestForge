// External libraries
import React from 'react';
import { useParams } from 'react-router-dom';
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
import { useEnvironments } from '../hooks/useEnvironments';
import { EnvironmentDialog, type EnvironmentDialogData } from '../components/EnvironmentDialog';
import { logger } from '../../../utils/logger';

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


  const breadcrumbItems = [
    { label: 'Projects', to: '/projects' },
    { label: 'Project', to: `/projects/${projectId}/overview` },
    { label: 'Environment' },
  ];

  if (isLoading) {
    return (
      <div className='mx-auto max-w-7xl px-4 py-8'>
        <PageHeader
          title='Environments'
          description='Manage reusable execution environments for this project.'
          breadcrumb={breadcrumbItems}
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
          breadcrumb={breadcrumbItems}
        />
        <ErrorAlert
          title='Failed to load environments'
          message={error?.message || 'An unexpected error occurred while loading environments.'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  if (filteredEnvironments.length === 0) {
    return (
      <div className='mx-auto max-w-7xl px-4 py-8'>
        <PageHeader
          title='Environments'
          description='Manage reusable execution environments for this project.'
          breadcrumb={breadcrumbItems}
        >
          <Button variant='outline' onClick={() => setImportOpen(true)}>
            <Upload className='mr-2 h-4 w-4' />
            Import Environment
          </Button>
          <Button onClick={() => { setSelectedEnvironment(undefined); setEditOpen(true); }}>
            <Plus className='mr-2 h-4 w-4' />
            Create Environment
          </Button>
        </PageHeader>
        <EmptyState
          icon={<Cloud className='h-12 w-12' />}
          title='No environments found'
          description={search ? 'Try adjusting your search criteria.' : 'Create your first environment to get started.'}
          action={search ? undefined : { label: 'Create Environment', onClick: () => setEditOpen(true) }}
        />
      </div>
    );
  }

  const handleDelete = async () => {
    if (selectedEnvironment) {
      try {
        await removeAsync(selectedEnvironment.id);
        setDeleteOpen(false);
        setToastMessage('Environment deleted successfully');
        setToastOpen(true);
      } catch (error: any) {
        setToastMessage(error?.message || 'Failed to delete environment');
        setToastOpen(true);
      }
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
          projectId: projectId,
          name: data.name,
          baseUrl: data.baseUrl,
          description: data.description,
          authentication: data.authentication,
          variables: data.variables,
          timeout: data.timeout,
        });
        setToastMessage('Environment created successfully');
      }
      setEditOpen(false);
      setToastOpen(true);
    } catch (error: any) {
      setToastMessage(error?.message || 'Failed to save environment');
      setToastOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async (data: ImportEnvironmentModalData) => {
    try {
      // TODO: Implement actual API call when environmentService.importEnvironment is available
      // For now, log the import data
      logger.info('Import environment', data);
      setImportOpen(false);
      setToastMessage('Environment import is not yet implemented');
      setToastType('error');
      setToastOpen(true);
    } catch (error: any) {
      setToastMessage(error?.message || 'Failed to import environment');
      setToastType('error');
      setToastOpen(true);
    }
  };

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      <PageHeader
        title='Environments'
        description='Manage reusable execution environments for this project.'
        breadcrumb={breadcrumbItems}
      >
        <Button variant='outline' onClick={() => setImportOpen(true)}>
          <Upload className='mr-2 h-4 w-4' />
          Import Environment
        </Button>
        <Button onClick={() => { setSelectedEnvironment(undefined); setEditOpen(true); }}>
          <Plus className='mr-2 h-4 w-4' />
          Create Environment
        </Button>
      </PageHeader>

      {/* Search and Filters */}
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

      {/* Environment List */}
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

      <ImportEnvironmentModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(data: ImportEnvironmentModalData) => {
          logger.info('Import environment', data);
          setImportOpen(false);
        }}
      />

      {/* Environment Editor Dialog */}
      <EnvironmentDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEnvironmentSubmit}
        environment={selectedEnvironment}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        title='Delete Environment'
        message={`Deleting "${selectedEnvironment?.name}" cannot be undone.`}
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <Toast
        message={toastMessage}
        open={toastOpen}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
};

export default EnvironmentPage;
