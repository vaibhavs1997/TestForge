// Requirement Workspace page - displays Suggested, Approved, Archived sections
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Eye, CheckCircle, XCircle, Archive, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Edit2, Trash2, ToggleLeft, ToggleRight, Copy, FlaskConical } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Toast } from '../../../components/shared/Toast';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { useRequirements } from '../hooks';
import { useAnalysis } from '../../analysis/hooks';
import type { Requirement, ApprovalStatus, ValidationCategory, TestStrategy, StrategyCategorySection, StrategyItem, TestDesign, Assertion, RuntimeBinding } from '../types';

export interface RequirementsPageProps {}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'Approved':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'Rejected':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'Archived':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    default:
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
  }
};

const getSourceBadgeVariant = (source: string) => {
  return source === 'ProjectAnalysis'
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
    : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 75) return 'text-green-600 dark:text-green-400';
  if (confidence >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

const getPriorityBadgeVariant = (priority: string) => {
  switch (priority) {
    case 'High':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'Medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'Low':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
  }
};

const STRATEGY_CATEGORIES: StrategyCategorySection['category'][] = [
  'Positive',
  'Negative',
  'Boundary',
  'Business Rules',
  'Security',
  'Validation',
  'Error Handling',
  'Integration',
  'Regression',
  'Performance',
  'Accessibility',
  'Localization',
];

export const RequirementsPage: React.FC<RequirementsPageProps> = () => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const projectId = routeProjectId || '1';

  const { suggested, approved, archived, isLoading, isError, error, generateFromAnalysisAsync, isGenerating, update, remove, validateReadinessAsync, isValidating, validationResult, planTestStrategyAsync, isPlanningStrategy, testStrategy, generateTestDesignsAsync, isGeneratingDesigns, testDesigns } = useRequirements(projectId);
  const { analysisCards, runAnalysisAsync, isAnalyzing } = useAnalysis(projectId);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [requirementToDelete, setRequirementToDelete] = useState<Requirement | undefined>(undefined);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [requirementToReview, setRequirementToReview] = useState<Requirement | undefined>(undefined);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [strategyTab, setStrategyTab] = useState<'review' | 'strategy' | 'design'>('review');

  const handleGenerateFromAnalysis = async (analysisId: string) => {
    try {
      await generateFromAnalysisAsync({ projectId, analysisId });
      setToastMessage('Requirement generated from analysis successfully');
      setToastType('success');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to generate requirement');
      setToastType('error');
    } finally {
      setToastOpen(true);
    }
  };

  const handleStatusChange = async (requirementId: string, status: ApprovalStatus) => {
    try {
      await update({ projectId, requirementId, approvalStatus: status });
      setToastMessage(`Requirement ${status.toLowerCase()} successfully`);
      setToastType('success');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to update requirement');
      setToastType('error');
    } finally {
      setToastOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!requirementToDelete) return;
    try {
      await remove({ projectId, requirementId: requirementToDelete.id });
      setToastMessage('Requirement deleted successfully');
      setToastType('success');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to delete requirement');
      setToastType('error');
    } finally {
      setDeleteOpen(false);
      setToastOpen(true);
    }
  };

  const handleReview = async (requirement: Requirement) => {
    setRequirementToReview(requirement);
    setReviewOpen(true);
    setStrategyTab('review');
    try {
      await validateReadinessAsync({ projectId, requirementId: requirement.id });
    } catch (err: any) {
      // Silently fail validation - it's optional
    }
  };

  const handleRunAnalysis = async () => {
    try {
      await runAnalysisAsync();
      setToastMessage('Project analysis completed. You can now generate requirements from analysis.');
      setToastType('success');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to run analysis');
      setToastType('error');
    } finally {
      setToastOpen(true);
    }
  };

  const handlePlanStrategy = async (requirement: Requirement) => {
    try {
      await planTestStrategyAsync({ projectId, requirementId: requirement.id });
      setToastMessage('Test strategy planned successfully');
      setToastType('success');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to plan test strategy');
      setToastType('error');
    } finally {
      setToastOpen(true);
    }
  };

  const handleGenerateDesigns = async (requirement: Requirement) => {
    try {
      await generateTestDesignsAsync({ projectId, requirementId: requirement.id });
      setToastMessage('Test designs generated successfully');
      setToastType('success');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to generate test designs');
      setToastType('error');
    } finally {
      setToastOpen(true);
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleStrategyItem = (item: StrategyItem) => {
    const newStatus = item.status === 'Enabled' ? 'Disabled' : 'Enabled';
    setToastMessage(`Strategy item ${newStatus.toLowerCase()}`);
    setToastType('success');
    setToastOpen(true);
  };

  const renderRequirementCard = (requirement: Requirement) => (
    <Card key={requirement.id} className='mb-3'>
      <CardContent className='p-4'>
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <div className='flex items-center gap-2 mb-2'>
              <h4 className='text-sm font-semibold text-text'>{requirement.title}</h4>
              <Badge className={getSourceBadgeVariant(requirement.source)} variant='outline'>
                {requirement.source === 'ProjectAnalysis' ? 'From Analysis' : 'Manual'}
              </Badge>
              <Badge className={getStatusBadgeVariant(requirement.approvalStatus)} variant='outline'>
                {requirement.approvalStatus}
              </Badge>
            </div>
            <p className='text-xs text-text-secondary mb-2'>{requirement.description}</p>
            <div className='flex items-center gap-3 text-xs text-text-secondary'>
              <span>Category: {requirement.category}</span>
              <span>Confidence: <span className={getConfidenceColor(requirement.confidence)}>{requirement.confidence}%</span></span>
              <span>Source: {requirement.source}</span>
            </div>
            {requirement.acceptanceCriteria.length > 0 && (
              <div className='mt-2'>
                <p className='text-xs font-medium text-text-secondary mb-1'>Acceptance Criteria ({requirement.acceptanceCriteria.length})</p>
                <ul className='list-disc list-inside text-xs text-text-secondary'>
                  {requirement.acceptanceCriteria.slice(0, 3).map((ac) => (
                    <li key={ac.id}>{ac.text}</li>
                  ))}
                  {requirement.acceptanceCriteria.length > 3 && (
                    <li className='text-text-secondary'>... and {requirement.acceptanceCriteria.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
          <div className='ml-2 flex items-center gap-1'>
            <Button variant='ghost' size='sm' onClick={() => handleReview(requirement)}>
              <Eye className='h-4 w-4' />
            </Button>
            {requirement.approvalStatus === 'Suggested' && (
              <>
                <Button variant='ghost' size='sm' onClick={() => handleStatusChange(requirement.id, 'Approved')}>
                  <CheckCircle className='h-4 w-4 text-green-600' />
                </Button>
                <Button variant='ghost' size='sm' onClick={() => handleStatusChange(requirement.id, 'Rejected')}>
                  <XCircle className='h-4 w-4 text-red-600' />
                </Button>
              </>
            )}
            {(requirement.approvalStatus === 'Approved' || requirement.approvalStatus === 'Rejected') && (
              <Button variant='ghost' size='sm' onClick={() => handleStatusChange(requirement.id, 'Archived')}>
                <Archive className='h-4 w-4' />
              </Button>
            )}
            <Button variant='ghost' size='sm' onClick={() => { setRequirementToDelete(requirement); setDeleteOpen(true); }}>
              <XCircle className='h-4 w-4 text-error' />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderStrategySection = (section: StrategyCategorySection) => {
    const isExpanded = expandedCategories.has(section.category);
    const enabledCount = section.items.filter(item => item.status === 'Enabled').length;

    return (
      <div key={section.category} className='border border-border rounded-lg mb-3'>
        <div className='p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' onClick={() => toggleCategory(section.category)}>
          <div className='flex items-center gap-3'>
            {isExpanded ? <ChevronDown className='h-5 w-5' /> : <ChevronRight className='h-5 w-5' />}
            <h4 className='font-semibold text-text'>{section.category}</h4>
            <Badge variant='secondary'>{enabledCount}/{section.items.length}</Badge>
          </div>
        </div>
        {isExpanded && (
          <div className='px-4 pb-4 space-y-2'>
            {section.items.map((item) => (
              <div key={item.id} className='border border-border rounded p-3 bg-white dark:bg-gray-900'>
                <div className='flex items-start justify-between'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2 mb-1'>
                      <h5 className='text-sm font-medium text-text'>{item.title}</h5>
                      <Badge className={getPriorityBadgeVariant(item.priority)} variant='outline'>
                        {item.priority}
                      </Badge>
                    </div>
                    <p className='text-xs text-text-secondary mb-2'>{item.reason}</p>
                    {item.relatedApis.length > 0 && (
                      <div className='flex items-center gap-2 mb-1'>
                        <span className='text-xs font-medium text-text-secondary'>APIs:</span>
                        {item.relatedApis.map((api, idx) => (
                          <Badge key={idx} variant='outline' className='text-xs'>{api}</Badge>
                        ))}
                      </div>
                    )}
                    {item.relatedData.length > 0 && (
                      <div className='flex items-center gap-2'>
                        <span className='text-xs font-medium text-text-secondary'>Data:</span>
                        {item.relatedData.map((data, idx) => (
                          <Badge key={idx} variant='outline' className='text-xs'>{data}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className='ml-2 flex items-center gap-1'>
                    <Button variant='ghost' size='sm' onClick={() => toggleStrategyItem(item)}>
                      {item.status === 'Enabled' ? <ToggleRight className='h-4 w-4 text-green-600' /> : <ToggleLeft className='h-4 w-4 text-gray-400' />}
                    </Button>
                    <Button variant='ghost' size='sm'>
                      <Edit2 className='h-4 w-4' />
                    </Button>
                    <Button variant='ghost' size='sm'>
                      <Trash2 className='h-4 w-4 text-error' />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className='mx-auto max-w-7xl px-6 py-8'>
        <h1 className='text-2xl font-bold text-text mb-6'>Requirement Workspace</h1>
        <div className='flex items-center justify-center py-16'>
          <p className='text-sm text-text-secondary'>Loading requirements...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className='mx-auto max-w-7xl px-6 py-8'>
        <h1 className='text-2xl font-bold text-text mb-6'>Requirement Workspace</h1>
        <div className='flex items-center justify-center py-16'>
          <p className='text-sm text-error'>Error loading requirements: {error?.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-7xl px-6 py-8'>
      {/* Page Header */}
      <div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Requirement Workspace</h1>
          <p className='mt-1 text-sm text-text-secondary'>
            Review and approve requirements generated from Project Analysis or created manually.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={handleRunAnalysis} disabled={isAnalyzing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyzing...' : 'Re-analyze Project'}
          </Button>
          {analysisCards.length > 0 && (
            <Button variant='outline' onClick={() => handleGenerateFromAnalysis(analysisCards[0].id)} disabled={isGenerating}>
              <Sparkles className='mr-2 h-4 w-4' />
              {isGenerating ? 'Generating...' : 'Generate from Analysis'}
            </Button>
          )}
          <Button>
            <Plus className='mr-2 h-4 w-4' />
            Add Requirement
          </Button>
        </div>
      </div>

      {/* Suggested Section */}
      <div className='mb-8'>
        <div className='flex items-center gap-2 mb-4'>
          <h2 className='text-lg font-semibold text-text'>Suggested</h2>
          <Badge variant='secondary'>{suggested.length}</Badge>
        </div>
        {suggested.length === 0 ? (
          <EmptyState
            icon={<Sparkles className='h-8 w-8' />}
            title='No suggested requirements'
            description='Run project analysis to generate suggested requirements, or create them manually.'
            action={analysisCards.length > 0 ? { label: 'Generate from Analysis', onClick: () => handleGenerateFromAnalysis(analysisCards[0].id) } : undefined}
          />
        ) : (
          suggested.map(renderRequirementCard)
        )}
      </div>

      {/* Approved Section */}
      <div className='mb-8'>
        <div className='flex items-center gap-2 mb-4'>
          <h2 className='text-lg font-semibold text-text'>Approved</h2>
          <Badge variant='secondary'>{approved.length}</Badge>
        </div>
        {approved.length === 0 ? (
          <Card className='p-6 text-center'>
            <p className='text-sm text-text-secondary'>No approved requirements yet. Approve suggested requirements to see them here.</p>
          </Card>
        ) : (
          approved.map(renderRequirementCard)
        )}
      </div>

      {/* Archived Section */}
      <div>
        <div className='flex items-center gap-2 mb-4'>
          <h2 className='text-lg font-semibold text-text'>Archived</h2>
          <Badge variant='secondary'>{archived.length}</Badge>
        </div>
        {archived.length === 0 ? (
          <Card className='p-6 text-center'>
            <p className='text-sm text-text-secondary'>No archived requirements.</p>
          </Card>
        ) : (
          archived.map(renderRequirementCard)
        )}
      </div>

      {/* Review Dialog */}
      {requirementToReview && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50' onClick={() => setReviewOpen(false)}>
          <div className='max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-gray-800' onClick={(e) => e.stopPropagation()}>
            <div className='mb-4 flex items-start justify-between'>
              <div>
                <h3 className='text-lg font-semibold text-text'>{requirementToReview.title}</h3>
                <p className='text-sm text-text-secondary'>{requirementToReview.description}</p>
              </div>
              <button onClick={() => setReviewOpen(false)} className='text-text-secondary hover:text-text'>✕</button>
            </div>

            {/* Tabs */}
            <div className='flex gap-2 mb-4 border-b border-border'>
              <button
                className={`px-4 py-2 text-sm font-medium ${strategyTab === 'review' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}
                onClick={() => setStrategyTab('review')}
              >
                Readiness
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${strategyTab === 'strategy' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}
                onClick={() => setStrategyTab('strategy')}
              >
                Test Strategy
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${strategyTab === 'design' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}
                onClick={() => setStrategyTab('design')}
              >
                Test Design
              </button>
            </div>

            {/* Readiness Tab */}
            {strategyTab === 'review' && (
              <>
                {/* Overall Status */}
                {validationResult && validationResult.requirementId === requirementToReview.id && (
                  <div className='mb-4 rounded-lg border-2 border-dashed p-4'>
                    <div className='flex items-center gap-2 mb-2'>
                      <span className='text-sm font-semibold text-text'>Overall Status:</span>
                      <Badge className={validationResult.overallStatus === 'READY' ? 'bg-green-100 text-green-700' : validationResult.overallStatus === 'INCOMPLETE' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                        {validationResult.overallStatus}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Validation Categories */}
                {validationResult && validationResult.requirementId === requirementToReview.id && (
                  <div className='space-y-3'>
                    {validationResult.categories.map((category: ValidationCategory) => (
                      <div key={category.name} className='rounded-lg border border-border p-4'>
                        <div className='flex items-center gap-2 mb-2'>
                          {category.status === 'READY' && <CheckCircle2 className='h-5 w-5 text-green-600' />}
                          {category.status === 'MISSING' && <XCircle className='h-5 w-5 text-red-600' />}
                          {category.status === 'WARNING' && <AlertTriangle className='h-5 w-5 text-yellow-600' />}
                          <h4 className='font-semibold text-text'>{category.name}</h4>
                          <Badge className={category.status === 'READY' ? 'bg-green-100 text-green-700' : category.status === 'MISSING' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                            {category.status}
                          </Badge>
                        </div>
                        <ul className='space-y-1'>
                          {category.details.map((detail: string, idx: number) => (
                            <li key={idx} className='text-xs text-text-secondary'>• {detail}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Test Strategy Tab */}
            {strategyTab === 'strategy' && (
              <div>
                {testStrategy && testStrategy.requirementId === requirementToReview.id ? (
                  <div>
                    <div className='flex items-center justify-between mb-4'>
                      <h4 className='font-semibold text-text'>Test Strategy</h4>
                      <Button size='sm' variant='outline'>Add Custom Item</Button>
                    </div>
                    {testStrategy.sections.map(renderStrategySection)}
                  </div>
                ) : (
                  <div className='text-center py-8'>
                    <p className='text-sm text-text-secondary mb-4'>No test strategy planned yet.</p>
                    <Button onClick={() => handlePlanStrategy(requirementToReview)} disabled={isPlanningStrategy}>
                      {isPlanningStrategy ? 'Planning...' : 'Plan Test Strategy'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Test Design Tab */}
            {strategyTab === 'design' && (
              <div>
                {testDesigns && testDesigns.length > 0 ? (
                  <div>
                    <div className='flex items-center justify-between mb-4'>
                      <h4 className='font-semibold text-text'>Test Designs ({testDesigns.length})</h4>
                    </div>
                    {testDesigns.map((design: TestDesign) => (
                      <div key={design.id} className='border border-border rounded-lg p-4 mb-3'>
                        <div className='flex items-start justify-between mb-3'>
                          <div className='flex-1'>
                            <div className='flex items-center gap-2 mb-2'>
                              <FlaskConical className='h-5 w-5 text-primary' />
                              <h5 className='text-sm font-semibold text-text'>Design {design.id.slice(0, 8)}</h5>
                              <Badge className={getPriorityBadgeVariant(design.priority)} variant='outline'>
                                {design.priority}
                              </Badge>
                              <Badge variant='outline' className={design.status === 'Ready' ? 'bg-green-100 text-green-700' : design.status === 'Disabled' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'}>
                                {design.status}
                              </Badge>
                            </div>
                          </div>
                          <div className='ml-2 flex items-center gap-1'>
                            <Button variant='ghost' size='sm'>
                              <Edit2 className='h-4 w-4' />
                            </Button>
                            <Button variant='ghost' size='sm'>
                              <Copy className='h-4 w-4' />
                            </Button>
                            <Button variant='ghost' size='sm'>
                              {design.status === 'Ready' ? <ToggleRight className='h-4 w-4 text-green-600' /> : <ToggleLeft className='h-4 w-4 text-gray-400' />}
                            </Button>
                          </div>
                        </div>
                        <div className='grid grid-cols-2 gap-3 text-xs'>
                          <div>
                            <span className='font-medium text-text-secondary'>API:</span>
                            <p className='text-text'>{design.operationId || 'N/A'}</p>
                          </div>
                          <div>
                            <span className='font-medium text-text-secondary'>Environment:</span>
                            <p className='text-text'>{design.environmentId || 'N/A'}</p>
                          </div>
                          <div>
                            <span className='font-medium text-text-secondary'>Dataset:</span>
                            <p className='text-text'>{design.datasetId || 'N/A'}</p>
                          </div>
                          <div>
                            <span className='font-medium text-text-secondary'>Row Reference:</span>
                            <p className='text-text'>{design.datasetRowReference || 'N/A'}</p>
                          </div>
                        </div>
                        {design.assertions.length > 0 && (
                          <div className='mt-3'>
                            <span className='text-xs font-medium text-text-secondary'>Assertions:</span>
                            <ul className='mt-1 space-y-1'>
                              {design.assertions.map((assertion: Assertion, idx: number) => (
                                <li key={idx} className='text-xs text-text-secondary'>
                                  • {assertion.type} {assertion.operator} {assertion.path} → {String(assertion.expected)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {design.runtimeBindings.length > 0 && (
                          <div className='mt-3'>
                            <span className='text-xs font-medium text-text-secondary'>Runtime Variables:</span>
                            <ul className='mt-1 space-y-1'>
                              {design.runtimeBindings.map((binding: RuntimeBinding, idx: number) => (
                                <li key={idx} className='text-xs text-text-secondary'>
                                  • {binding.variable} ({binding.source}) {binding.path || ''}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8'>
                    <p className='text-sm text-text-secondary mb-4'>No test designs generated yet.</p>
                    <Button onClick={() => handleGenerateDesigns(requirementToReview)} disabled={isGeneratingDesigns}>
                      {isGeneratingDesigns ? 'Generating...' : 'Generate Test Designs'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Acceptance Criteria */}
            <div className='mt-4'>
              <h4 className='font-semibold text-text mb-2'>Acceptance Criteria</h4>
              <ul className='space-y-1'>
                {requirementToReview.acceptanceCriteria.map((ac) => (
                  <li key={ac.id} className='text-sm text-text-secondary'>• {ac.text}</li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className='mt-6 flex items-center gap-2'>
              {requirementToReview.approvalStatus === 'Suggested' && (
                <>
                  <Button onClick={() => { handleStatusChange(requirementToReview.id, 'Approved'); setReviewOpen(false); }}>
                    <CheckCircle className='mr-2 h-4 w-4' /> Approve
                  </Button>
                  <Button variant='outline' onClick={() => { handleStatusChange(requirementToReview.id, 'Rejected'); setReviewOpen(false); }}>
                    <XCircle className='mr-2 h-4 w-4' /> Reject
                  </Button>
                </>
              )}
              {(requirementToReview.approvalStatus === 'Approved' || requirementToReview.approvalStatus === 'Rejected') && (
                <Button variant='outline' onClick={() => { handleStatusChange(requirementToReview.id, 'Archived'); setReviewOpen(false); }}>
                  <Archive className='mr-2 h-4 w-4' /> Archive
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ConfirmDialog
        open={deleteOpen}
        title='Delete Requirement'
        message={`Deleting "${requirementToDelete?.title}" cannot be undone.`}
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

export default RequirementsPage;