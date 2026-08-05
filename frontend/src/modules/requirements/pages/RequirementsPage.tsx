// Requirement Workspace page - displays Suggested, Approved, Archived sections
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Eye, CheckCircle, XCircle, Archive, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Edit2, Trash2, ToggleLeft, ToggleRight, Copy, FlaskConical, ArrowUp, ArrowDown, GitBranch, Clock } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Toast } from '../../../components/shared/Toast';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { useRequirements } from '../hooks';
import { useAnalysis } from '../../analysis/hooks';
import { useAssertions } from '../../assertion/hooks/useAssertions';
import { useAIProviders } from '../../ai-provider/hooks';
import { requirementService } from '../services/requirementService';
import type { Requirement, ApprovalStatus, ValidationCategory, TestStrategy, StrategyCategorySection, StrategyItem, TestDesign, Assertion, RuntimeBinding, ExecutionPlan, CleanupStep, AssertionReference } from '../types';
import type { Assertion as ReusableAssertion } from '../../assertion/types';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../constants';

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

const getExecutionStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'Ready':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'Disabled':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    default:
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
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
  const queryClient = useQueryClient();

  const breadcrumbItems = [
    { label: 'Projects', to: '/projects' },
    { label: 'Project', to: `/projects/${projectId}/overview` },
    { label: 'Requirements' },
  ];

  const { suggested, approved, archived, isLoading, isError, error, generateFromAnalysisAsync, isGenerating, update, remove, validateReadinessAsync, isValidating, validationResult, planTestStrategyAsync, isPlanningStrategy, testStrategy, generateTestDesignsAsync, isGeneratingDesigns, testDesigns, planExecutionAsync, isPlanningExecution, executionPlans } = useRequirements(projectId);
  const { analysisCards, runAnalysisAsync, isAnalyzing } = useAnalysis(projectId);
  const { assertions: reusableAssertions } = useAssertions(projectId);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [requirementToDelete, setRequirementToDelete] = useState<Requirement | undefined>(undefined);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [requirementToReview, setRequirementToReview] = useState<Requirement | undefined>(undefined);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [strategyTab, setStrategyTab] = useState<'review' | 'strategy' | 'design' | 'execution'>('review');
  const [attachAssertionOpen, setAttachAssertionOpen] = useState(false);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [selectedAssertionIds, setSelectedAssertionIds] = useState<Set<string>>(new Set());
  const [assertionFilterCategory, setAssertionFilterCategory] = useState<string>('all');
  const [assertionFilterSeverity, setAssertionFilterSeverity] = useState<string>('all');
  const { providers: aiProviders } = useAIProviders(projectId);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [selectedAIProviderId, setSelectedAIProviderId] = useState<string>('');
  const [aiPreview, setAiPreview] = useState<any>(null);
  const [aiGeneratedRequirements, setAiGeneratedRequirements] = useState<Requirement[]>([]);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStep, setAiStep] = useState<'select' | 'preview' | 'result'>('select');
  const [aiStrategyModalOpen, setAiStrategyModalOpen] = useState(false);
  const [aiStrategyProviderId, setAiStrategyProviderId] = useState<string>('');
  const [aiStrategyPreview, setAiStrategyPreview] = useState<any>(null);
  const [aiStrategyWarnings, setAiStrategyWarnings] = useState<string[]>([]);
  const [aiStrategyStep, setAiStrategyStep] = useState<'select' | 'preview' | 'result'>('select');
  const [aiStrategyResult, setAiStrategyResult] = useState<any>(null);
  const [aiDesignModalOpen, setAiDesignModalOpen] = useState(false);
  const [aiDesignProviderId, setAiDesignProviderId] = useState<string>('');
  const [aiDesignPreview, setAiDesignPreview] = useState<any>(null);
  const [aiDesignWarnings, setAiDesignWarnings] = useState<string[]>([]);
  const [aiDesignStep, setAiDesignStep] = useState<'select' | 'preview' | 'result'>('select');
  const [aiDesignResult, setAiDesignResult] = useState<any>(null);

  const [designToReview, setDesignToReview] = useState<TestDesign | null>(null);
  const [aiAssertionModalOpen, setAiAssertionModalOpen] = useState(false);
  const [aiAssertionProviderId, setAiAssertionProviderId] = useState<string>('');
  const [aiAssertionPreview, setAiAssertionPreview] = useState<any>(null);
  const [aiAssertionWarnings, setAiAssertionWarnings] = useState<string[]>([]);
  const [aiAssertionStep, setAiAssertionStep] = useState<'select' | 'preview' | 'result'>('select');
  const [aiAssertionResult, setAiAssertionResult] = useState<any>(null);

  const [aiExecutionPlanModalOpen, setAiExecutionPlanModalOpen] = useState(false);
  const [aiExecutionPlanProviderId, setAiExecutionPlanProviderId] = useState<string>('');
  const [aiExecutionPlanPreview, setAiExecutionPlanPreview] = useState<any>(null);
  const [aiExecutionPlanWarnings, setAiExecutionPlanWarnings] = useState<string[]>([]);
  const [aiExecutionPlanStep, setAiExecutionPlanStep] = useState<'select' | 'preview' | 'result'>('select');
  const [aiExecutionPlanResult, setAiExecutionPlanResult] = useState<any>(null);

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

  const handlePlanExecution = async (requirement: Requirement) => {
    try {
      await planExecutionAsync({ projectId, requirementId: requirement.id });
      setToastMessage('Execution plans generated successfully');
      setToastType('success');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to generate execution plans');
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

  const openAIGenerate = () => {
    setAiStep('select');
    setAiPreview(null);
    setAiWarnings([]);
    setAiGeneratedRequirements([]);
    setSelectedAIProviderId(aiProviders.find(p => p.isDefault)?.id || aiProviders[0]?.id || '');
    setAiModalOpen(true);
  };

  const handleAIPreview = async () => {
    if (!selectedAIProviderId) return;
    setAiLoading(true);
    setAiWarnings([]);
    try {
      const result = await requirementService.generateWithAI(projectId, { providerId: selectedAIProviderId, previewOnly: true });
      setAiPreview(result.data?.preview || null);
      setAiWarnings(result.data?.warnings || result.warnings || []);
      setAiStep('preview');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to preview AI generation');
      setToastType('error');
      setToastOpen(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!selectedAIProviderId) return;
    setAiLoading(true);
    setAiWarnings([]);
    try {
      const result = await requirementService.generateWithAI(projectId, { providerId: selectedAIProviderId, previewOnly: false });
      setAiGeneratedRequirements(result.data?.requirements || []);
      setAiWarnings(result.data?.warnings || result.warnings || []);
      setAiStep('result');
      setToastMessage(`Generated ${(result.data?.requirements || []).length} requirements with AI`);
      setToastType('success');
      setToastOpen(true);
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to generate requirements with AI');
      setToastType('error');
      setToastOpen(true);
    } finally {
      setAiLoading(false);
    }
  };

  const openAIStrategy = (requirement: Requirement) => {
    setAiStrategyStep('select');
    setAiStrategyPreview(null);
    setAiStrategyWarnings([]);
    setAiStrategyResult(null);
    setAiStrategyProviderId(aiProviders.find(p => p.isDefault)?.id || aiProviders[0]?.id || '');
    setRequirementToReview(requirement);
    setAiStrategyModalOpen(true);
  };

  const handleAIStrategyPreview = async () => {
    if (!aiStrategyProviderId || !requirementToReview) return;
    setAiLoading(true);
    setAiStrategyWarnings([]);
    try {
      const result = await requirementService.generateStrategyWithAI(projectId, requirementToReview.id, { providerId: aiStrategyProviderId, previewOnly: true });
      setAiStrategyPreview(result.data?.preview || null);
      setAiStrategyWarnings(result.data?.warnings || result.warnings || []);
      setAiStrategyStep('preview');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to preview AI strategy generation');
      setToastType('error');
      setToastOpen(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIStrategyGenerate = async () => {
    if (!aiStrategyProviderId || !requirementToReview) return;
    setAiLoading(true);
    setAiStrategyWarnings([]);
    try {
      const result = await requirementService.generateStrategyWithAI(projectId, requirementToReview.id, { providerId: aiStrategyProviderId, previewOnly: false });
      setAiStrategyResult(result.data?.strategy || null);
      setAiStrategyWarnings(result.data?.warnings || result.warnings || []);
      setAiStrategyStep('result');
      setToastMessage('Test strategy generated with AI successfully');
      setToastType('success');
      setToastOpen(true);
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to generate test strategy with AI');
      setToastType('error');
      setToastOpen(true);
    } finally {
      setAiLoading(false);
    }
  };

  const openAIDesign = (requirement: Requirement) => {
    setAiDesignStep('select');
    setAiDesignPreview(null);
    setAiDesignWarnings([]);
    setAiDesignResult(null);
    setAiDesignProviderId(aiProviders.find(p => p.isDefault)?.id || aiProviders[0]?.id || '');
    setRequirementToReview(requirement);
    setAiDesignModalOpen(true);
  };

  const openAIAssertions = (design: TestDesign) => {
    setDesignToReview(design);
    setAiAssertionStep('select');
    setAiAssertionPreview(null);
    setAiAssertionWarnings([]);
    setAiAssertionResult(null);
    setAiAssertionProviderId(aiProviders.find(p => p.isDefault)?.id || aiProviders[0]?.id || '');
    setAiAssertionModalOpen(true);
  };

  const handleAIDesignPreview = async () => {
    if (!aiDesignProviderId || !requirementToReview) return;
    setAiLoading(true);
    setAiDesignWarnings([]);
    try {
      const result = await requirementService.generateDesignWithAI(projectId, requirementToReview.id, { providerId: aiDesignProviderId, previewOnly: true });
      setAiDesignPreview(result.data?.preview || null);
      setAiDesignWarnings(result.data?.warnings || result.warnings || []);
      setAiDesignStep('preview');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to preview AI design generation');
      setToastType('error');
      setToastOpen(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIDesignGenerate = async () => {
    if (!aiDesignProviderId || !requirementToReview) return;
    setAiLoading(true);
    setAiDesignWarnings([]);
    try {
      const result = await requirementService.generateDesignWithAI(projectId, requirementToReview.id, { providerId: aiDesignProviderId, previewOnly: false });
      setAiDesignResult(result.data?.designs || []);
      setAiDesignWarnings(result.data?.warnings || result.warnings || []);
      setAiDesignStep('result');
      setToastMessage('Test designs generated with AI successfully');
      setToastType('success');
      setToastOpen(true);
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to generate test designs with AI');
      setToastType('error');
      setToastOpen(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIAssertionPreview = async () => {
    if (!aiAssertionProviderId || !designToReview) return;
    setAiLoading(true);
    setAiAssertionWarnings([]);
    try {
      const result = await requirementService.generateAssertionsWithAI(projectId, designToReview.id, { providerId: aiAssertionProviderId, previewOnly: true });
      setAiAssertionPreview(result.data?.preview || null);
      setAiAssertionWarnings(result.data?.warnings || result.warnings || []);
      setAiAssertionStep('preview');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to preview AI assertion generation');
      setToastType('error');
      setToastOpen(true);
    } finally {
      setAiLoading(false);
    }
  };

  const openAIExecutionPlan = (requirement: Requirement) => {
    setAiExecutionPlanStep('select');
    setAiExecutionPlanPreview(null);
    setAiExecutionPlanWarnings([]);
    setAiExecutionPlanResult(null);
    setAiExecutionPlanProviderId(aiProviders.find(p => p.isDefault)?.id || aiProviders[0]?.id || '');
    setRequirementToReview(requirement);
    setAiExecutionPlanModalOpen(true);
  };

  const handleAIExecutionPlanPreview = async () => {
    if (!aiExecutionPlanProviderId || !requirementToReview) return;
    setAiLoading(true);
    setAiExecutionPlanWarnings([]);
    try {
      const result = await requirementService.generateExecutionPlanWithAI(projectId, requirementToReview.id, { providerId: aiExecutionPlanProviderId, previewOnly: true });
      setAiExecutionPlanPreview(result.data?.preview || null);
      setAiExecutionPlanWarnings(result.data?.warnings || result.warnings || []);
      setAiExecutionPlanStep('preview');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to preview AI execution plan generation');
      setToastType('error');
      setToastOpen(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIExecutionPlanGenerate = async () => {
    if (!aiExecutionPlanProviderId || !requirementToReview) return;
    setAiLoading(true);
    setAiExecutionPlanWarnings([]);
    try {
      const result = await requirementService.generateExecutionPlanWithAI(projectId, requirementToReview.id, { providerId: aiExecutionPlanProviderId, previewOnly: false });
      setAiExecutionPlanResult(result.data?.plans || []);
      setAiExecutionPlanWarnings(result.data?.warnings || result.warnings || []);
      setAiExecutionPlanStep('result');
      setToastMessage(`Generated ${(result.data?.plans || []).length} execution plans with AI`);
      setToastType('success');
      setToastOpen(true);
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to generate execution plans with AI');
      setToastType('error');
      setToastOpen(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIAssertionGenerate = async () => {
    if (!aiAssertionProviderId || !designToReview) return;
    setAiLoading(true);
    setAiAssertionWarnings([]);
    try {
      const result = await requirementService.generateAssertionsWithAI(projectId, designToReview.id, { providerId: aiAssertionProviderId, previewOnly: false });
      setAiAssertionResult(result.data?.assertions || []);
      setAiAssertionWarnings(result.data?.warnings || result.warnings || []);
      setAiAssertionStep('result');
      setToastMessage('Assertions generated with AI successfully');
      setToastType('success');
      setToastOpen(true);
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to generate assertions with AI');
      setToastType('error');
      setToastOpen(true);
    } finally {
      setAiLoading(false);
    }
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

  const renderExecutionTimeline = (plans: ExecutionPlan[]) => {
    const sortedPlans = [...plans].sort((a, b) => a.executionOrder - b.executionOrder);
    
    return (
      <div className='relative'>
        {/* Vertical line */}
        <div className='absolute left-6 top-0 bottom-0 w-0.5 bg-border' />
        
        {sortedPlans.map((plan, idx) => (
          <div key={plan.id} className='relative flex gap-4 mb-6 last:mb-0'>
            {/* Step number circle */}
            <div className='flex-shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm z-10'>
              {plan.executionOrder}
            </div>
            
            {/* Plan card */}
            <div className='flex-1 border border-border rounded-lg p-4 bg-white dark:bg-gray-900'>
              <div className='flex items-start justify-between mb-3'>
                <div className='flex-1'>
                  <div className='flex items-center gap-2 mb-2'>
                    <GitBranch className='h-4 w-4 text-primary' />
                    <h5 className='text-sm font-semibold text-text'>
                      {plan.requestTemplate.method} {plan.requestTemplate.path}
                    </h5>
                    <Badge variant='outline' className={getExecutionStatusBadgeVariant(plan.status)}>
                      {plan.status}
                    </Badge>
                  </div>
                  
                  {/* Details grid */}
                  <div className='grid grid-cols-2 gap-2 text-xs mb-3'>
                    <div>
                      <span className='font-medium text-text-secondary'>Environment:</span>
                      <p className='text-text'>{plan.environmentId || 'N/A'}</p>
                    </div>
                    <div>
                      <span className='font-medium text-text-secondary'>Dataset:</span>
                      <p className='text-text'>{plan.datasetId || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Prerequisites */}
                  {plan.prerequisiteDesignIds.length > 0 && (
                    <div className='mb-2'>
                      <span className='text-xs font-medium text-text-secondary'>Prerequisites:</span>
                      <div className='flex flex-wrap gap-1 mt-1'>
                        {plan.prerequisiteDesignIds.map((preId, idx2) => (
                          <Badge key={idx2} variant='outline' className='text-xs'>
                            Step {sortedPlans.findIndex(p => p.testDesignId === preId) + 1}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Runtime Variables */}
                  {plan.runtimeBindings.length > 0 && (
                    <div className='mb-2'>
                      <span className='text-xs font-medium text-text-secondary'>Runtime Variables:</span>
                      <ul className='mt-1 space-y-0.5'>
                        {plan.runtimeBindings.map((binding: RuntimeBinding, idx2: number) => (
                          <li key={idx2} className='text-xs text-text-secondary'>
                            • {binding.variable} ({binding.source}) {binding.path || ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Assertions */}
                  {plan.assertions.length > 0 && (
                    <div className='mb-2'>
                      <span className='text-xs font-medium text-text-secondary'>Assertions:</span>
                      <ul className='mt-1 space-y-0.5'>
                        {plan.assertions.map((assertion: Assertion, idx2: number) => (
                          <li key={idx2} className='text-xs text-text-secondary'>
                            • {assertion.type} {assertion.operator} {assertion.path} → {String(assertion.expected)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Cleanup */}
                  {plan.cleanupSteps.length > 0 && (
                    <div className='mb-2'>
                      <span className='text-xs font-medium text-text-secondary'>Cleanup:</span>
                      <ul className='mt-1 space-y-0.5'>
                        {plan.cleanupSteps.map((cleanup: CleanupStep, idx2: number) => (
                          <li key={idx2} className='text-xs text-text-secondary'>
                            • {cleanup.type}: {cleanup.action} {cleanup.target}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className='ml-2 flex flex-col gap-1'>
                  <Button variant='ghost' size='sm' disabled={idx === 0}>
                    <ArrowUp className='h-4 w-4' />
                  </Button>
                  <Button variant='ghost' size='sm' disabled={idx === sortedPlans.length - 1}>
                    <ArrowDown className='h-4 w-4' />
                  </Button>
                  <Button variant='ghost' size='sm'>
                    {plan.status === 'Ready' ? <ToggleRight className='h-4 w-4 text-green-600' /> : <ToggleLeft className='h-4 w-4 text-gray-400' />}
                  </Button>
                  <Button variant='ghost' size='sm'>
                    <Edit2 className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
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
          <Button variant='outline' onClick={openAIGenerate}>
            <Sparkles className='mr-2 h-4 w-4' />
            Generate with AI
          </Button>
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
              <button
                className={`px-4 py-2 text-sm font-medium ${strategyTab === 'execution' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}
                onClick={() => setStrategyTab('execution')}
              >
                Execution Plan
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
                <div className='flex items-center justify-between mb-4'>
                  <h4 className='font-semibold text-text'>Test Strategy</h4>
                  <div className='flex gap-2'>
                    <Button size='sm' variant='outline' onClick={() => openAIStrategy(requirementToReview)}>
                      <Sparkles className='mr-1 h-3 w-3' /> Generate Strategy with AI
                    </Button>
                    <Button size='sm' variant='outline'>Add Custom Item</Button>
                  </div>
                </div>
                {testStrategy && testStrategy.requirementId === requirementToReview.id ? (
                  <div>
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
                <div className='flex items-center justify-between mb-4'>
                  <h4 className='font-semibold text-text'>Test Designs {testDesigns && testDesigns.length > 0 ? `(${testDesigns.length})` : ''}</h4>
                  <Button size='sm' variant='outline' onClick={() => openAIDesign(requirementToReview)}>
                    <Sparkles className='mr-1 h-3 w-3' /> Generate Designs with AI
                  </Button>
                </div>
                {testDesigns && testDesigns.length > 0 ? (
                  <div>
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
                         {/* Reusable Assertions */}
                         {design.assertionIds && design.assertionIds.length > 0 && (
                           <div className='mt-3'>
                             <span className='text-xs font-medium text-text-secondary'>Reusable Assertions:</span>
                             <ul className='mt-1 space-y-1'>
                               {design.assertionIds.map((ref: AssertionReference, idx: number) => {
                                 const reusableAssertion = reusableAssertions.find(a => a.id === ref.assertionId);
                                 if (!reusableAssertion) {
                                   return (
                                     <li key={idx} className='text-xs text-red-600'>
                                       • Missing Assertion (ID: {ref.assertionId.slice(0, 8)})
                                     </li>
                                   );
                                 }
                                 return (
                                   <li key={idx} className='text-xs text-text-secondary flex items-center justify-between'>
                                     <span>
                                       • {reusableAssertion.name} ({reusableAssertion.type})
                                     </span>
                                     <button
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         // TODO: Detach assertion
                                       }}
                                       className='text-red-600 hover:text-red-700 ml-2'
                                     >
                                       ×
                                     </button>
                                   </li>
                                 );
                               })}
                             </ul>
                           </div>
                         )}

                         {/* Attach Assertion Button */}
                         <div className='mt-3 flex gap-2'>
                           <Button
                             size='sm'
                             variant='outline'
                             onClick={() => {
                               setSelectedDesignId(design.id);
                               setSelectedAssertionIds(new Set(design.assertionIds?.map(a => a.assertionId) || []));
                               setAttachAssertionOpen(true);
                             }}
                           >
                             <Plus className='h-3 w-3 mr-1' />
                             Attach Assertion
                           </Button>
                           <Button size='sm' variant='outline' onClick={() => openAIAssertions(design)}>
                             <Sparkles className='h-3 w-3 mr-1' /> Generate Assertions with AI
                           </Button>
                         </div>
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

            {/* Execution Plan Tab */}
            {strategyTab === 'execution' && (
              <div>
                <div className='flex items-center justify-between mb-4'>
                  <div className='flex items-center gap-2'>
                    <Clock className='h-5 w-5 text-primary' />
                    <h4 className='font-semibold text-text'>
                      {executionPlans && executionPlans.length > 0 ? `Execution Timeline (${executionPlans.length} steps)` : 'Execution Plans'}
                    </h4>
                  </div>
                  <Button size='sm' variant='outline' onClick={() => openAIExecutionPlan(requirementToReview)}>
                    <Sparkles className='mr-1 h-3 w-3' /> Generate Execution Plan with AI
                  </Button>
                </div>
                {executionPlans && executionPlans.length > 0 ? (
                  <div>
                    {renderExecutionTimeline(executionPlans)}
                  </div>
                ) : (
                  <div className='text-center py-8'>
                    <p className='text-sm text-text-secondary mb-4'>No execution plans generated yet.</p>
                    <Button onClick={() => handlePlanExecution(requirementToReview)} disabled={isPlanningExecution}>
                      {isPlanningExecution ? 'Planning...' : 'Plan Execution'}
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

      {/* Assertion Picker Modal */}
      {attachAssertionOpen && selectedDesignId && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <Card className='w-full max-w-2xl'>
            <CardHeader>
              <CardTitle>Attach Assertions</CardTitle>
              <CardDescription>Select assertions from the library to attach to this test design.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {/* Filters */}
              <div className='flex items-center gap-2'>
                <input
                  type='text'
                  placeholder='Search assertions...'
                  className='flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                />
                <select
                  className='rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                  value={assertionFilterCategory}
                  onChange={(e) => setAssertionFilterCategory(e.target.value)}
                >
                  <option value='all'>All Categories</option>
                  <option value='Functional'>Functional</option>
                  <option value='Performance'>Performance</option>
                  <option value='Security'>Security</option>
                  <option value='Data'>Data</option>
                  <option value='Business'>Business</option>
                  <option value='Custom'>Custom</option>
                </select>
                <select
                  className='rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                  value={assertionFilterSeverity}
                  onChange={(e) => setAssertionFilterSeverity(e.target.value)}
                >
                  <option value='all'>All Severities</option>
                  <option value='Critical'>Critical</option>
                  <option value='Major'>Major</option>
                  <option value='Minor'>Minor</option>
                  <option value='Info'>Info</option>
                </select>
              </div>

              {/* Assertions List */}
              <div className='max-h-96 overflow-y-auto border border-border rounded-lg'>
                {reusableAssertions.length === 0 ? (
                  <div className='p-4 text-center text-text-secondary text-sm'>No assertions available.</div>
                ) : (
                  <div className='divide-y divide-border'>
                    {reusableAssertions
                      .filter((assertion: ReusableAssertion) => {
                        const matchesCategory = assertionFilterCategory === 'all' || assertion.category === assertionFilterCategory;
                        const matchesSeverity = assertionFilterSeverity === 'all' || assertion.severity === assertionFilterSeverity;
                        return matchesCategory && matchesSeverity;
                      })
                      .map((assertion: ReusableAssertion) => {
                        const isSelected = selectedAssertionIds.has(assertion.id);
                        const isDuplicate = selectedAssertionIds.has(assertion.id);
                        return (
                          <div
                            key={assertion.id}
                            className={`p-3 flex items-start gap-3 cursor-pointer hover:bg-surface ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                            onClick={() => {
                              const newSelected = new Set(selectedAssertionIds);
                              if (isSelected) {
                                newSelected.delete(assertion.id);
                              } else {
                                newSelected.add(assertion.id);
                              }
                              setSelectedAssertionIds(newSelected);
                            }}
                          >
                            <input
                              type='checkbox'
                              checked={isSelected}
                              onChange={() => {
                                const newSelected = new Set(selectedAssertionIds);
                                if (isSelected) {
                                  newSelected.delete(assertion.id);
                                } else {
                                  newSelected.add(assertion.id);
                                }
                                setSelectedAssertionIds(newSelected);
                              }}
                              className='mt-1 h-4 w-4 rounded border-border'
                            />
                            <div className='flex-1 min-w-0'>
                              <div className='flex items-center gap-2 mb-1'>
                                <span className='text-sm font-medium text-text'>{assertion.name}</span>
                                <Badge variant='outline' className='text-xs'>{assertion.type}</Badge>
                                <Badge variant={assertion.severity === 'Critical' ? 'destructive' : 'secondary'} className='text-xs'>
                                  {assertion.severity}
                                </Badge>
                                {assertion.enabled ? (
                                  <Badge variant='success' className='text-xs'>Enabled</Badge>
                                ) : (
                                  <Badge variant='secondary' className='text-xs'>Disabled</Badge>
                                )}
                              </div>
                              <p className='text-xs text-text-secondary'>{assertion.description}</p>
                              <div className='flex gap-1 mt-1'>
                                {assertion.tags.map((tag) => (
                                  <Badge key={tag} variant='outline' className='text-xs'>{tag}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className='flex justify-end gap-2 pt-2'>
                <Button variant='outline' onClick={() => setAttachAssertionOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    // TODO: Save attached assertions
                    setAttachAssertionOpen(false);
                    setSelectedDesignId(null);
                    setSelectedAssertionIds(new Set());
                  }}
                >
                  Attach Selected ({selectedAssertionIds.size})
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Generation Modal */}
      {aiModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-gray-800'>
            <div className='mb-4 flex items-start justify-between'>
              <div>
                <h3 className='text-lg font-semibold text-text'>Generate Requirements with AI</h3>
                <p className='text-sm text-text-secondary'>Use your AI provider to generate requirements from project context.</p>
              </div>
              <button onClick={() => setAiModalOpen(false)} className='text-text-secondary hover:text-text'>✕</button>
            </div>

            {/* Step 1: Select Provider */}
            {aiStep === 'select' && (
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-text-secondary mb-1'>AI Provider</label>
                  <select
                    value={selectedAIProviderId}
                    onChange={(e) => setSelectedAIProviderId(e.target.value)}
                    className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                  >
                    <option value=''>Select a provider...</option>
                    {aiProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} ({provider.provider} - {provider.model}){provider.isDefault ? ' [Default]' : ''}
                      </option>
                    ))}
                  </select>
                  {aiProviders.length === 0 && (
                    <p className='mt-2 text-xs text-yellow-600'>
                      No AI providers configured. Add one in the AI Providers tab first.
                    </p>
                  )}
                </div>
                <div className='flex justify-end gap-2'>
                  <Button variant='outline' onClick={() => setAiModalOpen(false)}>Cancel</Button>
                  <Button variant='outline' onClick={handleAIPreview} disabled={!selectedAIProviderId || aiLoading}>
                    {aiLoading ? 'Previewing...' : 'Preview Prompt'}
                  </Button>
                  <Button onClick={handleAIGenerate} disabled={!selectedAIProviderId || aiLoading}>
                    {aiLoading ? 'Generating...' : 'Generate Requirements'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Preview */}
            {aiStep === 'preview' && aiPreview && (
              <div className='space-y-4'>
                <div>
                  <h4 className='font-semibold text-text mb-2'>Context Summary</h4>
                  <pre className='rounded-lg bg-background p-3 text-xs text-text overflow-auto max-h-40'>
                    {JSON.stringify(aiPreview.contextSummary, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className='font-semibold text-text mb-2'>Generated Prompt</h4>
                  <div className='rounded-lg border border-border p-3'>
                    <p className='text-xs font-medium text-text-secondary mb-1'>System Prompt</p>
                    <p className='text-sm text-text mb-3'>{aiPreview.generatedPrompt?.systemPrompt}</p>
                    <p className='text-xs font-medium text-text-secondary mb-1'>User Prompt</p>
                    <p className='text-sm text-text whitespace-pre-wrap'>{aiPreview.generatedPrompt?.userPrompt}</p>
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='rounded-lg border border-border p-3'>
                    <p className='text-xs font-medium text-text-secondary'>Token Estimate</p>
                    <p className='text-lg font-semibold text-text'>{aiPreview.tokenEstimate}</p>
                  </div>
                  <div className='rounded-lg border border-border p-3'>
                    <p className='text-xs font-medium text-text-secondary'>Cost Estimate</p>
                    <p className='text-lg font-semibold text-text'>${aiPreview.costEstimate?.toFixed(6) || '0.000000'}</p>
                  </div>
                </div>
                {aiWarnings.length > 0 && (
                  <div className='rounded-lg bg-yellow-50 border border-yellow-200 p-3'>
                    {aiWarnings.map((w, i) => (
                      <p key={i} className='text-xs text-yellow-700'>• {w}</p>
                    ))}
                  </div>
                )}
                <div className='flex justify-end gap-2'>
                  <Button variant='outline' onClick={() => setAiStep('select')}>Back</Button>
                  <Button onClick={handleAIGenerate} disabled={aiLoading}>
                    {aiLoading ? 'Generating...' : 'Generate Requirements'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Result */}
            {aiStep === 'result' && (
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <h4 className='font-semibold text-text'>Generated Requirements ({aiGeneratedRequirements.length})</h4>
                  <Button variant='outline' size='sm' onClick={() => { setAiModalOpen(false); queryClient.invalidateQueries({ queryKey: queryKeys.requirements(projectId) }); }}>
                    Close & Refresh
                  </Button>
                </div>
                {aiWarnings.length > 0 && (
                  <div className='rounded-lg bg-yellow-50 border border-yellow-200 p-3'>
                    {aiWarnings.map((w, i) => (
                      <p key={i} className='text-xs text-yellow-700'>• {w}</p>
                    ))}
                  </div>
                )}
                {aiGeneratedRequirements.length === 0 ? (
                  <p className='text-sm text-text-secondary'>No requirements were generated.</p>
                ) : (
                  <div className='space-y-3'>
                    {aiGeneratedRequirements.map((req) => (
                      <div key={req.id} className='rounded-lg border border-border p-4'>
                        <div className='flex items-center justify-between mb-2'>
                          <h5 className='font-semibold text-text'>{req.title}</h5>
                          <Badge className={getStatusBadgeVariant(req.approvalStatus)} variant='outline'>
                            {req.approvalStatus}
                          </Badge>
                        </div>
                        <p className='text-sm text-text-secondary mb-2'>{req.description}</p>
                        <div className='flex items-center gap-3 text-xs text-text-secondary mb-2'>
                          <span>Category: {req.category}</span>
                          <span>Confidence: {req.confidence}%</span>
                        </div>
                        {req.acceptanceCriteria.length > 0 && (
                          <ul className='list-disc list-inside text-xs text-text-secondary'>
                            {req.acceptanceCriteria.slice(0, 3).map((ac) => (
                              <li key={ac.id}>{ac.text}</li>
                            ))}
                          </ul>
                        )}
                        <div className='mt-3 flex gap-2'>
                          <Button size='sm' variant='outline' onClick={() => { handleStatusChange(req.id, 'Approved'); setAiModalOpen(false); }}>
                            <CheckCircle className='mr-1 h-3 w-3 text-green-600' /> Approve
                          </Button>
                          <Button size='sm' variant='outline' onClick={() => { handleStatusChange(req.id, 'Rejected'); setAiModalOpen(false); }}>
                            <XCircle className='mr-1 h-3 w-3 text-red-600' /> Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Strategy Generation Modal */}
      {aiStrategyModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-gray-800'>
            <div className='mb-4 flex items-start justify-between'>
              <div>
                <h3 className='text-lg font-semibold text-text'>Generate Test Strategy with AI</h3>
                <p className='text-sm text-text-secondary'>Use your AI provider to generate a test strategy for this requirement.</p>
              </div>
              <button onClick={() => setAiStrategyModalOpen(false)} className='text-text-secondary hover:text-text'>✕</button>
            </div>

            {/* Step 1: Select Provider */}
            {aiStrategyStep === 'select' && (
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-text-secondary mb-1'>AI Provider</label>
                  <select
                    value={aiStrategyProviderId}
                    onChange={(e) => setAiStrategyProviderId(e.target.value)}
                    className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                  >
                    <option value=''>Select a provider...</option>
                    {aiProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} ({provider.provider} - {provider.model}){provider.isDefault ? ' [Default]' : ''}
                      </option>
                    ))}
                  </select>
                  {aiProviders.length === 0 && (
                    <p className='mt-2 text-xs text-yellow-600'>
                      No AI providers configured. Add one in the AI Providers tab first.
                    </p>
                  )}
                </div>
                <div className='flex justify-end gap-2'>
                  <Button variant='outline' onClick={() => setAiStrategyModalOpen(false)}>Cancel</Button>
                  <Button variant='outline' onClick={handleAIStrategyPreview} disabled={!aiStrategyProviderId || aiLoading}>
                    {aiLoading ? 'Previewing...' : 'Preview Prompt'}
                  </Button>
                  <Button onClick={handleAIStrategyGenerate} disabled={!aiStrategyProviderId || aiLoading}>
                    {aiLoading ? 'Generating...' : 'Generate Strategy'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Preview */}
            {aiStrategyStep === 'preview' && aiStrategyPreview && (
              <div className='space-y-4'>
                <div>
                  <h4 className='font-semibold text-text mb-2'>Context Summary</h4>
                  <pre className='rounded-lg bg-background p-3 text-xs text-text overflow-auto max-h-40'>
                    {JSON.stringify(aiStrategyPreview.contextSummary, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className='font-semibold text-text mb-2'>Generated Prompt</h4>
                  <div className='rounded-lg border border-border p-3'>
                    <p className='text-xs font-medium text-text-secondary mb-1'>System Prompt</p>
                    <p className='text-sm text-text mb-3'>{aiStrategyPreview.generatedPrompt?.systemPrompt}</p>
                    <p className='text-xs font-medium text-text-secondary mb-1'>User Prompt</p>
                    <p className='text-sm text-text whitespace-pre-wrap'>{aiStrategyPreview.generatedPrompt?.userPrompt}</p>
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='rounded-lg border border-border p-3'>
                    <p className='text-xs font-medium text-text-secondary'>Token Estimate</p>
                    <p className='text-lg font-semibold text-text'>{aiStrategyPreview.tokenEstimate}</p>
                  </div>
                  <div className='rounded-lg border border-border p-3'>
                    <p className='text-xs font-medium text-text-secondary'>Cost Estimate</p>
                    <p className='text-lg font-semibold text-text'>${aiStrategyPreview.costEstimate?.toFixed(6) || '0.000000'}</p>
                  </div>
                </div>
                {aiStrategyWarnings.length > 0 && (
                  <div className='rounded-lg bg-yellow-50 border border-yellow-200 p-3'>
                    {aiStrategyWarnings.map((w, i) => (
                      <p key={i} className='text-xs text-yellow-700'>• {w}</p>
                    ))}
                  </div>
                )}
                <div className='flex justify-end gap-2'>
                  <Button variant='outline' onClick={() => setAiStrategyStep('select')}>Back</Button>
                  <Button onClick={handleAIStrategyGenerate} disabled={aiLoading}>
                    {aiLoading ? 'Generating...' : 'Generate Strategy'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Result */}
            {aiStrategyStep === 'result' && (
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <h4 className='font-semibold text-text'>Generated Test Strategy</h4>
                  <Button variant='outline' size='sm' onClick={() => { setAiStrategyModalOpen(false); queryClient.invalidateQueries({ queryKey: queryKeys.requirements(projectId) }); }}>
                    Close & Refresh
                  </Button>
                </div>
                {aiStrategyWarnings.length > 0 && (
                  <div className='rounded-lg bg-yellow-50 border border-yellow-200 p-3'>
                    {aiStrategyWarnings.map((w, i) => (
                      <p key={i} className='text-xs text-yellow-700'>• {w}</p>
                    ))}
                  </div>
                )}
                {aiStrategyResult && aiStrategyResult.sections ? (
                  <div className='space-y-3'>
                    {aiStrategyResult.sections.map((section: any) => (
                      <div key={section.category} className='rounded-lg border border-border p-4'>
                        <h5 className='font-semibold text-text mb-2'>{section.category}</h5>
                        {section.items.map((item: any) => (
                          <div key={item.id} className='mb-2 rounded border border-border p-3'>
                            <div className='flex items-center justify-between mb-1'>
                              <span className='text-sm font-medium text-text'>{item.title}</span>
                              <Badge className={getPriorityBadgeVariant(item.priority)} variant='outline'>{item.priority}</Badge>
                            </div>
                            <p className='text-xs text-text-secondary'>{item.reason}</p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-sm text-text-secondary'>No test strategy was generated.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Design Generation Modal */}
      {aiDesignModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-gray-800'>
            <div className='mb-4 flex items-start justify-between'>
              <div>
                <h3 className='text-lg font-semibold text-text'>Generate Test Designs with AI</h3>
                <p className='text-sm text-text-secondary'>Use your AI provider to generate test designs for this requirement.</p>
              </div>
              <button onClick={() => setAiDesignModalOpen(false)} className='text-text-secondary hover:text-text'>✕</button>
            </div>

            {/* Step 1: Select Provider */}
            {aiDesignStep === 'select' && (
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-text-secondary mb-1'>AI Provider</label>
                  <select
                    value={aiDesignProviderId}
                    onChange={(e) => setAiDesignProviderId(e.target.value)}
                    className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                  >
                    <option value=''>Select a provider...</option>
                    {aiProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} ({provider.provider} - {provider.model}){provider.isDefault ? ' [Default]' : ''}
                      </option>
                    ))}
                  </select>
                  {aiProviders.length === 0 && (
                    <p className='mt-2 text-xs text-yellow-600'>
                      No AI providers configured. Add one in the AI Providers tab first.
                    </p>
                  )}
                </div>
                <div className='flex justify-end gap-2'>
                  <Button variant='outline' onClick={() => setAiDesignModalOpen(false)}>Cancel</Button>
                  <Button variant='outline' onClick={handleAIDesignPreview} disabled={!aiDesignProviderId || aiLoading}>
                    {aiLoading ? 'Previewing...' : 'Preview Prompt'}
                  </Button>
                  <Button onClick={handleAIDesignGenerate} disabled={!aiDesignProviderId || aiLoading}>
                    {aiLoading ? 'Generating...' : 'Generate Designs'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Preview */}
            {aiDesignStep === 'preview' && aiDesignPreview && (
              <div className='space-y-4'>
                <div>
                  <h4 className='font-semibold text-text mb-2'>Context Summary</h4>
                  <pre className='rounded-lg bg-background p-3 text-xs text-text overflow-auto max-h-40'>
                    {JSON.stringify(aiDesignPreview.contextSummary, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className='font-semibold text-text mb-2'>Generated Prompt</h4>
                  <div className='rounded-lg border border-border p-3'>
                    <p className='text-xs font-medium text-text-secondary mb-1'>System Prompt</p>
                    <p className='text-sm text-text mb-3'>{aiDesignPreview.generatedPrompt?.systemPrompt}</p>
                    <p className='text-xs font-medium text-text-secondary mb-1'>User Prompt</p>
                    <p className='text-sm text-text whitespace-pre-wrap'>{aiDesignPreview.generatedPrompt?.userPrompt}</p>
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='rounded-lg border border-border p-3'>
                    <p className='text-xs font-medium text-text-secondary'>Token Estimate</p>
                    <p className='text-lg font-semibold text-text'>{aiDesignPreview.tokenEstimate}</p>
                  </div>
                  <div className='rounded-lg border border-border p-3'>
                    <p className='text-xs font-medium text-text-secondary'>Cost Estimate</p>
                    <p className='text-lg font-semibold text-text'>${aiDesignPreview.costEstimate?.toFixed(6) || '0.000000'}</p>
                  </div>
                </div>
                {aiDesignWarnings.length > 0 && (
                  <div className='rounded-lg bg-yellow-50 border border-yellow-200 p-3'>
                    {aiDesignWarnings.map((w, i) => (
                      <p key={i} className='text-xs text-yellow-700'>• {w}</p>
                    ))}
                  </div>
                )}
                <div className='flex justify-end gap-2'>
                  <Button variant='outline' onClick={() => setAiDesignStep('select')}>Back</Button>
                  <Button onClick={handleAIDesignGenerate} disabled={aiLoading}>
                    {aiLoading ? 'Generating...' : 'Generate Designs'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Result */}
            {aiDesignStep === 'result' && (
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <h4 className='font-semibold text-text'>Generated Test Designs ({Array.isArray(aiDesignResult) ? aiDesignResult.length : 0})</h4>
                  <Button variant='outline' size='sm' onClick={() => { setAiDesignModalOpen(false); queryClient.invalidateQueries({ queryKey: queryKeys.requirements(projectId) }); }}>
                    Close & Refresh
                  </Button>
                </div>
                {aiDesignWarnings.length > 0 && (
                  <div className='rounded-lg bg-yellow-50 border border-yellow-200 p-3'>
                    {aiDesignWarnings.map((w, i) => (
                      <p key={i} className='text-xs text-yellow-700'>• {w}</p>
                    ))}
                  </div>
                )}
                {Array.isArray(aiDesignResult) && aiDesignResult.length > 0 ? (
                  <div className='space-y-3'>
                    {aiDesignResult.map((design: any) => (
                      <div key={design.id} className='rounded-lg border border-border p-4'>
                        <div className='flex items-center justify-between mb-2'>
                          <h5 className='font-semibold text-text'>Design {design.id?.slice(0, 8) || 'N/A'}</h5>
                          <div className='flex gap-1'>
                            <Badge className={getPriorityBadgeVariant(design.priority)} variant='outline'>{design.priority}</Badge>
                            <Badge variant='outline' className={design.status === 'Ready' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>{design.status}</Badge>
                          </div>
                        </div>
                        <div className='grid grid-cols-2 gap-2 text-xs text-text-secondary'>
                          <div>API: {design.operationId || 'N/A'}</div>
                          <div>Environment: {design.environmentId || 'N/A'}</div>
                          <div>Dataset: {design.datasetId || 'N/A'}</div>
                          <div>Priority: {design.priority}</div>
                        </div>
                        {design.assertions && design.assertions.length > 0 && (
                          <div className='mt-2'>
                            <span className='text-xs font-medium text-text-secondary'>Assertions:</span>
                            <ul className='mt-1 space-y-0.5'>
                              {design.assertions.map((a: any, i: number) => (
                                <li key={i} className='text-xs text-text-secondary'>• {a.type} {a.operator} {a.path} → {String(a.expected)}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-sm text-text-secondary'>No test designs were generated.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Execution Plan Generation Modal */}
      {aiExecutionPlanModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-gray-800'>
            <div className='mb-4 flex items-start justify-between'>
              <div>
                <h3 className='text-lg font-semibold text-text'>Generate Execution Plan with AI</h3>
                <p className='text-sm text-text-secondary'>Use your AI provider to generate an ordered execution plan from approved test designs.</p>
              </div>
              <button onClick={() => setAiExecutionPlanModalOpen(false)} className='text-text-secondary hover:text-text'>✕</button>
            </div>

            {aiExecutionPlanStep === 'select' && (
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-text-secondary mb-1'>AI Provider</label>
                  <select
                    value={aiExecutionPlanProviderId}
                    onChange={(e) => setAiExecutionPlanProviderId(e.target.value)}
                    className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                  >
                    <option value=''>Select a provider...</option>
                    {aiProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} ({provider.provider} - {provider.model}){provider.isDefault ? ' [Default]' : ''}
                      </option>
                    ))}
                  </select>
                  {aiProviders.length === 0 && (
                    <p className='mt-2 text-xs text-yellow-600'>No AI providers configured. Add one in the AI Providers tab first.</p>
                  )}
                </div>
                <div className='flex justify-end gap-2'>
                  <Button variant='outline' onClick={() => setAiExecutionPlanModalOpen(false)}>Cancel</Button>
                  <Button variant='outline' onClick={handleAIExecutionPlanPreview} disabled={!aiExecutionPlanProviderId || aiLoading}>
                    {aiLoading ? 'Previewing...' : 'Preview Prompt'}
                  </Button>
                  <Button onClick={handleAIExecutionPlanGenerate} disabled={!aiExecutionPlanProviderId || aiLoading}>
                    {aiLoading ? 'Generating...' : 'Generate Execution Plan'}
                  </Button>
                </div>
              </div>
            )}

            {aiExecutionPlanStep === 'preview' && aiExecutionPlanPreview && (
              <div className='space-y-4'>
                <div>
                  <h4 className='font-semibold text-text mb-2'>Context Summary</h4>
                  <pre className='rounded-lg bg-background p-3 text-xs text-text overflow-auto max-h-40'>
                    {JSON.stringify(aiExecutionPlanPreview.contextSummary, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className='font-semibold text-text mb-2'>Generated Prompt</h4>
                  <div className='rounded-lg border border-border p-3'>
                    <p className='text-xs font-medium text-text-secondary mb-1'>System Prompt</p>
                    <p className='text-sm text-text mb-3'>{aiExecutionPlanPreview.generatedPrompt?.systemPrompt}</p>
                    <p className='text-xs font-medium text-text-secondary mb-1'>User Prompt</p>
                    <p className='text-sm text-text whitespace-pre-wrap'>{aiExecutionPlanPreview.generatedPrompt?.userPrompt}</p>
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='rounded-lg border border-border p-3'>
                    <p className='text-xs font-medium text-text-secondary'>Token Estimate</p>
                    <p className='text-lg font-semibold text-text'>{aiExecutionPlanPreview.tokenEstimate}</p>
                  </div>
                  <div className='rounded-lg border border-border p-3'>
                    <p className='text-xs font-medium text-text-secondary'>Cost Estimate</p>
                    <p className='text-lg font-semibold text-text'>${aiExecutionPlanPreview.costEstimate?.toFixed(6) || '0.000000'}</p>
                  </div>
                </div>
                {aiExecutionPlanWarnings.length > 0 && (
                  <div className='rounded-lg bg-yellow-50 border border-yellow-200 p-3'>
                    {aiExecutionPlanWarnings.map((w, i) => (
                      <p key={i} className='text-xs text-yellow-700'>• {w}</p>
                    ))}
                  </div>
                )}
                <div className='flex justify-end gap-2'>
                  <Button variant='outline' onClick={() => setAiExecutionPlanStep('select')}>Back</Button>
                  <Button onClick={handleAIExecutionPlanGenerate} disabled={aiLoading}>
                    {aiLoading ? 'Generating...' : 'Generate Execution Plan'}
                  </Button>
                </div>
              </div>
            )}

            {aiExecutionPlanStep === 'result' && (
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <h4 className='font-semibold text-text'>Generated Execution Plans ({Array.isArray(aiExecutionPlanResult) ? aiExecutionPlanResult.length : 0})</h4>
                  <Button variant='outline' size='sm' onClick={() => { setAiExecutionPlanModalOpen(false); queryClient.invalidateQueries({ queryKey: queryKeys.requirements(projectId) }); }}>
                    Close & Refresh
                  </Button>
                </div>
                {aiExecutionPlanWarnings.length > 0 && (
                  <div className='rounded-lg bg-yellow-50 border border-yellow-200 p-3'>
                    {aiExecutionPlanWarnings.map((w, i) => (
                      <p key={i} className='text-xs text-yellow-700'>• {w}</p>
                    ))}
                  </div>
                )}
                {Array.isArray(aiExecutionPlanResult) && aiExecutionPlanResult.length > 0 ? (
                  <div className='space-y-3'>
                    {aiExecutionPlanResult
                      .slice()
                      .sort((a: any, b: any) => a.executionOrder - b.executionOrder)
                      .map((plan: any) => (
                        <div key={plan.id} className='rounded-lg border border-border p-4'>
                          <div className='flex items-center justify-between mb-2'>
                            <div className='flex items-center gap-2'>
                              <span className='flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white'>{plan.executionOrder}</span>
                              <h5 className='text-sm font-semibold text-text'>{plan.requestTemplate?.method} {plan.requestTemplate?.path || ''}</h5>
                              <Badge variant='outline' className={getExecutionStatusBadgeVariant(plan.status)}>{plan.status}</Badge>
                            </div>
                            <span className='text-xs text-text-secondary'>Design {plan.testDesignId?.slice(0, 8) || 'N/A'}</span>
                          </div>
                          <div className='grid grid-cols-2 gap-2 text-xs text-text-secondary'>
                            <div>Environment: {plan.environmentId || 'N/A'}</div>
                            <div>Dataset: {plan.datasetId || 'N/A'}</div>
                          </div>
                          {plan.prerequisiteDesignIds && plan.prerequisiteDesignIds.length > 0 && (
                            <div className='mt-2'>
                              <span className='text-xs font-medium text-text-secondary'>Prerequisites:</span>
                              <div className='flex flex-wrap gap-1 mt-1'>
                                {plan.prerequisiteDesignIds.map((preId: string, i: number) => (
                                  <Badge key={i} variant='outline' className='text-xs'>{preId.slice(0, 8)}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {plan.runtimeBindings && plan.runtimeBindings.length > 0 && (
                            <div className='mt-2'>
                              <span className='text-xs font-medium text-text-secondary'>Runtime Variables:</span>
                              <ul className='mt-1 space-y-0.5'>
                                {plan.runtimeBindings.map((binding: any, i: number) => (
                                  <li key={i} className='text-xs text-text-secondary'>• {binding.variable} ({binding.source}) {binding.path || ''}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className='text-sm text-text-secondary'>No execution plans were generated.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Assertion Generation Modal */}
      {aiAssertionModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-gray-800'>
            <div className='mb-4 flex items-start justify-between'>
              <div>
                <h3 className='text-lg font-semibold text-text'>Generate Assertions with AI</h3>
                <p className='text-sm text-text-secondary'>Use your AI provider to generate assertions for this test design.</p>
              </div>
              <button onClick={() => setAiAssertionModalOpen(false)} className='text-text-secondary hover:text-text'>✕</button>
            </div>

            {/* Step 1: Select Provider */}
            {aiAssertionStep === 'select' && (
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-text-secondary mb-1'>AI Provider</label>
                  <select
                    value={aiAssertionProviderId}
                    onChange={(e) => setAiAssertionProviderId(e.target.value)}
                    className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                  >
                    <option value=''>Select a provider...</option>
                    {aiProviders.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} ({provider.provider} - {provider.model}){provider.isDefault ? ' [Default]' : ''}
                      </option>
                    ))}
                  </select>
                  {aiProviders.length === 0 && (
                    <p className='mt-2 text-xs text-yellow-600'>
                      No AI providers configured. Add one in the AI Providers tab first.
                    </p>
                  )}
                </div>
                <div className='flex justify-end gap-2'>
                  <Button variant='outline' onClick={() => setAiAssertionModalOpen(false)}>Cancel</Button>
                  <Button variant='outline' onClick={handleAIAssertionPreview} disabled={!aiAssertionProviderId || aiLoading}>
                    {aiLoading ? 'Previewing...' : 'Preview Prompt'}
                  </Button>
                  <Button onClick={handleAIAssertionGenerate} disabled={!aiAssertionProviderId || aiLoading}>
                    {aiLoading ? 'Generating...' : 'Generate Assertions'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Preview */}
            {aiAssertionStep === 'preview' && aiAssertionPreview && (
              <div className='space-y-4'>
                <div>
                  <h4 className='font-semibold text-text mb-2'>Context Summary</h4>
                  <pre className='rounded-lg bg-background p-3 text-xs text-text overflow-auto max-h-40'>
                    {JSON.stringify(aiAssertionPreview.contextSummary, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className='font-semibold text-text mb-2'>Generated Prompt</h4>
                  <div className='rounded-lg border border-border p-3'>
                    <p className='text-xs font-medium text-text-secondary mb-1'>System Prompt</p>
                    <p className='text-sm text-text mb-3'>{aiAssertionPreview.generatedPrompt?.systemPrompt}</p>
                    <p className='text-xs font-medium text-text-secondary mb-1'>User Prompt</p>
                    <p className='text-sm text-text whitespace-pre-wrap'>{aiAssertionPreview.generatedPrompt?.userPrompt}</p>
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='rounded-lg border border-border p-3'>
                    <p className='text-xs font-medium text-text-secondary'>Token Estimate</p>
                    <p className='text-lg font-semibold text-text'>{aiAssertionPreview.tokenEstimate}</p>
                  </div>
                  <div className='rounded-lg border border-border p-3'>
                    <p className='text-xs font-medium text-text-secondary'>Cost Estimate</p>
                    <p className='text-lg font-semibold text-text'>${aiAssertionPreview.costEstimate?.toFixed(6) || '0.000000'}</p>
                  </div>
                </div>
                {aiAssertionWarnings.length > 0 && (
                  <div className='rounded-lg bg-yellow-50 border border-yellow-200 p-3'>
                    {aiAssertionWarnings.map((w, i) => (
                      <p key={i} className='text-xs text-yellow-700'>• {w}</p>
                    ))}
                  </div>
                )}
                <div className='flex justify-end gap-2'>
                  <Button variant='outline' onClick={() => setAiAssertionStep('select')}>Back</Button>
                  <Button onClick={handleAIAssertionGenerate} disabled={aiLoading}>
                    {aiLoading ? 'Generating...' : 'Generate Assertions'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Result */}
            {aiAssertionStep === 'result' && (
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <h4 className='font-semibold text-text'>Generated Assertions ({Array.isArray(aiAssertionResult) ? aiAssertionResult.length : 0})</h4>
                  <Button variant='outline' size='sm' onClick={() => { setAiAssertionModalOpen(false); queryClient.invalidateQueries({ queryKey: queryKeys.requirements(projectId) }); }}>
                    Close & Refresh
                  </Button>
                </div>
                {aiAssertionWarnings.length > 0 && (
                  <div className='rounded-lg bg-yellow-50 border border-yellow-200 p-3'>
                    {aiAssertionWarnings.map((w, i) => (
                      <p key={i} className='text-xs text-yellow-700'>• {w}</p>
                    ))}
                  </div>
                )}
                {Array.isArray(aiAssertionResult) && aiAssertionResult.length > 0 ? (
                  <div className='space-y-3'>
                    {aiAssertionResult.map((assertion: any) => (
                      <div key={assertion.id} className='rounded-lg border border-border p-4'>
                        <div className='flex items-center justify-between mb-2'>
                          <h5 className='text-sm font-semibold text-text'>{assertion.name}</h5>
                          <div className='flex gap-1'>
                            <Badge variant='outline' className='text-xs'>{assertion.type}</Badge>
                            <Badge variant={assertion.severity === 'Critical' ? 'destructive' : 'secondary'} className='text-xs'>
                              {assertion.severity}
                            </Badge>
                          </div>
                        </div>
                        <p className='text-xs text-text-secondary mb-2'>{assertion.description}</p>
                        <div className='text-xs text-text-secondary'>
                          <span className='font-medium'>Expression:</span> {assertion.expression}
                        </div>
                        <div className='text-xs text-text-secondary'>
                          <span className='font-medium'>Expected:</span> {String(assertion.expectedValue)}
                        </div>
                        {assertion.tags && assertion.tags.length > 0 && (
                          <div className='flex gap-1 mt-2'>
                            {assertion.tags.map((tag: string) => (
                              <Badge key={tag} variant='outline' className='text-xs'>{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-sm text-text-secondary'>No assertions were generated.</p>
                )}
              </div>
            )}
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