// Project Recommendations page - displays deterministic recommendations
import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Toast } from '../../../components/shared/Toast';
import { useRecommendations } from '../hooks';
import type { Recommendation } from '../types';

export interface RecommendationsPageProps {}

const CATEGORY_ICONS: Record<string, React.FC<any>> = {
  'Missing Test Data': AlertTriangle,
  'Missing Environment': AlertTriangle,
  'Missing Runtime Variable': Info,
  'Weak Assertions': AlertCircle,
  'Missing Negative Tests': AlertTriangle,
  'Missing Security Tests': Shield,
  'Missing Boundary Tests': AlertCircle,
  'Missing Business Rules': Info,
  'Unused APIs': Info,
  'Unmapped Datasets': Info,
  'Missing Knowledge Flows': Info,
  'Missing Dependencies': AlertTriangle,
};

const PRIORITY_COLORS: Record<string, string> = {
  High: 'text-red-600 dark:text-red-400',
  Medium: 'text-yellow-600 dark:text-yellow-400',
  Low: 'text-blue-600 dark:text-blue-400',
};

const STATUS_OPTIONS = ['Pending', 'Accepted', 'Dismissed', 'Marked Later'];

export const RecommendationsPage: React.FC<RecommendationsPageProps> = () => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const projectId = routeProjectId || '1';

  const {
    data: recommendations = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useRecommendations(projectId);

  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState<'success' | 'error'>('success');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  const handleRefresh = async () => {
    try {
      await refetch();
      setToastMessage('Recommendations refreshed');
      setToastType('success');
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to refresh recommendations');
      setToastType('error');
    } finally {
      setToastOpen(true);
    }
  };

  const handleStatusChange = async (recommendationId: string, newStatus: string) => {
    // In a real app, this would call an API to update the status
    setToastMessage(`Status updated to ${newStatus}`);
    setToastType('success');
    setToastOpen(true);
  };

  const filteredRecommendations = React.useMemo(() => {
    if (statusFilter === 'all') return recommendations;
    return recommendations.filter((r) => r.status === statusFilter);
  }, [recommendations, statusFilter]);

  if (isLoading) {
    return (
      <div className='mx-auto max-w-7xl px-6 py-8'>
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-text'>Project Recommendations</h1>
            <p className='mt-1 text-sm text-text-secondary'>Deterministic recommendations for project improvement</p>
          </div>
        </div>
        <div className='flex items-center justify-center py-16'>
          <p className='text-sm text-text-secondary'>Loading recommendations...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className='mx-auto max-w-7xl px-6 py-8'>
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-text'>Project Recommendations</h1>
            <p className='mt-1 text-sm text-text-secondary'>Deterministic recommendations for project improvement</p>
          </div>
        </div>
        <div className='flex items-center justify-center py-16'>
          <p className='text-sm text-error'>Error loading recommendations: {error?.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-7xl px-6 py-8'>
      {/* Page Header */}
      <div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Project Recommendations</h1>
          <p className='mt-1 text-sm text-text-secondary'>
            Deterministic recommendations based on project analysis of requirements, designs, and execution plans.
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefetching}>
          <RefreshCw className='mr-2 h-4 w-4' />
          {isRefetching ? 'Analyzing...' : 'Analyze Project'}
        </Button>
      </div>

      {/* Filters */}
      {recommendations.length > 0 && (
        <div className='mb-6 flex items-center gap-3'>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className='rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text'
          >
            <option value='all'>All Recommendations</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <div className='flex items-center gap-4 text-sm'>
            <div className='flex items-center gap-1.5'>
              <div className='h-2.5 w-2.5 rounded-full bg-red-500' />
              <span className='text-text-secondary'>High: {recommendations.filter(r => r.priority === 'High').length}</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <div className='h-2.5 w-2.5 rounded-full bg-yellow-500' />
              <span className='text-text-secondary'>Medium: {recommendations.filter(r => r.priority === 'Medium').length}</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <div className='h-2.5 w-2.5 rounded-full bg-blue-500' />
              <span className='text-text-secondary'>Low: {recommendations.filter(r => r.priority === 'Low').length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Cards */}
      {filteredRecommendations.length === 0 ? (
        <EmptyState
          icon={<Sparkles className='h-12 w-12' />}
          title='No recommendations'
          description={
            recommendations.length === 0
              ? 'Click "Analyze Project" to generate recommendations based on your project structure.'
              : 'No recommendations match the selected filter.'
          }
          action={
            recommendations.length === 0
              ? { label: 'Analyze Project', onClick: handleRefresh }
              : undefined
          }
        />
      ) : (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {filteredRecommendations.map((rec) => {
            const Icon = CATEGORY_ICONS[rec.category] || Info;
            return (
              <Card key={rec.id} className='flex flex-col'>
                <CardHeader className='pb-3'>
                  <div className='flex items-start justify-between'>
                    <div className='flex items-center gap-2'>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        rec.priority === 'High' ? 'bg-red-100 dark:bg-red-900' :
                        rec.priority === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900' :
                        'bg-blue-100 dark:bg-blue-900'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          rec.priority === 'High' ? 'text-red-600 dark:text-red-400' :
                          rec.priority === 'Medium' ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-blue-600 dark:text-blue-400'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className='text-base'>{rec.title}</CardTitle>
                        <p className='text-xs text-text-secondary'>{rec.category}</p>
                      </div>
                    </div>
                    <Badge variant='outline' className={`text-xs font-medium ${PRIORITY_COLORS[rec.priority]}`}>
                      {rec.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className='flex-1 space-y-3'>
                  {/* Reason */}
                  <div>
                    <p className='text-xs font-medium text-text-secondary mb-1'>Reason</p>
                    <p className='text-sm text-text'>{rec.reason}</p>
                  </div>

                  {/* Suggested Action */}
                  <div>
                    <p className='text-xs font-medium text-text-secondary mb-1'>Suggested Action</p>
                    <p className='text-sm text-text'>{rec.suggestedAction}</p>
                  </div>

                  {/* Affected Requirements */}
                  {rec.affectedRequirementIds.length > 0 && (
                    <div>
                      <p className='text-xs font-medium text-text-secondary mb-1'>Affected Requirements</p>
                      <div className='flex flex-wrap gap-1'>
                        {rec.affectedRequirementIds.slice(0, 5).map((reqId) => (
                          <Badge key={reqId} variant='secondary' className='text-xs font-mono'>
                            {reqId.slice(0, 8)}...
                          </Badge>
                        ))}
                        {rec.affectedRequirementIds.length > 5 && (
                          <Badge variant='secondary' className='text-xs'>
                            +{rec.affectedRequirementIds.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Affected APIs */}
                  {rec.affectedApiOperationIds.length > 0 && (
                    <div>
                      <p className='text-xs font-medium text-text-secondary mb-1'>Affected APIs</p>
                      <div className='flex flex-wrap gap-1'>
                        {rec.affectedApiOperationIds.slice(0, 5).map((apiId) => (
                          <Badge key={apiId} variant='outline' className='text-xs font-mono'>
                            {apiId.slice(0, 8)}...
                          </Badge>
                        ))}
                        {rec.affectedApiOperationIds.length > 5 && (
                          <Badge variant='secondary' className='text-xs'>
                            +{rec.affectedApiOperationIds.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>

                {/* Status Footer */}
                <div className='flex items-center justify-between border-t border-border px-4 py-3'>
                  <Badge variant='outline' className='text-xs'>
                    {rec.status}
                  </Badge>
                  <select
                    value={rec.status}
                    onChange={(e) => handleStatusChange(rec.id, e.target.value)}
                    className='rounded-lg border border-border bg-background px-2 py-1 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary'
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Toast */}
      <Toast
        message={toastMessage}
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        type={toastType}
      />
    </div>
  );
};

export default RecommendationsPage;