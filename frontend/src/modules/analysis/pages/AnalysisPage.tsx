// AI Project Analysis page - displays deterministic analysis cards
import React from 'react';
import { useParams } from 'react-router-dom';
import {
  Sparkles,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  Shield,
  ShoppingCart,
  CreditCard,
  Package,
  Bell,
  Users,
  Search as SearchIcon,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Toast } from '../../../components/shared/Toast';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { useAnalysis } from '../hooks';
import type { AnalysisStatus, AnalysisCard } from '../types';

export interface AnalysisPageProps {}

const CATEGORY_ICONS: Record<string, React.FC<any>> = {
  Authentication: Shield,
  Registration: Users,
  Orders: ShoppingCart,
  Payments: CreditCard,
  Products: Package,
  Notifications: Bell,
  'User Management': Users,
  Search: SearchIcon,
};

const STATUS_OPTIONS: AnalysisStatus[] = ['Pending', 'Reviewed', 'Accepted', 'Rejected'];

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'Accepted':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'Rejected':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'Reviewed':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    default:
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Accepted':
      return <CheckCircle className='h-3.5 w-3.5' />;
    case 'Rejected':
      return <XCircle className='h-3.5 w-3.5' />;
    case 'Reviewed':
      return <Eye className='h-3.5 w-3.5' />;
    default:
      return <Clock className='h-3.5 w-3.5' />;
  }
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 75) return 'text-green-600 dark:text-green-400';
  if (confidence >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

export const AnalysisPage: React.FC<AnalysisPageProps> = () => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const projectId = routeProjectId || '1';

  const {
    analysisCards,
    isLoading,
    isError,
    error,
    runAnalysisAsync,
    isAnalyzing,
    updateStatusAsync,
    removeAsync,
  } = useAnalysis(projectId);

  const [toastOpen, setToastOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState<'success' | 'error'>('success');
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [cardToDelete, setCardToDelete] = React.useState<AnalysisCard | undefined>(undefined);

  const handleRunAnalysis = async () => {
    try {
      await runAnalysisAsync();
      setToastMessage('Project analysis completed successfully');
      setToastType('success');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to run analysis');
      setToastType('error');
    } finally {
      setToastOpen(true);
    }
  };

  const handleStatusChange = async (analysisId: string, status: AnalysisStatus) => {
    try {
      await updateStatusAsync({ analysisId, status });
      setToastMessage(`Status updated to ${status}`);
      setToastType('success');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to update status');
      setToastType('error');
    } finally {
      setToastOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!cardToDelete) return;
    try {
      await removeAsync(cardToDelete.id);
      setToastMessage('Analysis card deleted successfully');
      setToastType('success');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to delete analysis card');
      setToastType('error');
    } finally {
      setDeleteOpen(false);
      setToastOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className='mx-auto max-w-7xl px-6 py-8'>
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-text'>AI Project Analysis</h1>
            <p className='mt-1 text-sm text-text-secondary'>Deterministic analysis of your project's behavior</p>
          </div>
        </div>
        <div className='flex items-center justify-center py-16'>
          <p className='text-sm text-text-secondary'>Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className='mx-auto max-w-7xl px-6 py-8'>
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-text'>AI Project Analysis</h1>
            <p className='mt-1 text-sm text-text-secondary'>Deterministic analysis of your project's behavior</p>
          </div>
        </div>
        <div className='flex items-center justify-center py-16'>
          <p className='text-sm text-error'>Error loading analysis: {error?.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-7xl px-6 py-8'>
      {/* Page Header */}
      <div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold text-text'>AI Project Analysis</h1>
          <p className='mt-1 text-sm text-text-secondary'>
            Deterministic analysis of your project's behavior based on imported APIs, Knowledge Flows, and Datasets.
          </p>
        </div>
        <Button onClick={handleRunAnalysis} disabled={isAnalyzing}>
          <Sparkles className='mr-2 h-4 w-4' />
          {isAnalyzing ? 'Analyzing...' : 'Analyze Project'}
        </Button>
      </div>

      {/* Analysis Cards */}
      {analysisCards.length === 0 ? (
        <EmptyState
          icon={<Sparkles className='h-12 w-12' />}
          title='No analysis yet'
          description='Run the project analyzer to generate analysis cards based on your imported APIs, Knowledge Flows, and Datasets.'
          action={{ label: 'Analyze Project', onClick: handleRunAnalysis }}
        />
      ) : (
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {analysisCards.map((card) => {
            const Icon = CATEGORY_ICONS[card.category] || Sparkles;
            return (
              <Card key={card.id} className='flex flex-col'>
                <CardHeader className='pb-3'>
                  <div className='flex items-start justify-between'>
                    <div className='flex items-center gap-2'>
                      <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10'>
                        <Icon className='h-5 w-5 text-primary' />
                      </div>
                      <div>
                        <CardTitle className='text-base'>{card.title}</CardTitle>
                        <p className='text-xs text-text-secondary'>{card.category}</p>
                      </div>
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 w-8 p-0'
                      onClick={() => { setCardToDelete(card); setDeleteOpen(true); }}
                      aria-label='Delete analysis card'
                    >
                      <Trash2 className='h-4 w-4 text-error' />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className='flex-1 space-y-3'>
                  {/* Description */}
                  <p className='text-sm text-text-secondary'>{card.description}</p>

                  {/* Confidence */}
                  <div className='flex items-center justify-between'>
                    <span className='text-xs font-medium text-text-secondary'>Confidence</span>
                    <span className={`text-sm font-bold ${getConfidenceColor(card.confidence)}`}>
                      {card.confidence}%
                    </span>
                  </div>
                  <div className='h-1.5 w-full overflow-hidden rounded-full bg-surface'>
                    <div
                      className={`h-full rounded-full ${
                        card.confidence >= 75 ? 'bg-green-500' : card.confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${card.confidence}%` }}
                    />
                  </div>

                  {/* Detected APIs */}
                  <div>
                    <p className='mb-1 text-xs font-medium text-text-secondary'>Detected APIs</p>
                    {card.relatedOperations.length > 0 ? (
                      <div className='flex flex-wrap gap-1'>
                        {card.relatedOperations.slice(0, 5).map((opId) => (
                          <Badge key={opId} variant='outline' className='text-xs font-mono'>
                            {opId.slice(0, 8)}...
                          </Badge>
                        ))}
                        {card.relatedOperations.length > 5 && (
                          <Badge variant='secondary' className='text-xs'>
                            +{card.relatedOperations.length - 5} more
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <p className='text-xs text-text-secondary'>None detected</p>
                    )}
                  </div>

                  {/* Related Business Flows */}
                  <div>
                    <p className='mb-1 text-xs font-medium text-text-secondary'>Related Business Flows</p>
                    {card.relatedFlows.length > 0 ? (
                      <div className='flex flex-wrap gap-1'>
                        {card.relatedFlows.map((flowId) => (
                          <Badge key={flowId} variant='secondary' className='text-xs font-mono'>
                            {flowId.slice(0, 8)}...
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className='text-xs text-text-secondary'>None detected</p>
                    )}
                  </div>

                  {/* Related Datasets */}
                  <div>
                    <p className='mb-1 text-xs font-medium text-text-secondary'>Related Datasets</p>
                    {card.relatedDatasets.length > 0 ? (
                      <div className='flex flex-wrap gap-1'>
                        {card.relatedDatasets.map((dsId) => (
                          <Badge key={dsId} variant='secondary' className='text-xs font-mono'>
                            {dsId.slice(0, 8)}...
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className='text-xs text-text-secondary'>None detected</p>
                    )}
                  </div>

                  {/* Related Runtime Variables */}
                  <div>
                    <p className='mb-1 text-xs font-medium text-text-secondary'>Related Runtime Variables</p>
                    {card.relatedRuntimeVariables.length > 0 ? (
                      <div className='flex flex-wrap gap-1'>
                        {card.relatedRuntimeVariables.map((v) => (
                          <Badge key={v} variant='outline' className='text-xs font-mono'>
                            {v}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className='text-xs text-text-secondary'>None detected</p>
                    )}
                  </div>
                </CardContent>

                {/* Status Footer */}
                <div className='flex items-center justify-between border-t border-border px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <Badge className={getStatusBadgeVariant(card.status)} variant='outline'>
                      <span className='flex items-center gap-1'>
                        {getStatusIcon(card.status)}
                        {card.status}
                      </span>
                    </Badge>
                  </div>
                  <select
                    value={card.status}
                    onChange={(e) => handleStatusChange(card.id, e.target.value as AnalysisStatus)}
                    className='rounded-lg border border-border bg-background px-2 py-1 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary'
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <ConfirmDialog
        open={deleteOpen}
        title='Delete Analysis Card'
        message={`Deleting "${cardToDelete?.title}" cannot be undone.`}
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
        type={toastType}
      />
    </div>
  );
};

export default AnalysisPage;