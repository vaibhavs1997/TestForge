// Service list page scoped to a project with search, sort, and filters.
import React from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader';
import { SearchBar } from '../../../components/shared/SearchBar';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { Select } from '../../../components/forms/Select';
import { ServiceDialog } from '../components/ServiceDialog';
import { useService } from '../hooks/useService';
import type { Service, ServiceFormData } from '../types';
import { ChevronRight, Plus, Import, MoreVertical, Play, Edit, Trash2 } from 'lucide-react';

type SortField = 'name' | 'protocol' | 'version' | 'status' | 'updatedDate';
type SortDir = 'asc' | 'desc';

const protocolOptions = [
  { value: '', label: 'All Methods' },
  { value: 'REST', label: 'REST' },
  { value: 'GraphQL', label: 'GraphQL' },
  { value: 'SOAP', label: 'SOAP' },
  { value: 'gRPC', label: 'gRPC' },
  { value: 'Other', label: 'Other' },
];

const statusOptions = [
  { value: '', label: 'All Tags' },
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

interface Operation {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  status: 'active' | 'inactive';
  description: string;
  tags: string[];
}

interface ServiceWithOperations extends Service {
  operations: Operation[];
}

export const ServiceListPage = ({ projectId: propProjectId, projectName }: { projectId?: string; projectName?: string }) => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const projectId = propProjectId ?? routeProjectId ?? '1';
  const { services, create, update, remove } = useService(projectId);

  const [search, setSearch] = React.useState('');
  const [selectedService, setSelectedService] = React.useState<ServiceWithOperations | null>(null);
  const [selectedOperation, setSelectedOperation] = React.useState<Operation | null>(null);
  const [activeTab, setActiveTab] = React.useState('overview');
  const [protocol, setProtocol] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editService, setEditService] = React.useState<Service | undefined>(undefined);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteService, setDeleteService] = React.useState<Service | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // Mock data for services with operations
  const servicesWithOperations: ServiceWithOperations[] = React.useMemo(() => {
    return services.map(service => ({
      ...service,
      operations: [
        {
          id: `${service.id}-op-1`,
          method: 'POST',
          path: '/auth/login',
          status: 'active' as const,
          description: 'Authenticate user with email and password',
          tags: ['Authentication', 'Auth'],
        },
        {
          id: `${service.id}-op-2`,
          method: 'POST',
          path: '/auth/logout',
          status: 'active' as const,
          description: 'Logout user and invalidate session',
          tags: ['Authentication'],
        },
        {
          id: `${service.id}-op-3`,
          method: 'POST',
          path: '/auth/refresh',
          status: 'active' as const,
          description: 'Refresh access token',
          tags: ['Authentication'],
        },
        {
          id: `${service.id}-op-4`,
          method: 'POST',
          path: '/auth/register',
          status: 'active' as const,
          description: 'Register new user account',
          tags: ['Authentication'],
        },
        {
          id: `${service.id}-op-5`,
          method: 'GET',
          path: '/auth/me',
          status: 'active' as const,
          description: 'Get current user profile',
          tags: ['Authentication'],
        },
        {
          id: `${service.id}-op-6`,
          method: 'POST',
          path: '/auth/forgot-password',
          status: 'inactive' as const,
          description: 'Request password reset',
          tags: ['Authentication'],
        },
      ],
    }));
  }, [services]);

  // Auto-select first service if none selected
  React.useEffect(() => {
    if (!selectedService && servicesWithOperations.length > 0) {
      setSelectedService(servicesWithOperations[0]);
      if (servicesWithOperations[0].operations.length > 0) {
        setSelectedOperation(servicesWithOperations[0].operations[0]);
      }
    }
  }, [servicesWithOperations, selectedService]);

  const handleServiceClick = (service: ServiceWithOperations) => {
    setSelectedService(service);
    if (service.operations.length > 0) {
      setSelectedOperation(service.operations[0]);
    }
    setActiveTab('overview');
  };

  const handleOperationClick = (operation: Operation) => {
    setSelectedOperation(operation);
    setActiveTab('overview');
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

  const handleDelete = () => {
    if (deleteService) {
      remove(deleteService.id);
      setDeleteOpen(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'request', label: 'Request' },
    { id: 'response', label: 'Response' },
    { id: 'schema', label: 'Schema' },
    { id: 'tests', label: 'Tests' },
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
          <h1 className='text-2xl font-bold text-text'>API Operations</h1>
          <p className='mt-1 text-sm text-text-secondary'>
            Browse, search and explore all API endpoints and operations in this project.
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <Button variant='outline'>
            <Import className='mr-2 h-4 w-4' />
            Import / Sync APIs
          </Button>
          <Button>
            <Plus className='mr-2 h-4 w-4' />
            Add API
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center'>
        <SearchBar value={search} onChange={setSearch} placeholder='Search operations, endpoints, tags...' className='sm:w-96' />
        <Select options={protocolOptions} value={protocol} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProtocol(e.target.value)} className='sm:w-40' />
        <Select options={statusOptions} value={protocol} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProtocol(e.target.value)} className='sm:w-40' />
        <Button variant='outline' size='sm'>
          Filters
        </Button>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Left Panel - Service Tree */}
        <Card className='lg:col-span-1'>
          <div className='border-b border-border px-4 py-3'>
            <div className='flex items-center justify-between'>
              <h3 className='text-sm font-semibold text-text'>API Operations</h3>
              <span className='text-xs text-text-secondary'>{services.length}</span>
            </div>
          </div>
          <div className='p-4'>
            <div className='space-y-1'>
              {servicesWithOperations.map((service) => (
                <div key={service.id} className='space-y-1'>
                  <button
                    onClick={() => handleServiceClick(service)}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                      selectedService?.id === service.id
                        ? 'bg-primary text-white'
                        : 'hover:bg-surface text-text'
                    }`}
                  >
                    <div className='flex items-center gap-2'>
                      <ChevronRight className='h-4 w-4' />
                      <div>
                        <div className='text-sm font-medium'>{service.name}</div>
                        <div className='text-xs opacity-75'>{service.operations.length} operations</div>
                      </div>
                    </div>
                  </button>
                  {selectedService?.id === service.id && (
                    <div className='ml-4 space-y-1'>
                      {service.operations.map((operation) => (
                        <button
                          key={operation.id}
                          onClick={() => handleOperationClick(operation)}
                          className={`w-full flex items-center justify-between rounded px-3 py-2 text-left transition-colors ${
                            selectedOperation?.id === operation.id
                              ? 'bg-primary/10 text-primary'
                              : 'hover:bg-surface text-text-secondary'
                          }`}
                        >
                          <div className='flex items-center gap-2'>
                            <Badge className={`text-xs ${getMethodColor(operation.method)}`} variant='outline'>
                              {operation.method}
                            </Badge>
                            <span className='text-sm font-mono'>{operation.path}</span>
                          </div>
                          <div className={`h-2 w-2 rounded-full ${operation.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
                  <div className='flex items-center gap-2'>
                    <Button variant='outline' size='sm'>
                      <Play className='mr-2 h-4 w-4' />
                      Try It
                    </Button>
                    <Button variant='ghost' size='sm'>
                      <Edit className='h-4 w-4' />
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
                    {/* Operation Summary */}
                    <div>
                      <h3 className='text-sm font-semibold text-text mb-2'>Operation Summary</h3>
                      <p className='text-sm text-text-secondary'>{selectedOperation.description}</p>
                    </div>

                    {/* Description */}
                    <div>
                      <h3 className='text-sm font-semibold text-text mb-2'>Description</h3>
                      <p className='text-sm text-text-secondary'>
                        Authenticates a user with valid credentials and returns access token and refresh token.
                      </p>
                    </div>

                    {/* Tags */}
                    <div>
                      <h3 className='text-sm font-semibold text-text mb-2'>Tags</h3>
                      <div className='flex gap-2'>
                        {selectedOperation.tags.map((tag) => (
                          <Badge key={tag} variant='outline'>{tag}</Badge>
                        ))}
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <h3 className='text-sm font-semibold text-text mb-1'>Service</h3>
                        <p className='text-sm text-text-secondary'>{selectedService?.name}</p>
                      </div>
                      <div>
                        <h3 className='text-sm font-semibold text-text mb-1'>Method</h3>
                        <Badge className={getMethodColor(selectedOperation.method)}>{selectedOperation.method}</Badge>
                      </div>
                      <div>
                        <h3 className='text-sm font-semibold text-text mb-1'>Base URL</h3>
                        <code className='text-sm text-text-secondary'>{selectedService?.baseUrl}</code>
                      </div>
                      <div>
                        <h3 className='text-sm font-semibold text-text mb-1'>Authentication</h3>
                        <p className='text-sm text-text-secondary'>Bearer Token</p>
                      </div>
                      <div>
                        <h3 className='text-sm font-semibold text-text mb-1'>Rate Limit</h3>
                        <p className='text-sm text-text-secondary'>100 requests / minute</p>
                      </div>
                    </div>

                    {/* Operation ID */}
                    <div>
                      <h3 className='text-sm font-semibold text-text mb-1'>Operation ID</h3>
                      <code className='text-sm text-text-secondary'>loginUser</code>
                    </div>
                  </div>
                )}

                {activeTab === 'request' && (
                  <div className='space-y-4'>
                    <h3 className='text-sm font-semibold text-text'>Request</h3>
                    <div className='rounded-lg border border-border p-4'>
                      <p className='text-sm text-text-secondary'>Request configuration panel would be displayed here.</p>
                    </div>
                  </div>
                )}

                {activeTab === 'response' && (
                  <div className='space-y-4'>
                    <h3 className='text-sm font-semibold text-text'>Response</h3>
                    <div className='rounded-lg border border-border p-4'>
                      <p className='text-sm text-text-secondary'>Response examples would be displayed here.</p>
                    </div>
                  </div>
                )}

                {activeTab === 'schema' && (
                  <div className='space-y-4'>
                    <h3 className='text-sm font-semibold text-text'>Schema</h3>
                    <div className='rounded-lg border border-border p-4'>
                      <p className='text-sm text-text-secondary'>Schema definition would be displayed here.</p>
                    </div>
                  </div>
                )}

                {activeTab === 'tests' && (
                  <div className='space-y-4'>
                    <h3 className='text-sm font-semibold text-text'>Tests</h3>
                    <div className='rounded-lg border border-border p-4'>
                      <p className='text-sm text-text-secondary'>Test cases would be displayed here.</p>
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div className='space-y-4'>
                    <h3 className='text-sm font-semibold text-text'>History</h3>
                    <div className='rounded-lg border border-border p-4'>
                      <p className='text-sm text-text-secondary'>Execution history would be displayed here.</p>
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

      {/* Service Dialog */}
      <ServiceDialog open={createOpen} mode='create' onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      <ServiceDialog open={editOpen} mode='edit' service={editService} onSubmit={handleUpdate} onCancel={() => setEditOpen(false)} />
      <ConfirmDialog
        open={deleteOpen}
        title='Delete Service'
        message={`Deleting "${deleteService?.name}" cannot be undone.`}
        confirmLabel='Delete'
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
};

export default ServiceListPage;