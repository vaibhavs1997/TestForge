// External libraries
import React from 'react';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { PageHeader } from '../../../components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { SearchBar } from '../../../components/shared/SearchBar';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Upload, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

// Styles

export interface ImportCenterPageProps {}

interface ImportJob {
  id: string;
  fileName: string;
  status: 'completed' | 'failed' | 'processing' | 'queued';
  progress: number;
  recordsImported: number;
  timestamp: string;
}

export const ImportCenterPage: React.FC<ImportCenterPageProps> = () => {
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const importJobs: ImportJob[] = [
    {
      id: '1',
      fileName: 'user_api_tests.json',
      status: 'completed',
      progress: 100,
      recordsImported: 245,
      timestamp: '2024-01-15T10:30:00Z',
    },
    {
      id: '2',
      fileName: 'payment_service.yaml',
      status: 'processing',
      progress: 67,
      recordsImported: 0,
      timestamp: '2024-01-15T09:15:00Z',
    },
    {
      id: '3',
      fileName: 'legacy_tests.csv',
      status: 'failed',
      progress: 45,
      recordsImported: 0,
      timestamp: '2024-01-15T08:45:00Z',
    },
    {
      id: '4',
      fileName: 'integration_suite.json',
      status: 'queued',
      progress: 0,
      recordsImported: 0,
      timestamp: '2024-01-15T08:00:00Z',
    },
  ];

  const filteredJobs = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return importJobs;
    return importJobs.filter((job) => job.fileName.toLowerCase().includes(term));
  }, [search]);

  const getStatusBadge = (status: ImportJob['status']) => {
    const variants: Record<ImportJob['status'], 'success' | 'destructive' | 'warning' | 'secondary'> = {
      completed: 'success',
      failed: 'destructive',
      processing: 'warning',
      queued: 'secondary',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getStatusIcon = (status: ImportJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className='h-5 w-5 text-green-600' />;
      case 'failed':
        return <XCircle className='h-5 w-5 text-red-600' />;
      case 'processing':
        return <Clock className='h-5 w-5 text-blue-600' />;
      case 'queued':
        return <Clock className='h-5 w-5 text-gray-600' />;
    }
  };

  if (loading) {
    return (
      <div className='mx-auto max-w-7xl px-4 py-8'>
        <PageHeader title='Import Center' description='Import test data and configurations' />
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className='pt-6'>
                <div className='h-8 w-8 animate-pulse rounded-full bg-gray-200' />
                <div className='mt-4 h-4 w-24 animate-pulse rounded bg-gray-200' />
                <div className='mt-2 h-8 w-16 animate-pulse rounded bg-gray-200' />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-7xl px-4 py-8'>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Import Center</h1>
          <p className='mt-1 text-sm text-text-secondary'>Import test data and configurations</p>
        </div>
        <div className='flex items-center gap-2'>
          <Button>
            <Upload className='mr-2 h-4 w-4' />
            Upload File
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className='mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-text-secondary'>Total Imports</CardTitle>
            <FileText className='h-4 w-4 text-blue-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-text'>156</div>
            <p className='text-xs text-text-secondary'>+12 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-text-secondary'>Success Rate</CardTitle>
            <CheckCircle className='h-4 w-4 text-green-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-text'>94.2%</div>
            <p className='text-xs text-text-secondary'>Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-text-secondary'>Failed Imports</CardTitle>
            <XCircle className='h-4 w-4 text-red-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-text'>9</div>
            <p className='text-xs text-text-secondary'>Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className='mb-4'>
        <SearchBar value={search} onChange={setSearch} placeholder='Search import jobs...' className='sm:w-80' />
      </div>

      {/* Import Jobs */}
      {filteredJobs.length === 0 ? (
        <EmptyState
          icon={<Upload className='h-12 w-12' />}
          title='No import jobs found'
          description={search ? 'Try adjusting your search criteria.' : 'Upload a file to start importing data.'}
          action={search ? undefined : { label: 'Upload File', onClick: () => console.log('Upload clicked') }}
        />
      ) : (
        <div className='space-y-4'>
          {filteredJobs.map((job) => (
            <Card key={job.id}>
              <CardContent className='pt-6'>
                <div className='flex items-start gap-4'>
                  <div className='flex-shrink-0'>{getStatusIcon(job.status)}</div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between'>
                      <h4 className='text-sm font-medium text-text truncate'>{job.fileName}</h4>
                      {getStatusBadge(job.status)}
                    </div>
                    {job.status === 'processing' && (
                      <div className='mt-2'>
                        <div className='h-2 w-full rounded-full bg-gray-200'>
                          <div className='h-2 rounded-full bg-blue-600' style={{ width: `${job.progress}%` }} />
                        </div>
                        <p className='mt-1 text-xs text-text-secondary'>{job.progress}% complete</p>
                      </div>
                    )}
                    {job.status === 'completed' && (
                      <p className='mt-1 text-sm text-text-secondary'>
                        {job.recordsImported} records imported successfully
                      </p>
                    )}
                    {job.status === 'failed' && (
                      <p className='mt-1 text-sm text-red-600'>Import failed. Click to view error details.</p>
                    )}
                    <p className='mt-1 text-xs text-text-secondary'>{new Date(job.timestamp).toLocaleString()}</p>
                  </div>
                  <div className='flex-shrink-0'>
                    <Button variant='outline' size='sm'>
                      {job.status === 'queued' || job.status === 'processing' ? 'Cancel' : 'View Details'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImportCenterPage;