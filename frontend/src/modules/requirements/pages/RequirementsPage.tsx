// Requirements page — capture acceptance criteria, generate test cases, curate inclusion
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectModulePath } from '../../../routes/paths';
import { Plus, Eye, EyeOff, CheckCircle, XCircle, Archive, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Edit2, Trash2, ToggleLeft, ToggleRight, Copy, FlaskConical, ArrowUp, ArrowDown, GitBranch, Clock, Upload } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Toast } from '../../../components/shared/Toast';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { useRequirements } from '../hooks';
import { useRequirementArtifacts } from '../hooks/useRequirementArtifacts';
import { useAnalysis } from '../../analysis/hooks';
import { useAssertions } from '../../assertion/hooks/useAssertions';
import { useAIProviders } from '../../ai-provider/hooks';
import { requirementService } from '../services/requirementService';
import { testDesignService } from '../services/testDesignService';
import type { Requirement, ApprovalStatus, ValidationCategory, TestStrategy, StrategyCategorySection, StrategyItem, TestDesign, Assertion, RuntimeBinding, ExecutionPlan, CleanupStep, RequirementMappingContext } from '../types';
import type { Assertion as ReusableAssertion } from '../../assertion/types';
import { useQueryClient, useQuery, useQueries } from '@tanstack/react-query';
import { queryKeys } from '../../../constants';
import { RequirementCaptureCard } from '../components/RequirementCaptureCard';
import { GeneratedTestCasesPanel } from '../components/GeneratedTestCasesPanel';
import { TestCasesListBlock } from '../components/TestCasesListBlock';
import { JiraImportDialog } from '../components/JiraImportDialog';
import type { RequirementFormData } from '../types';
import { useProjectApiOperations } from '../../api/hooks/useProjectApiOperations';
import { resolveOperationLabel } from '../utils/operationDisplay';
import {
  clearActiveRequirementId,
  readActiveRequirementId,
  readSuitePanelVisible,
  writeActiveRequirementId,
  writeSuitePanelVisible,
} from '../utils/activeRequirementSession';

export interface RequirementsPageProps {
  section?: 'requirements' | 'approved' | 'archived';
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'Approved':
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'Rejected':
      return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'Archived':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    case 'Draft':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    default:
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
  }
};

const getSourceBadgeVariant = (source: string) => {
  if (source === 'ProjectAnalysis') return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
  if (source === 'Jira') return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300';
  return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 75) return 'text-green-600 dark:text-green-400';
  if (confidence >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
};

const suiteConfidenceLabel = (source: Requirement['source']) =>
  source === 'ProjectAnalysis' ? 'Analysis confidence' : 'API mapping';

