// External libraries
import React from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ImportEnvironmentModal, type ImportEnvironmentModalData } from '../components/ImportEnvironmentModal';
import { Globe, Plus, Server, Cloud, Upload, Key, Lock, Clock, MoreVertical, ExternalLink, Copy, Edit, Trash2 } from 'lucide-react';

// Styles

export interface EnvironmentPageProps {}

interface Environment {
  id: string;
  name: string;
  type: 'Development' | 'Testing' | 'Staging' | 'Production';
  status: 'default' | 'active';
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  variables: number;
  secrets: number;
  lastUpdated: string;
}

export const EnvironmentPage: React.FC<EnvironmentPageProps> = () => {
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<string>('All');
  const [importOpen, setImportOpen] = React.useState(false);

  const environments: Environment[] = [
    {
      id: '1',
      name: 'DEV',
      type: 'Development',
      status: 'default',
      baseUrl: 'https://dev.api.company.com',
      clientId: 'client_id_12345',
      clientSecret: '••••••••••••',
      variables: 32,
      secrets: 8,
      lastUpdated: '2 hours ago',
    },
    {
      id: '2',
      name: 'TEST',
      type: 'Testing',
      status: 'active',
      baseUrl: 'https://test.api.company.com',
      clientId: 'client_id_67890',
      clientSecret: '••••••••••••',
      variables: 28,
      secrets: 6,
      lastUpdated: '1 day ago',
    },
    {
      id: '3',
      name: 'STAGE',
      type: 'Staging',
      status: 'active',
      baseUrl: 'https://stage.api.company.com',
      clientId: 'client_id_abcde',
      clientSecret: '••••••••••••',
      variables: 34,
      secrets: 5,
      lastUpdated: '2 days ago',
    },
    {
      id: '4',
      name: 'PROD',
      type: 'Production',
      status: 'active',
      baseUrl: 'https://api.company.com',
      clientId: 'client_id_fghij',
      clientSecret: '••••••••••••',
      variables: 38,
      secrets: 12,
      lastUpdated: '3 days ago',
    },
  ];

  const filteredEnvironments = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return environments.filter((env) => {
      const matchesSearch = env.name.toLowerCase().includes(term) || env.type.toLowerCase().includes(term);
      const matchesFilter = filter === 'All' || env.type === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  const getStatusBadge = (status: Environment['status']) => {
    return status === 'default' 
      ? <Badge variant='default' className='bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'>Default</Badge>
      : <Badge variant='success'>Active</Badge>;
  };

  const getTypeBadge = (type: Environment['type']) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      'Development': 'default',
      'Testing': 'secondary',
      'Staging': 'outline',
      'Production': 'destructive',
    };
    return <Badge variant={variants[type]}>{type}</Badge>;
  };

  if (filteredEnvironments.length === 0) {
    return (
      <div className='mx-auto max-w-7xl px-4 py-8'>
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-text'>Environments</h1>
            <p className='mt-1 text-sm text-text-secondary'>Manage reusable execution environments for this project.</p>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' onClick={() => setImportOpen(true)}>
              <Upload className='mr-2 h-4 w-4' />
              Import Environment
            </Button>
            <Button>
              <Plus className='mr-2 h-4 w-4' />
              Create Environment
            </Button>
          </div>
        </div>
        <EmptyState
          icon={<Cloud className='h-12 w-12' />}
          title='No environments found'
          description={search ? 'Try adjusting your search criteria.' : 'Create your first environment to get started.'}
          action={search ? undefined : { label: 'Create Environment', onClick: () => console.log('Create clicked') }}
        />
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      {/* Page Header */}
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Environments</h1>
          <p className='mt-1 text-sm text-text-secondary'>Manage reusable execution environments for this project.</p>
        </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' onClick={() => setImportOpen(true)}>
              <Upload className='mr-2 h-4 w-4' />
              Import Environment
            </Button>
            <Button>
              <Plus className='mr-2 h-4 w-4' />
              Create Environment
            </Button>
          </div>
      </div>

      {/* Summary Cards */}
      <div className='mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-text-secondary'>Total Environments</CardTitle>
            <Globe className='h-4 w-4 text-blue-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-text'>{environments.length}</div>
            <p className='text-xs text-text-secondary'>Across all types</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-text-secondary'>Default Environment</CardTitle>
            <Server className='h-4 w-4 text-purple-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-text'>DEV</div>
            <p className='text-xs text-text-secondary'>Development</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-text-secondary'>Variables</CardTitle>
            <Key className='h-4 w-4 text-green-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-text'>128</div>
            <p className='text-xs text-text-secondary'>Across all environments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-text-secondary'>Secrets</CardTitle>
            <Lock className='h-4 w-4 text-orange-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-text'>24</div>
            <p className='text-xs text-text-secondary'>Secured values</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex flex-1 items-center gap-3'>
          <SearchBar value={search} onChange={setSearch} placeholder='Search Environment...' className='sm:w-80' />
          <div className='flex gap-2'>
            {['All', 'Development', 'Testing', 'Staging', 'Production'].map((type) => (
              <Button key={type} variant={filter === type ? 'default' : 'outline'} size='sm' onClick={() => setFilter(type)}>
                {type === 'All' ? 'All' : type}
              </Button>
            ))}
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <select className='rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'>
            <option>Sort by: Name</option>
            <option>Sort by: Type</option>
            <option>Sort by: Status</option>
          </select>
        </div>
      </div>

      {/* Environment Cards Grid */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {filteredEnvironments.map((env) => (
          <Card key={env.id} className='transition-shadow hover:shadow-lg'>
            <CardHeader>
              <div className='flex items-start justify-between'>
                <div className='flex items-center gap-2'>
                  <Globe className='h-5 w-5 text-primary' />
                  <div>
                    <CardTitle className='text-base'>{env.name}</CardTitle>
                    <div className='mt-1'>{getTypeBadge(env.type)}</div>
                  </div>
                </div>
                {getStatusBadge(env.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                <div>
                  <p className='text-xs font-medium text-text-secondary'>Base URL</p>
                  <p className='text-xs text-text'>{env.baseUrl}</p>
                </div>
                <div>
                  <p className='text-xs font-medium text-text-secondary'>Client ID</p>
                  <p className='text-xs text-text font-mono'>{env.clientId}</p>
                </div>
                <div>
                  <p className='text-xs font-medium text-text-secondary'>Client Secret</p>
                  <p className='text-xs text-text font-mono'>{env.clientSecret}</p>
                </div>
                <div className='flex items-center justify-between text-xs'>
                  <span className='text-text-secondary'>Variables</span>
                  <span className='font-medium text-text'>{env.variables}</span>
                </div>
                <div className='flex items-center justify-between text-xs'>
                  <span className='text-text-secondary'>Secrets</span>
                  <span className='font-medium text-text'>{env.secrets}</span>
                </div>
                <div className='flex items-center justify-between text-xs'>
                  <span className='text-text-secondary'>Last Updated</span>
                  <span className='font-medium text-text'>{env.lastUpdated}</span>
                </div>
                <div className='flex gap-2 pt-2'>
                  <Button variant='outline' size='sm' className='flex-1'>
                    <ExternalLink className='mr-1 h-3 w-3' />
                    Open
                  </Button>
                  <Button variant='outline' size='sm' className='flex-1'>
                    <Copy className='mr-1 h-3 w-3' />
                    Duplicate
                  </Button>
                  <Button variant='ghost' size='sm'>
                    <Edit className='h-3 w-3' />
                  </Button>
                  <Button variant='ghost' size='sm'>
                    <Trash2 className='h-3 w-3' />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ImportEnvironmentModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(data: ImportEnvironmentModalData) => {
          console.log('Import environment:', data);
          setImportOpen(false);
        }}
      />
    </div>
  );
};

export default EnvironmentPage;