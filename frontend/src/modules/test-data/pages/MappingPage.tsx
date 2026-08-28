// Mapping page for Data Source Intelligence
import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Toast } from '../../../components/shared/Toast';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { Link2, Plus, Edit, Trash2 } from 'lucide-react';
import { useMappings } from '../hooks/useMappings';
import { MappingDialog, type MappingDialogData } from '../components/MappingDialog';

export interface MappingPageProps {
  /** When true, omit page title (used inside unified Test Data Library). */
  embedded?: boolean;
}

interface Mapping {
  id: string;
  projectId: string;
  serviceId: string;
  operationId: string;
  fieldPath: string;
  sourceType: string;
  datasetId?: string;
  datasetColumn?: string;
  environmentVariable?: string;
  runtimeOperationId?: string;
  runtimeField?: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

const SOURCE_TYPE_COLORS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  'Existing Dataset': 'default',
  'Generated': 'secondary',
  'Runtime Response': 'outline',
  'Manual': 'destructive',
  'Environment Variable': 'secondary',
};

export const MappingPage: React.FC<MappingPageProps> = ({ embedded = false }) => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const projectId = routeProjectId ?? '';
  const { mappings, isLoading, isError, error, createAsync, updateAsync, removeAsync } = useMappings(projectId);
  
  const [search, setSearch] = React.useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = React.useState<string>('All');
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [selectedMapping, setSelectedMapping] = React.useState<Mapping | undefined>(undefined);
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const filteredMappings = React.useMemo(() => {
    const list = mappings ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((mapping) => {
      const matchesSearch = mapping.fieldPath.toLowerCase().includes(term) || 
                           mapping.notes.toLowerCase().includes(term) ||
                           mapping.serviceId.toLowerCase().includes(term);
      const matchesSourceType = sourceTypeFilter === 'All' || mapping.sourceType === sourceTypeFilter;
      return matchesSearch && matchesSourceType;
    });
  }, [search, sourceTypeFilter, mappings]);

  const handleDelete = async () => {
    if (selectedMapping) {
      try {
        await removeAsync(selectedMapping.id);
        setDeleteOpen(false);
        setToastMessage('Mapping deleted successfully');
        setToastOpen(true);
      } catch (error: any) {
        setToastMessage(error?.message || 'Failed to delete mapping');
        setToastOpen(true);
      }
    }
  };

  const handleMappingSubmit = async (data: MappingDialogData) => {
    setIsSubmitting(true);
    try {
      if (data.id) {
        await updateAsync(data.id, {
          fieldPath: data.fieldPath,
          sourceType: data.sourceType,
          datasetId: data.datasetId,
          datasetColumn: data.datasetColumn,
          environmentVariable: data.environmentVariable,
          runtimeOperationId: data.runtimeOperationId,
          runtimeField: data.runtimeField,
          notes: data.notes,
        });
        setToastMessage('Mapping updated successfully');
      } else {
        await createAsync({
          projectId: projectId,
          serviceId: data.serviceId,
          operationId: data.operationId,
          fieldPath: data.fieldPath,
          sourceType: data.sourceType,
          datasetId: data.datasetId,
          datasetColumn: data.datasetColumn,
          environmentVariable: data.environmentVariable,
          runtimeOperationId: data.runtimeOperationId,
          runtimeField: data.runtimeField,
          notes: data.notes,
        });
        setToastMessage('Mapping created successfully');
      }
      setEditOpen(false);
      setToastOpen(true);
    } catch (error: any) {
      setToastMessage(error?.message || 'Failed to save mapping');
      setToastOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSourceDisplay = (mapping: Mapping) => {
    switch (mapping.sourceType) {
      case 'Existing Dataset':
        return mapping.datasetId || '—';
      case 'Runtime Response':
        return mapping.runtimeOperationId || '—';
      case 'Environment Variable':
        return mapping.environmentVariable || '—';
      default:
        return '—';
    }
  };

  const mappingDialogs = (
    <>
      <MappingDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleMappingSubmit}
        mapping={selectedMapping}
        isSubmitting={isSubmitting}
      />
      <ConfirmDialog
        open={deleteOpen}
        title='Delete Mapping'
        message={`Deleting mapping for "${selectedMapping?.fieldPath}" cannot be undone.`}
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
    </>
  );

  const pageShell = embedded ? '' : 'w-full px-4 py-8 lg:px-8';

  if (!projectId) {
    return (
      <div className={pageShell}>
        <p className="py-12 text-center text-sm text-text-secondary">No project selected.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={pageShell}>
        {!embedded && (
          <div className='mb-6'>
            <h1 className='text-2xl font-bold text-text'>Data Source Mappings</h1>
            <p className='mt-1 text-sm text-text-secondary'>Manage data source mappings for API operations.</p>
          </div>
        )}
        <div className='flex items-center justify-center py-12'>
          <p className='text-sm text-text-secondary'>Loading mappings...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={pageShell}>
        {!embedded && (
          <div className='mb-6'>
            <h1 className='text-2xl font-bold text-text'>Data Source Mappings</h1>
            <p className='mt-1 text-sm text-text-secondary'>Manage data source mappings for API operations.</p>
          </div>
        )}
        <div className='flex items-center justify-center py-12'>
          <p className='text-sm text-error'>Error loading mappings: {error?.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  if (filteredMappings.length === 0) {
    return (
      <div className={pageShell}>
        {!embedded ? (
          <div className='mb-6 flex items-center justify-between'>
            <div>
              <h1 className='text-2xl font-bold text-text'>Data Source Mappings</h1>
              <p className='mt-1 text-sm text-text-secondary'>Manage data source mappings for API operations.</p>
            </div>
            <Button onClick={() => { setSelectedMapping(undefined); setEditOpen(true); }}>
              <Plus className='mr-2 h-4 w-4' />
              Create Mapping
            </Button>
          </div>
        ) : (
          <div className='mb-4 flex justify-end'>
            <Button onClick={() => { setSelectedMapping(undefined); setEditOpen(true); }}>
              <Plus className='mr-2 h-4 w-4' />
              Create Mapping
            </Button>
          </div>
        )}
        <EmptyState
          icon={<Link2 className='h-12 w-12' />}
          title='No mappings found'
          description={search ? 'Try adjusting your search criteria.' : 'Create your first mapping to get started.'}
          action={search ? undefined : { label: 'Create Mapping', onClick: () => setEditOpen(true) }}
        />
        {mappingDialogs}
      </div>
    );
  }

  return (
    <div className={pageShell}>
      {!embedded ? (
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-text'>Data Source Mappings</h1>
            <p className='mt-1 text-sm text-text-secondary'>Manage data source mappings for API operations.</p>
          </div>
          <Button onClick={() => { setSelectedMapping(undefined); setEditOpen(true); }}>
            <Plus className='mr-2 h-4 w-4' />
            Create Mapping
          </Button>
        </div>
      ) : (
        <div className='mb-4 flex justify-end'>
          <Button onClick={() => { setSelectedMapping(undefined); setEditOpen(true); }}>
            <Plus className='mr-2 h-4 w-4' />
            Create Mapping
          </Button>
        </div>
      )}

      {/* Search and Filters */}
      <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center'>
        <SearchBar value={search} onChange={setSearch} placeholder='Search mappings...' className='sm:w-80' />
        <div className='flex gap-2'>
          <Button 
            variant={sourceTypeFilter === 'All' ? 'default' : 'outline'} 
            size='sm' 
            onClick={() => setSourceTypeFilter('All')}
          >
            All
          </Button>
          {Object.keys(SOURCE_TYPE_COLORS).map((type) => (
            <Button 
              key={type} 
              variant={sourceTypeFilter === type ? 'default' : 'outline'} 
              size='sm' 
              onClick={() => setSourceTypeFilter(type)}
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {/* Mappings Table */}
      <Card>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='border-b border-border bg-surface'>
              <tr>
                <th className='px-4 py-3 text-left'>Service</th>
                <th className='px-4 py-3 text-left'>Operation</th>
                <th className='px-4 py-3 text-left'>Field</th>
                <th className='px-4 py-3 text-left'>Source Type</th>
                <th className='px-4 py-3 text-left'>Source</th>
                <th className='px-4 py-3 text-left'>Last Updated</th>
                <th className='px-4 py-3 text-right'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMappings.map((mapping) => {
                const lastUpdated = mapping.updatedAt ? new Date(mapping.updatedAt).toLocaleDateString() : 'Never';
                
                return (
                  <tr key={mapping.id} className='border-b border-border last:border-b-0 hover:bg-surface/50'>
                    <td className='px-4 py-3 font-medium'>{mapping.serviceId}</td>
                    <td className='px-4 py-3 text-text-secondary'>{mapping.operationId}</td>
                    <td className='px-4 py-3 font-mono text-xs'>{mapping.fieldPath}</td>
                    <td className='px-4 py-3'>
                      <Badge variant={SOURCE_TYPE_COLORS[mapping.sourceType] || 'outline'}>{mapping.sourceType}</Badge>
                    </td>
                    <td className='px-4 py-3 text-text-secondary'>{getSourceDisplay(mapping)}</td>
                    <td className='px-4 py-3 text-text-secondary'>{lastUpdated}</td>
                    <td className='px-4 py-3'>
                      <div className='flex items-center justify-end gap-1'>
                        <Button variant='ghost' size='sm' onClick={() => { setSelectedMapping(mapping as any); setEditOpen(true); }}>
                          <Edit className='h-4 w-4' />
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => { setSelectedMapping(mapping as any); setDeleteOpen(true); }}>
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

      {mappingDialogs}
    </div>
  );
};

export default MappingPage;