const RoundedSelect: React.FC<{
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  'aria-label': string;
}> = ({ value, options, onChange, 'aria-label': ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div ref={containerRef} className='relative w-full sm:w-44'>
      <button
        type='button'
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className='flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-left text-sm text-text outline-none transition-colors focus:border-primary'
      >
        <span className='truncate'>{selected?.label}</span>
        <ChevronDown className={`ml-2 h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className='absolute left-0 top-full z-30 mt-1 w-full overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-xl' role='listbox' aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type='button'
              role='option'
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${option.value === value ? 'bg-primary/15 text-primary' : 'text-text hover:bg-background/60'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const resolveSuiteConfidence = (
  requirement: Requirement,
  mapping?: RequirementMappingContext,
): { label: string; percent: number | null; low: boolean } => {
  if (requirement.source === 'ProjectAnalysis' && !mapping) {
    return {
      label: suiteConfidenceLabel(requirement.source),
      percent: requirement.confidence,
      low: requirement.confidence < 50,
    };
  }
  const percent =
    mapping?.mappingConfidencePercent ??
    (requirement.confidence > 0 ? requirement.confidence : null);
  const low = mapping?.lowConfidence ?? (percent !== null ? percent < 50 : false);
  return {
    label: mapping || requirement.source !== 'ProjectAnalysis' ? 'API mapping' : suiteConfidenceLabel(requirement.source),
    percent,
    low,
  };
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

export const RequirementsPage: React.FC<RequirementsPageProps> = ({ section = 'requirements' }) => {
  const { projectId: routeProjectId } = useParams<{ projectId: string }>();
  const projectId = routeProjectId || '1';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { requirements, suggested, approved, archived, isLoading, isError, error, generateFromAnalysisAsync, updateAsync, removeAsync, planTestStrategyAsync, generateTestDesignsAsync, isGeneratingDesigns, planExecutionAsync, createAsync, isCreating } = useRequirements(projectId);

  const listedSuiteRequirements = useMemo(
    () => [...suggested, ...approved, ...archived],
    [suggested, approved, archived],
  );

  const suiteMappingQueries = useQueries({
    queries: listedSuiteRequirements.map((req) => ({
      queryKey: queryKeys.requirementMappingContext(projectId, req.id),
      queryFn: () => requirementService.getMappingContext(projectId, req.id),
      staleTime: 60_000,
      retry: false,
      enabled: Boolean(projectId),
    })),
  });

  const mappingByRequirementId = useMemo(() => {
    const map = new Map<string, RequirementMappingContext>();
    listedSuiteRequirements.forEach((req, index) => {
      const data = suiteMappingQueries[index]?.data;
      if (data) map.set(req.id, data);
    });
    return map;
  }, [listedSuiteRequirements, suiteMappingQueries]);

  const { analysisCards, runAnalysisAsync, isAnalyzing } = useAnalysis(projectId);
  const { assertions: reusableAssertions } = useAssertions(projectId);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [requirementSearch, setRequirementSearch] = useState('');
  const [requirementSourceFilter, setRequirementSourceFilter] = useState<'all' | Requirement['source']>('all');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAllPendingOpen, setDeleteAllPendingOpen] = useState(false);
  const [isDeletingAllPending, setIsDeletingAllPending] = useState(false);
  const [requirementToDelete, setRequirementToDelete] = useState<Requirement | undefined>(undefined);
  const [activeRequirement, setActiveRequirement] = useState<Requirement | undefined>(undefined);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isGeneratingTestCases, setIsGeneratingTestCases] = useState(false);
  const generationAbortControllerRef = useRef<AbortController | null>(null);
  const [isApprovingSuite, setIsApprovingSuite] = useState(false);
  const [isRejectingSuite, setIsRejectingSuite] = useState(false);
  const [isAddingToPending, setIsAddingToPending] = useState(false);
  const [suitePanelVisible, setSuitePanelVisible] = useState(false);
  const [expandedSuiteId, setExpandedSuiteId] = useState<string | null>(null);
  const suitePanelRef = useRef<HTMLDivElement>(null);

  const setSuitePanelOpen = React.useCallback(
    (visible: boolean) => {
      setSuitePanelVisible(visible);
      writeSuitePanelVisible(projectId, visible);
    },
    [projectId],
  );

  const selectActiveRequirement = React.useCallback(
    (req: Requirement | undefined, options?: { showPanel?: boolean }) => {
      setActiveRequirement(req);
      if (req?.id) writeActiveRequirementId(projectId, req.id);
      else clearActiveRequirementId(projectId);
      if (options?.showPanel !== undefined) {
        setSuitePanelOpen(options.showPanel);
      }
    },
    [projectId, setSuitePanelOpen],
  );

  const openDraftSuite = requirements.find((r) => r.approvalStatus === 'Draft');

  const workingOnOpenDraft =
    Boolean(openDraftSuite) &&
    Boolean(activeRequirement?.id) &&
    activeRequirement?.id === openDraftSuite?.id &&
    (isCreating || isGeneratingTestCases);

  const captureBlockedByDraft = Boolean(openDraftSuite) && !workingOnOpenDraft;

  const [captureFormKey, setCaptureFormKey] = useState(0);

  const assertCanStartNewSuite = (): boolean => {
    if (!openDraftSuite) return true;
    setToastMessage(
      `Finish the open suite "${openDraftSuite.title}" first: add it to pending review, approve it, or reject it.`,
    );
    setToastType('error');
    setToastOpen(true);
    suitePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return false;
  };

  useEffect(() => {
    if (isLoading || !projectId) return;

    setActiveRequirement((current) => {
      if (current?.id) {
        const fresh = requirements.find((r) => r.id === current.id);
        if (fresh) return fresh;
      }

      const storedId = readActiveRequirementId(projectId);
      if (storedId) {
        const stored = requirements.find((r) => r.id === storedId);
        if (stored) {
          if (stored.approvalStatus === 'Draft') {
            setSuitePanelOpen(true);
            return stored;
          }
          if (stored.approvalStatus === 'Suggested' || stored.approvalStatus === 'Approved') {
            setSuitePanelOpen(readSuitePanelVisible(projectId));
            return stored;
          }
          if (stored.approvalStatus === 'Rejected' || stored.approvalStatus === 'Archived') {
            clearActiveRequirementId(projectId);
            setSuitePanelOpen(false);
          }
        }
      }

      const orphanDraft = requirements.find((r) => r.approvalStatus === 'Draft');
      if (orphanDraft) {
        writeActiveRequirementId(projectId, orphanDraft.id);
        setSuitePanelOpen(true);
        return orphanDraft;
      }

      return current;
    });
  }, [isLoading, projectId, requirements, setSuitePanelOpen]);

  useEffect(() => {
    if (!projectId || isLoading) return;
    const ids = new Set<string>();
    if (activeRequirement?.id) ids.add(activeRequirement.id);
    for (const r of suggested) ids.add(r.id);
    if (expandedSuiteId) ids.add(expandedSuiteId);
    for (const requirementId of ids) {
      void queryClient.prefetchQuery({
        queryKey: queryKeys.testDesigns(projectId, requirementId),
        queryFn: () => testDesignService.listByRequirement(projectId, requirementId),
        staleTime: 60_000,
      });
    }
  }, [projectId, isLoading, activeRequirement?.id, suggested, expandedSuiteId, queryClient]);
  const [attachAssertionOpen, setAttachAssertionOpen] = useState(false);
  const [selectedDesignId, setSelectedDesignId] = useState<string | null>(null);
  const [selectedAssertionIds, setSelectedAssertionIds] = useState<Set<string>>(new Set());
  const [assertionFilterCategory, setAssertionFilterCategory] = useState<string>('all');
  const [assertionFilterSeverity, setAssertionFilterSeverity] = useState<string>('all');
  const { providers: aiProviders } = useAIProviders(projectId);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [selectedAIProviderId, setSelectedAIProviderId] = useState<string>('');

  useEffect(() => {
    if (!aiModalOpen || selectedAIProviderId || aiProviders.length === 0) return;
    const preferred =
      aiProviders.find((p) => p.isDefault && p.enabled) ?? aiProviders.find((p) => p.enabled) ?? aiProviders[0];
    if (preferred) setSelectedAIProviderId(preferred.id);
  }, [aiModalOpen, aiProviders, selectedAIProviderId]);
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

  const [jiraImportOpen, setJiraImportOpen] = useState(false);
  const [jiraConfigured, setJiraConfigured] = useState(false);
  const [jiraImporting, setJiraImporting] = useState(false);
  const importRequirementsInputRef = React.useRef<HTMLInputElement>(null);

  const topPanelRequirementId =
    suitePanelVisible &&
    Boolean(activeRequirement) &&
    (activeRequirement?.approvalStatus === 'Draft' ||
      (activeRequirement?.approvalStatus === 'Suggested' && expandedSuiteId !== activeRequirement.id))
      ? activeRequirement?.id
      : undefined;

  const scrollToDraftPanel = () => {
    if (!openDraftSuite) return;
    selectActiveRequirement(openDraftSuite, { showPanel: true });
    requestAnimationFrame(() => {
      suitePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const artifactsRequirementId = topPanelRequirementId
    ? topPanelRequirementId
    : expandedSuiteId ?? undefined;

  const artifacts = useRequirementArtifacts(projectId, artifactsRequirementId);

  const showTopGeneratedPanel = Boolean(topPanelRequirementId) &&
    (isGeneratingTestCases || artifacts.isLoadingDesigns || artifacts.designs.length > 0);

  const draftPanelOpen =
    Boolean(openDraftSuite) &&
    showTopGeneratedPanel &&
    activeRequirement?.id === openDraftSuite?.id;

  const showCaptureDraftBanner = captureBlockedByDraft && !draftPanelOpen;

  const { operations: projectOperations, isLoading: projectOperationsLoading } = useProjectApiOperations(projectId);

  const mappingContextQuery = useQuery({
    queryKey: queryKeys.requirementMappingContext(projectId, artifactsRequirementId || ''),
    queryFn: () => requirementService.getMappingContext(projectId, artifactsRequirementId!),
    enabled: Boolean(projectId && artifactsRequirementId),
    staleTime: 30_000,
  });

  const formatStrategyApiRef = (operationId: string) =>
    resolveOperationLabel(projectOperations, operationId);

  useEffect(() => {
    requirementService
      .getJiraStatus()
      .then((s) => setJiraConfigured(Boolean(s?.configured)))
      .catch(() => setJiraConfigured(false));
  }, []);

  const buildManualRequirementPayload = (
    partial: Partial<RequirementFormData> & { title: string },
  ): { projectId: string } & Omit<RequirementFormData, 'id'> => ({
    projectId,
    title: partial.title,
    description: partial.description ?? '',
    category: partial.category ?? 'General',
    confidence: partial.confidence ?? 0,
    source: partial.source ?? 'Manual',
    projectAnalysisId: partial.projectAnalysisId ?? null,
    reviewStatus: partial.reviewStatus ?? 'Pending',
    approvalStatus: partial.approvalStatus ?? 'Draft',
    relatedOperations: partial.relatedOperations ?? [],
    relatedFlows: partial.relatedFlows ?? [],
    relatedDatasets: partial.relatedDatasets ?? [],
    acceptanceCriteria: partial.acceptanceCriteria ?? [],
    generationPending: partial.generationPending ?? false,
    generationExpiresAt: partial.generationExpiresAt ?? null,
  });

  const handleImportRequirementsFile = async (file: File | null) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const items: any[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.requirements)
          ? parsed.requirements
          : [parsed];

      let created = 0;
      for (const item of items) {
        const title = typeof item?.title === 'string' ? item.title.trim() : '';
        if (!title) continue;
        await createAsync(
          buildManualRequirementPayload({
            title,
            description: typeof item.description === 'string' ? item.description : '',
            category: typeof item.category === 'string' ? item.category : 'General',
            confidence: typeof item.confidence === 'number' ? item.confidence : 80,
            acceptanceCriteria: Array.isArray(item.acceptanceCriteria) ? item.acceptanceCriteria : [],
          }),
        );
        created += 1;
      }

      if (created === 0) {
        setToastMessage('No valid requirements found. Each item needs a "title" field.');
        setToastType('error');
      } else {
        setToastMessage(`Imported ${created} requirement${created === 1 ? '' : 's'}`);
        setToastType('success');
      }
    } catch (err: any) {
      setToastMessage(err?.message || 'Invalid JSON file');
      setToastType('error');
    } finally {
      setToastOpen(true);
      if (importRequirementsInputRef.current) {
        importRequirementsInputRef.current.value = '';
      }
    }
  };

  const runGenerateTestCasesForRequirement = async (requirement: Requirement): Promise<boolean> => {
    setIsGeneratingTestCases(true);
    const abortController = new AbortController();
    generationAbortControllerRef.current = abortController;
    const aiProvider =
      aiProviders.find((p) => p.isDefault && p.enabled) ?? aiProviders.find((p) => p.enabled);

    try {
      const result = await requirementService.generateTestCases(projectId, requirement.id, {
        providerId: aiProvider?.id,
        useAi: Boolean(aiProvider),
        replaceExisting: true,
      }, { signal: abortController.signal });
      selectActiveRequirement(requirement, { showPanel: true });
      queryClient.setQueryData(queryKeys.testDesigns(projectId, requirement.id), result.designs);
      await queryClient.invalidateQueries({ queryKey: queryKeys.requirements(projectId) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.executionPlansForRequirement(projectId, requirement.id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.requirementMappingContext(projectId, requirement.id),
      });
      const warn = result.warnings?.length ? ` ${result.warnings[0]}` : '';
      setToastMessage(
        result.usedAi
          ? `Generated ${result.designs.length} test case${result.designs.length === 1 ? '' : 's'} mapped to your APIs.${warn}`
          : `Generated ${result.designs.length} test case${result.designs.length === 1 ? '' : 's'} (built-in).${warn}`,
      );
      setToastType('success');
      return true;
    } catch (err: any) {
      if (abortController.signal.aborted) {
        setToastMessage('Test case generation cancelled');
        setToastType('success');
        return false;
      }
      const msg = err?.response?.data?.message || err?.message || 'Failed to generate test cases';
      setToastMessage(msg);
      setToastType('error');
      return false;
    } finally {
      if (generationAbortControllerRef.current === abortController) {
        generationAbortControllerRef.current = null;
      }
      setIsGeneratingTestCases(false);
      setToastOpen(true);
    }
  };

  const handleCaptureFromCriteria = async (payload: {
    title: string;
    description: string;
    acceptanceCriteria: RequirementFormData['acceptanceCriteria'];
  }) => {
    if (!assertCanStartNewSuite()) return;
    try {
      const created = await createAsync(
        buildManualRequirementPayload({
          title: payload.title,
          description: payload.description,
          acceptanceCriteria: payload.acceptanceCriteria,
          generationPending: true,
          generationExpiresAt: Date.now() + 30 * 60 * 1000,
        }),
      );
      if (!created?.id) {
        throw new Error('Requirement was not created');
      }
      selectActiveRequirement(created, { showPanel: true });
      setCaptureFormKey((k) => k + 1);
      const generated = await runGenerateTestCasesForRequirement(created);
      if (!generated) {
        // Do not leave a failed, hidden Draft blocking the next attempt.
        try {
          await removeAsync(created.id);
        } catch {
          // Keep the original generation error visible; the next query refresh will
          // still reflect the server state if cleanup was rejected.
          await queryClient.invalidateQueries({ queryKey: queryKeys.requirements(projectId) });
        }
        selectActiveRequirement(undefined, { showPanel: false });
      }
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to generate test cases');
      setToastType('error');
      setToastOpen(true);
    }
  };

  const handleImportFromJira = async (issueKey: string) => {
    if (!assertCanStartNewSuite()) return;
    setJiraImporting(true);
    let createdRequirementId: string | undefined;
    try {
      const created = await requirementService.importFromJira(projectId, issueKey);
      createdRequirementId = created?.id;
      await queryClient.invalidateQueries({ queryKey: queryKeys.requirements(projectId) });
      setJiraImportOpen(false);
      setToastMessage(`Imported ${issueKey} from Jira`);
      setToastType('success');
      setToastOpen(true);
      if (created?.id) {
        selectActiveRequirement(created, { showPanel: true });
        const generated = await runGenerateTestCasesForRequirement(created);
        if (!generated) {
          try {
            await removeAsync(created.id);
          } catch {
            await queryClient.invalidateQueries({ queryKey: queryKeys.requirements(projectId) });
          }
          selectActiveRequirement(undefined, { showPanel: false });
        }
      }
    } catch (err: any) {
      if (createdRequirementId) {
        try {
          await removeAsync(createdRequirementId);
        } catch {
          await queryClient.invalidateQueries({ queryKey: queryKeys.requirements(projectId) });
        }
        selectActiveRequirement(undefined, { showPanel: false });
      }
      setToastMessage(err?.response?.data?.message || err?.message || 'Jira import failed');
      setToastType('error');
      setToastOpen(true);
    } finally {
      setJiraImporting(false);
    }
  };

  const displayDesigns: TestDesign[] = artifacts.designs;

  const displayExecutionPlans: ExecutionPlan[] = artifacts.executionPlans;

  const showSuiteInPanel = showTopGeneratedPanel;
  const panelRequirement = showSuiteInPanel ? activeRequirement : undefined;
  const panelDesigns = showSuiteInPanel ? displayDesigns : [];

  const suiteIsDraft = activeRequirement?.approvalStatus === 'Draft';
  const suiteIsPending = activeRequirement?.approvalStatus === 'Suggested';
  const canActOnOpenSuite =
    showSuiteInPanel &&
    Boolean(activeRequirement) &&
    panelDesigns.length > 0 &&
    (suiteIsDraft || suiteIsPending);

  const toggleDesignIncluded = async (design: TestDesign) => {
    const nextStatus = design.status === 'Disabled' ? 'Ready' : 'Disabled';
    try {
      await artifacts.updateDesignStatus({ designId: design.id, status: nextStatus });
      setToastMessage(nextStatus === 'Disabled' ? 'Test case excluded from execution' : 'Test case included in execution');
      setToastType('success');
      setToastOpen(true);
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to update test case');
      setToastType('error');
      setToastOpen(true);
    }
  };

  const handleUpdateDesignOperation = async (design: TestDesign, operationId: string) => {
    if (!operationId || operationId === design.operationId) return;
    try {
      await artifacts.updateDesign({ designId: design.id, operationId, rebuildPayload: true });
      if (artifactsRequirementId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.requirementMappingContext(projectId, artifactsRequirementId),
        });
      }
      setToastMessage('API mapping updated and request body refreshed for this scenario.');
      setToastType('success');
      setToastOpen(true);
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to update API mapping');
      setToastType('error');
      setToastOpen(true);
    }
  };

  const handleUpdateDesignRequestBody = async (design: TestDesign, body: unknown) => {
    await artifacts.updateDesign({
      designId: design.id,
      // Only the body is patched. The backend merges this with the existing
      // request overrides so mapping, headers, query values, and assertions
      // are not changed by preview autosave.
      requestOverrides: { body },
    });
  };

  const togglePlanIncluded = async (plan: ExecutionPlan) => {
    const nextStatus = plan.status === 'Disabled' ? 'Ready' : 'Disabled';
    try {
      await artifacts.updatePlanStatus({ planId: plan.id, status: nextStatus });
      setToastMessage(nextStatus === 'Disabled' ? 'Step excluded from execution' : 'Step included in execution');
      setToastType('success');
      setToastOpen(true);
    } catch (err: any) {
      setToastMessage(err?.message || 'Failed to update execution step');
      setToastType('error');
      setToastOpen(true);
    }
  };

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
      const updated = await updateAsync(requirementId, { approvalStatus: status });
      if (updated) {
        queryClient.setQueryData<Requirement[]>(queryKeys.requirements(projectId), (current) =>
          (current ?? []).map((item) => item.id === requirementId ? { ...item, ...updated } : item),
        );
      }
      // Ensure the section counters and Approved/Archived tabs immediately
      // use the persisted server state after a status transition.
      await queryClient.refetchQueries({
        queryKey: queryKeys.requirements(projectId),
        type: 'active',
      });
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
      await removeAsync(requirementToDelete.id);
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
      await artifacts.invalidateArtifacts();
      setToastMessage('Test cases generated — uncheck any you do not want to run');
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
      await artifacts.invalidateArtifacts();
      setToastMessage('Execution plans built for included test cases only');
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
    selectActiveRequirement(requirement);
    setAiStrategyModalOpen(true);
  };

  const handleAIStrategyPreview = async () => {
    if (!aiStrategyProviderId || !activeRequirement) return;
    setAiLoading(true);
    setAiStrategyWarnings([]);
    try {
      const result = await requirementService.generateStrategyWithAI(projectId, activeRequirement.id, { providerId: aiStrategyProviderId, previewOnly: true });
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
    if (!aiStrategyProviderId || !activeRequirement) return;
    setAiLoading(true);
    setAiStrategyWarnings([]);
    try {
      const result = await requirementService.generateStrategyWithAI(projectId, activeRequirement.id, { providerId: aiStrategyProviderId, previewOnly: false });
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
    selectActiveRequirement(requirement);
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
    if (!aiDesignProviderId || !activeRequirement) return;
    setAiLoading(true);
    setAiDesignWarnings([]);
    try {
      const result = await requirementService.generateDesignWithAI(projectId, activeRequirement.id, { providerId: aiDesignProviderId, previewOnly: true });
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
    if (!aiDesignProviderId || !activeRequirement) return;
    setAiLoading(true);
    setAiDesignWarnings([]);
    try {
      const result = await requirementService.generateDesignWithAI(projectId, activeRequirement.id, { providerId: aiDesignProviderId, previewOnly: false });
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
    selectActiveRequirement(requirement);
    setAiExecutionPlanModalOpen(true);
  };

  const handleAIExecutionPlanPreview = async () => {
    if (!aiExecutionPlanProviderId || !activeRequirement) return;
    setAiLoading(true);
    setAiExecutionPlanWarnings([]);
    try {
      const result = await requirementService.generateExecutionPlanWithAI(projectId, activeRequirement.id, { providerId: aiExecutionPlanProviderId, previewOnly: true });
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
    if (!aiExecutionPlanProviderId || !activeRequirement) return;
    setAiLoading(true);
    setAiExecutionPlanWarnings([]);
    try {
      const result = await requirementService.generateExecutionPlanWithAI(projectId, activeRequirement.id, { providerId: aiExecutionPlanProviderId, previewOnly: false });
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

  const handleToggleSuiteView = (requirement: Requirement) => {
    if (requirement.approvalStatus === 'Draft') {
      setExpandedSuiteId(null);
      selectActiveRequirement(requirement, { showPanel: true });
      requestAnimationFrame(() => {
        suitePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }

    if (expandedSuiteId === requirement.id) {
      setExpandedSuiteId(null);
      if (activeRequirement?.id === requirement.id) {
        selectActiveRequirement(undefined, { showPanel: false });
      }
      return;
    }

    setExpandedSuiteId(requirement.id);
    selectActiveRequirement(requirement, { showPanel: false });
  };

  const handleAddToPendingReview = async () => {
    if (!activeRequirement || activeRequirement.approvalStatus !== 'Draft') return;
    setIsAddingToPending(true);
    try {
      await updateAsync(activeRequirement.id, {
        approvalStatus: 'Suggested',
        reviewStatus: 'Pending',
      });
      selectActiveRequirement(
        {
          ...activeRequirement,
          approvalStatus: 'Suggested',
          reviewStatus: 'Pending',
        },
        { showPanel: false },
      );
      setExpandedSuiteId(activeRequirement.id);
      setToastMessage('Suite added to pending review. You can generate another suite or approve this one later.');
      setToastType('success');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to add suite to pending');
      setToastType('error');
    } finally {
      setIsAddingToPending(false);
      setToastOpen(true);
    }
  };

  const handleApproveTestSuite = async (requirementOverride?: Requirement) => {
    const requirement = requirementOverride ?? activeRequirement;
    if (!requirement) return;

    let designs: TestDesign[] = [];
    try {
      designs = await testDesignService.listByRequirement(projectId, requirement.id);
    } catch {
      designs = requirement.id === activeRequirement?.id ? displayDesigns : [];
    }

    const includedCount = designs.filter((d) => d.status !== 'Disabled').length;
    if (includedCount === 0) {
      setToastMessage('Generate test cases for this suite before approving (no included cases found).');
      setToastType('error');
      setToastOpen(true);
      return;
    }

    setIsApprovingSuite(true);
    try {
      await planExecutionAsync({ projectId, requirementId: requirement.id });
      const updated = await updateAsync(requirement.id, {
        approvalStatus: 'Approved',
        reviewStatus: 'Reviewed',
      });
      if (updated) {
        queryClient.setQueryData<Requirement[]>(queryKeys.requirements(projectId), (current) =>
          (current ?? []).map((item) => item.id === requirement.id ? { ...item, ...updated } : item),
        );
      }
      // Close and clear the persisted review panel before the requirements
      // query refreshes; otherwise its synchronization effect can reopen the
      // suite using the old active-panel state.
      setExpandedSuiteId(null);
      selectActiveRequirement(undefined, { showPanel: false });
      // The approval tab is backed by approvalStatus from the requirements
      // list. Refetch after the mutation so it cannot render a stale snapshot.
      await queryClient.refetchQueries({
        queryKey: queryKeys.requirements(projectId),
        type: 'active',
      });
      navigate(projectModulePath(projectId, 'requirements', 'approved'));
      setToastMessage(
        `Test suite approved with ${includedCount} case${includedCount === 1 ? '' : 's'}. Run it from Execution.`,
      );
      setToastType('success');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to approve test suite';
      setToastMessage(msg);
      setToastType('error');
    } finally {
      setIsApprovingSuite(false);
      setToastOpen(true);
    }
  };

  const rejectRequirementSuite = async (requirement: Requirement) => {
    setIsRejectingSuite(true);
    try {
      const rejectedId = requirement.id;
      setExpandedSuiteId(null);
      await updateAsync(rejectedId, {
        approvalStatus: 'Rejected',
        reviewStatus: 'Reviewed',
      });
      if (activeRequirement?.id === rejectedId) {
        const next = requirements
          .filter((r) => r.id !== rejectedId && r.approvalStatus === 'Suggested')
          .sort((a, b) => b.updatedAt - a.updatedAt)[0];
        if (next) {
          setExpandedSuiteId(next.id);
          selectActiveRequirement(next, { showPanel: false });
        } else {
          selectActiveRequirement(undefined, { showPanel: false });
        }
      }
      setToastMessage(
        requirement.approvalStatus === 'Draft'
          ? `Draft "${requirement.title}" discarded. You can generate a new suite.`
          : 'Test suite rejected. It has been moved to Archived.',
      );
      setToastType('success');
    } catch (err: any) {
      setToastMessage(err?.response?.data?.message || err?.message || 'Failed to reject test suite');
      setToastType('error');
    } finally {
      setIsRejectingSuite(false);
      setToastOpen(true);
    }
  };

  const handleRejectTestSuite = async () => {
    if (!activeRequirement) return;
    await rejectRequirementSuite(activeRequirement);
  };

  const pendingReview = [...suggested].sort((a, b) => b.updatedAt - a.updatedAt);
  const normalizedRequirementSearch = requirementSearch.trim().toLowerCase();
  const matchesRequirementFilter = (requirement: Requirement) => {
    if (requirementSourceFilter !== 'all' && requirement.source !== requirementSourceFilter) return false;
    if (!normalizedRequirementSearch) return true;
    return [
      requirement.title,
      requirement.description,
      requirement.jiraIssueKey ?? '',
      ...requirement.acceptanceCriteria.map((criterion) => criterion.text),
    ].join(' ').toLowerCase().includes(normalizedRequirementSearch);
  };

  const cancelTestCaseGeneration = () => {
    generationAbortControllerRef.current?.abort();
  };
  const visiblePendingReview = pendingReview.filter(matchesRequirementFilter);
  const visibleApproved = approved.filter(matchesRequirementFilter);
  const visibleArchived = archived.filter(matchesRequirementFilter);
  const workflowStep = panelRequirement?.approvalStatus === 'Approved'
    ? 4
    : showSuiteInPanel && panelDesigns.length > 0
      ? 3
      : requirements.length > 0
        ? 2
        : 1;

  const handleDeleteAllPending = async () => {
    if (pendingReview.length === 0) return;
    const toDelete = [...pendingReview];
    setIsDeletingAllPending(true);
    try {
      for (const req of toDelete) {
        await removeAsync(req.id);
        if (activeRequirement?.id === req.id) {
          selectActiveRequirement(undefined, { showPanel: false });
        }
        if (expandedSuiteId === req.id) {
          setExpandedSuiteId(null);
        }
      }
      setToastMessage(
        `Deleted ${toDelete.length} pending suite${toDelete.length === 1 ? '' : 's'}.`,
      );
      setToastType('success');
    } catch (err: any) {
      setToastMessage(
        err?.response?.data?.message || err?.message || 'Failed to delete all pending suites',
      );
      setToastType('error');
    } finally {
      setDeleteAllPendingOpen(false);
      setIsDeletingAllPending(false);
      setToastOpen(true);
    }
  };

  const renderRequirementCard = (requirement: Requirement) => {
    const isSuiteExpanded = expandedSuiteId === requirement.id;
    const suiteDesignsLoaded =
      isSuiteExpanded && artifactsRequirementId === requirement.id ? artifacts.designs : [];
    const suiteDesignsLoading =
      isSuiteExpanded && artifactsRequirementId === requirement.id && artifacts.isLoadingDesigns;
    const canApproveInline =
      isSuiteExpanded &&
      requirement.approvalStatus === 'Suggested' &&
      suiteDesignsLoaded.length > 0 &&
      activeRequirement?.id === requirement.id;

    const suiteConfidence = resolveSuiteConfidence(
      requirement,
      mappingByRequirementId.get(requirement.id),
    );

    return (
    <Card key={requirement.id} className='mb-3'>
      <CardContent className='p-4'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='flex-1'>
            <div className='flex items-center gap-2 mb-2'>
              <h4 className='text-sm font-semibold text-text'>{requirement.title}</h4>
              <Badge className={getSourceBadgeVariant(requirement.source)} variant='outline'>
                {requirement.source === 'ProjectAnalysis' ? 'From Analysis' : requirement.source === 'Jira' ? 'Jira' : 'Manual'}
              </Badge>
              <Badge className={getStatusBadgeVariant(requirement.approvalStatus)} variant='outline'>
                {requirement.approvalStatus}
              </Badge>
              {isSuiteExpanded && (
                <Badge variant='secondary'>Test cases shown</Badge>
              )}
            </div>
            <div className='flex items-center gap-3 text-xs text-text-secondary flex-wrap'>
              <span>Category: {requirement.category}</span>
              {requirement.jiraIssueKey ? <span>Issue: {requirement.jiraIssueKey}</span> : null}
              <span>{requirement.acceptanceCriteria.length} criteria</span>
              <span className='inline-flex items-center gap-1'>
                {suiteConfidence.label}:{' '}
                <span className={getConfidenceColor(suiteConfidence.percent ?? 0)}>
                  {suiteConfidence.percent !== null ? `${suiteConfidence.percent}%` : '—'}
                </span>
                {suiteConfidence.low ? (
                  <Badge variant='outline' className='text-xs text-amber-800 dark:text-amber-200'>
                    Low
                  </Badge>
                ) : null}
              </span>
            </div>
            {!isSuiteExpanded && requirement.acceptanceCriteria.length > 0 && (
              <div className='mt-2'>
                <p className='text-xs font-medium text-text-secondary mb-1'>
                  Acceptance criteria ({requirement.acceptanceCriteria.length})
                </p>
                <ul className='list-disc list-inside text-xs text-text-secondary'>
                  {requirement.acceptanceCriteria.slice(0, 2).map((ac) => (
                    <li key={ac.id}>{ac.text}</li>
                  ))}
                  {requirement.acceptanceCriteria.length > 2 && (
                    <li className='text-text-secondary'>
                      ... and {requirement.acceptanceCriteria.length - 2} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
          <div className='ml-2 flex items-center gap-1'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => handleToggleSuiteView(requirement)}
              title={isSuiteExpanded ? 'Hide test cases' : 'Show test cases'}
              aria-label={isSuiteExpanded ? 'Hide test cases' : 'Show test cases'}
            >
              {isSuiteExpanded ? (
                <EyeOff className='h-4 w-4' aria-hidden />
              ) : (
                <Eye className='h-4 w-4' aria-hidden />
              )}
            </Button>
            {requirement.approvalStatus === 'Approved' && (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => void handleStatusChange(requirement.id, 'Archived')}
                title='Archive'
                aria-label='Archive requirement'
              >
                <Archive className='h-4 w-4' aria-hidden />
              </Button>
            )}
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                setRequirementToDelete(requirement);
                setDeleteOpen(true);
              }}
              aria-label='Delete requirement'
            >
              <Trash2 className='h-4 w-4 text-text-secondary' aria-hidden />
            </Button>
          </div>
        </div>

        {isSuiteExpanded && requirement.approvalStatus !== 'Draft' ? (
          <div className='mt-4 border-t border-border pt-4'>
            {canApproveInline ? (
              <div className='mb-3 flex flex-wrap items-center justify-end gap-2'>
                <Button
                  type='button'
                  size='sm'
                  onClick={() => void handleApproveTestSuite(requirement)}
                  disabled={isApprovingSuite || isRejectingSuite}
                >
                  <CheckCircle className='mr-2 h-4 w-4' aria-hidden />
                  {isApprovingSuite ? 'Approving…' : 'Approve test suite'}
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={() => void handleRejectTestSuite()}
                  disabled={isApprovingSuite || isRejectingSuite}
                >
                  <XCircle className='mr-2 h-4 w-4' aria-hidden />
                  {isRejectingSuite ? 'Rejecting…' : 'Reject'}
                </Button>
              </div>
            ) : null}
            <TestCasesListBlock
              requirement={requirement}
              designs={suiteDesignsLoaded}
              isLoading={suiteDesignsLoading}
              onToggleIncluded={toggleDesignIncluded}
              getPriorityBadgeClassName={getPriorityBadgeVariant}
              operations={projectOperations}
              onChangeOperation={handleUpdateDesignOperation}
              onChangeRequestBody={handleUpdateDesignRequestBody}
              allowRequestBodyEdit={requirement.approvalStatus === 'Suggested' || requirement.approvalStatus === 'Approved'}
              isUpdatingMapping={artifacts.isUpdatingMapping}
              allowMappingEdit={requirement.approvalStatus !== 'Approved' && requirement.approvalStatus !== 'Archived'}
            />
            {requirement.approvalStatus === 'Suggested' ? (
              <p className='mt-2 text-xs text-text-secondary'>
                Uncheck cases you do not want included when executing this suite.
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
  };

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
                          <Badge key={idx} variant='outline' className='text-xs font-mono'>
                            {formatStrategyApiRef(api)}
                          </Badge>
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
                  <Button variant='ghost' size='sm' onClick={() => void togglePlanIncluded(plan)} title='Include in execution'>
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
        <h1 className='text-2xl font-bold text-text mb-6'>Requirements</h1>
        <div className='flex items-center justify-center py-16'>
          <p className='text-sm text-text-secondary'>Loading requirements...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className='mx-auto max-w-7xl px-6 py-8'>
        <h1 className='text-2xl font-bold text-text mb-6'>Requirements</h1>
        <div className='flex items-center justify-center py-16'>
          <p className='text-sm text-error'>Error loading requirements: {error?.message || 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-7xl px-6 py-8'>
      {section === 'requirements' && (
        <>
      <div className='mb-6 grid gap-2 rounded-2xl border border-border bg-surface p-3 sm:grid-cols-4' aria-label='Requirements workflow'>
        {[
          { number: 1, label: 'Add requirement' },
          { number: 2, label: 'Review criteria' },
          { number: 3, label: 'Generate cases' },
          { number: 4, label: 'Approve suite' },
        ].map((step) => (
          <div key={step.number} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${workflowStep === step.number ? 'bg-primary/10 text-primary' : workflowStep > step.number ? 'text-success' : 'text-text-secondary'}`}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${workflowStep >= step.number ? 'bg-primary/10' : 'border border-border'}`}>
              {workflowStep > step.number ? <CheckCircle2 className='h-4 w-4' aria-hidden /> : step.number}
            </span>
            <span className='font-medium'>{step.label}</span>
          </div>
        ))}
      </div>

      <div className='mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        {[
          { label: 'Requirements', value: requirements.length, detail: 'All captured items' },
          { label: 'Pending review', value: pendingReview.length, detail: 'Suites awaiting approval' },
          { label: 'Approved', value: approved.length, detail: 'Ready for execution' },
          { label: 'From Jira', value: requirements.filter((req) => req.source === 'Jira').length, detail: jiraConfigured ? 'Jira connected' : 'Jira not configured' },
        ].map((metric) => (
          <Card key={metric.label} className='border-border'>
            <CardContent className='p-4'>
              <p className='text-xs font-medium uppercase tracking-[0.12em] text-text-secondary'>{metric.label}</p>
              <div className='mt-2 flex items-end justify-between gap-2'>
                <span className='text-2xl font-semibold text-text'>{metric.value}</span>
                <span className='text-right text-xs text-text-secondary'>{metric.detail}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <RequirementCaptureCard
        key={captureFormKey}
        onGenerateTestCases={handleCaptureFromCriteria}
        onImportFromJira={() => setJiraImportOpen(true)}
        jiraConfigured={jiraConfigured}
        apiOperationsCount={projectOperations.length}
        apiOperationsLoading={projectOperationsLoading}
        isSubmitting={isCreating || isGeneratingTestCases}
        generateBlocked={captureBlockedByDraft}
        generateBlockedMessage={
          showCaptureDraftBanner && openDraftSuite
            ? `You have an open draft "${openDraftSuite.title}". Continue it below, or reject it to start a new suite.`
            : undefined
        }
        onViewOpenDraft={showCaptureDraftBanner && openDraftSuite ? scrollToDraftPanel : undefined}
        onDiscardOpenDraft={
          showCaptureDraftBanner && openDraftSuite
            ? () => void rejectRequirementSuite(openDraftSuite)
            : undefined
        }
        isDiscardingDraft={isRejectingSuite}
        onCancelGeneration={cancelTestCaseGeneration}
      />
      <JiraImportDialog
        open={jiraImportOpen}
        onClose={() => setJiraImportOpen(false)}
        onImport={handleImportFromJira}
        isSubmitting={jiraImporting || isGeneratingTestCases}
        jiraConfigured={jiraConfigured}
      />
        </>
      )}

      <div className='mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 sm:flex-row sm:items-center'>
        <input
          type='search'
          value={requirementSearch}
          onChange={(event) => setRequirementSearch(event.target.value)}
          placeholder='Search requirements, Jira keys, or acceptance criteria'
          aria-label='Search requirements'
          className='h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-text outline-none focus:border-primary'
        />
        <RoundedSelect
          value={requirementSourceFilter}
          onChange={(value) => setRequirementSourceFilter(value as typeof requirementSourceFilter)}
          aria-label='Filter requirements by source'
          options={[
            { value: 'all', label: 'All sources' },
            { value: 'Jira', label: 'Jira' },
            { value: 'Manual', label: 'Manual' },
            { value: 'ProjectAnalysis', label: 'Project analysis' },
          ]}
        />
      </div>

      {section === 'requirements' && <div ref={suitePanelRef}>
        <GeneratedTestCasesPanel
          requirement={panelRequirement}
          designs={panelDesigns}
          isGenerating={isGeneratingTestCases || isGeneratingDesigns}
          isLoadingDesigns={artifacts.isLoadingDesigns && showSuiteInPanel}
          onToggleIncluded={toggleDesignIncluded}
          getPriorityBadgeClassName={getPriorityBadgeVariant}
          onApproveSuite={handleApproveTestSuite}
          onRejectSuite={handleRejectTestSuite}
          onAddToPendingReview={handleAddToPendingReview}
          isApproving={isApprovingSuite}
          isRejecting={isRejectingSuite}
          isAddingToPending={isAddingToPending}
          canApproveSuite={canActOnOpenSuite}
          canRejectSuite={canActOnOpenSuite}
          canAddToPending={showSuiteInPanel && suiteIsDraft && panelDesigns.length > 0}
          isSuiteApproved={panelRequirement?.approvalStatus === 'Approved'}
          operations={projectOperations}
          onChangeOperation={handleUpdateDesignOperation}
          isUpdatingMapping={artifacts.isUpdatingMapping}
          mappingBannerMessage={mappingContextQuery.data?.message}
          mappingLowConfidence={mappingContextQuery.data?.lowConfidence}
          onCancelGeneration={cancelTestCaseGeneration}
        />
      </div>}

      {section === 'requirements' && pendingReview.length > 0 && (
        <div className='mb-8'>
          <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
            <div className='flex items-center gap-2'>
              <h2 className='text-lg font-semibold text-text'>Pending review</h2>
              <Badge variant='secondary'>{pendingReview.length}</Badge>
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='text-red-600 hover:text-red-700 dark:text-red-400'
              disabled={isDeletingAllPending}
              onClick={() => setDeleteAllPendingOpen(true)}
              aria-label='Delete all pending review suites'
            >
              <Trash2 className='mr-2 h-4 w-4' aria-hidden />
              {isDeletingAllPending ? 'Deleting…' : 'Delete all'}
            </Button>
          </div>
          <p className='mb-3 text-sm text-text-secondary'>
            Generated suites appear here for review. Approve them for execution or archive them when they are no longer needed. Use the eye icon on a card to show or hide test cases inside that card.
          </p>
          {visiblePendingReview.length > 0 ? visiblePendingReview.map((req) => renderRequirementCard(req)) : (
            <Card className='p-6 text-center'><p className='text-sm text-text-secondary'>No pending requirements match your filters.</p></Card>
          )}
        </div>
      )}

      {section === 'approved' && <div className='mb-8'>
        {approved.length === 0 ? (
          <Card className='p-6 text-center'>
            <p className='text-sm text-text-secondary'>
              No approved suites yet. Generate test cases, select which to keep, then click Approve test suite.
            </p>
          </Card>
        ) : visibleApproved.length === 0 ? (
          <Card className='p-6 text-center'><p className='text-sm text-text-secondary'>No approved requirements match your filters.</p></Card>
        ) : (
          visibleApproved.map((req) => renderRequirementCard(req))
        )}
      </div>}

      {section === 'archived' && <div className='mb-8'>
        {archived.length === 0 ? (
          <Card className='p-6 text-center'>
            <p className='text-sm text-text-secondary'>No archived requirements.</p>
          </Card>
        ) : visibleArchived.length === 0 ? (
          <Card className='p-6 text-center'><p className='text-sm text-text-secondary'>No archived requirements match your filters.</p></Card>
        ) : (
          visibleArchived.map((req) => renderRequirementCard(req))
        )}
      </div>}

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
                    setAttachAssertionOpen(false);
                    setSelectedDesignId(null);
                    setSelectedAssertionIds(new Set());
                    setToastMessage(
                      selectedAssertionIds.size > 0
                        ? `Selected ${selectedAssertionIds.size} assertion(s). Regenerate designs or use AI assertions to persist links.`
                        : 'No assertions selected',
                    );
                    setToastType(selectedAssertionIds.size > 0 ? 'success' : 'error');
                    setToastOpen(true);
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
                      No AI provider found. Set <code className='text-xs'>OLLAMA_BASE_URL</code> in backend{' '}
                      <code className='text-xs'>.env</code> and restart the server, or add one under Administration → AI
                      Providers.
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
                      No AI provider found. Set <code className='text-xs'>OLLAMA_BASE_URL</code> in backend{' '}
                      <code className='text-xs'>.env</code> and restart the server, or add one under Administration → AI
                      Providers.
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
                      No AI provider found. Set <code className='text-xs'>OLLAMA_BASE_URL</code> in backend{' '}
                      <code className='text-xs'>.env</code> and restart the server, or add one under Administration → AI
                      Providers.
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
                    <p className='mt-2 text-xs text-yellow-600'>
                      No AI provider found. Set OLLAMA_BASE_URL in backend .env and restart, or add one under
                      Administration → AI Providers.
                    </p>
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
                      No AI provider found. Set <code className='text-xs'>OLLAMA_BASE_URL</code> in backend{' '}
                      <code className='text-xs'>.env</code> and restart the server, or add one under Administration → AI
                      Providers.
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

      <ConfirmDialog
        open={deleteAllPendingOpen}
        title='Delete all pending suites'
        message={`This will permanently delete all ${pendingReview.length} suite${
          pendingReview.length === 1 ? '' : 's'
        } in Pending review. Approved and archived suites are not affected.`}
        confirmLabel={isDeletingAllPending ? 'Deleting…' : 'Delete all'}
        cancelLabel='Cancel'
        variant='destructive'
        onConfirm={() => void handleDeleteAllPending()}
        onCancel={() => setDeleteAllPendingOpen(false)}
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
