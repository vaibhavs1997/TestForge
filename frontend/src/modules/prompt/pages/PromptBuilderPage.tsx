// PromptBuilderPage - Deterministic prompt construction from project context.
// Features: Template selector, Prompt preview, Variable inspector,
// Token estimate, Validation warnings, Copy prompt, History, Search.
// Read-only generated prompt viewer. Does NOT call any LLM.

import { useState, useEffect, useMemo } from 'react';
import { useTemplates, usePrompts, usePromptBuilder } from '../hooks';
import { promptService } from '../services';
import { SearchBar } from '../../../components/shared';
import type { PromptTemplate, Prompt, PromptTemplateVariable, BuildPromptRequest } from '../types';
import {
  ChevronDown,
  Copy,
  Search,
  Save,
  Clock,
  FileText,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
} from 'lucide-react';

interface PromptBuilderPageProps {
  projectId: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Requirement Generation': 'bg-purple-100 text-purple-800',
  'Test Strategy': 'bg-blue-100 text-blue-800',
  'Test Design': 'bg-green-100 text-green-800',
  'Assertion Generation': 'bg-yellow-100 text-yellow-800',
  'Test Data Generation': 'bg-pink-100 text-pink-800',
  'Failure Analysis': 'bg-red-100 text-red-800',
  'Report Summary': 'bg-indigo-100 text-indigo-800',
  'Custom': 'bg-gray-100 text-gray-800',
};

function getStatusIcon(status: string) {
  switch (status) {
    case 'Validated':
      return <CheckCircle className='h-4 w-4 text-green-500' />;
    case 'Built':
      return <FileText className='h-4 w-4 text-blue-500' />;
    case 'Draft':
      return <Clock className='h-4 w-4 text-yellow-500' />;
    case 'Invalid':
      return <XCircle className='h-4 w-4 text-red-500' />;
    default:
      return <FileText className='h-4 w-4 text-gray-500' />;
  }
}

export function PromptBuilderPage({ projectId }: PromptBuilderPageProps) {
  const { templates, loading: templatesLoading, error: templatesError } = useTemplates(projectId);
  const { prompts, loading: promptsLoading, refetch: refetchPrompts } = usePrompts(projectId);
  const { preview, building, buildError, previewPrompt, buildPrompt } = usePromptBuilder(projectId);

  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Auto-select first template on load
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates.find((t) => t.enabled) || templates[0]);
    }
  }, [templates, selectedTemplate]);

  // Auto-preview when template is selected
  useEffect(() => {
    if (selectedTemplate) {
      previewPrompt({
        templateId: selectedTemplate.id,
        projectId: null,
        variableOverrides: {},
        systemPromptOverride: undefined,
        userPromptOverride: undefined,
      });
    }
  }, [selectedTemplate, previewPrompt]);

  const filteredHistory = useMemo(() => {
    if (!historySearchQuery.trim()) return prompts;
    const q = historySearchQuery.toLowerCase();
    return prompts.filter((p) => p.name.toLowerCase().includes(q) || p.templateId.toLowerCase().includes(q));
  }, [historySearchQuery, prompts]);

  const handleBuildPrompt = async (customVariables?: Record<string, any>) => {
    if (!selectedTemplate) return;
    const result = await buildPrompt({
      templateId: selectedTemplate.id,
      customVariables,
      createdBy: 'User',
    });
    if (result) {
      refetchPrompts();
      setCopied(false);
    }
  };

  const handlePreview = async (template: PromptTemplate) => {
    setSelectedTemplate(template);
  };

  const handleCopy = () => {
    if (!preview) return;
    const fullText = `## System\n\n${preview.systemPrompt}\n\n## User\n\n${preview.userPrompt}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getVariableStatus = (variable: PromptTemplateVariable) => {
    if (!preview) return { resolved: false, value: null };
    const val = preview.variables.find((v) => v.name === variable.name);
    return { resolved: val ? val.resolved : false, value: val ? val.value : null };
  };

  // Loading state
  if (templatesLoading && templates.length === 0) {
    return (
      <div className='flex h-full items-center justify-center'>
        <div className='text-text-secondary'>Loading prompt templates...</div>
      </div>
    );
  }

  return (
    <div className='p-6'>
      {/* Header */}
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-text'>Prompt Builder</h1>
          <p className='mt-1 text-sm text-text-secondary'>
            Deterministically build prompts from project context. No LLM calls.
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Left: Template Selector + History */}
        <div className='space-y-6'>
          {/* Template Selector */}
          <div className='rounded-lg border border-border bg-surface p-4'>
            <h2 className='mb-3 text-sm font-semibold uppercase text-text-secondary'>
              Select Template
            </h2>
            {templatesError && (
              <div className='mb-2 text-sm text-red-500'>{templatesError ? String(templatesError) : ''}</div>
            )}
            {templates.length === 0 ? (
              <div className='py-4 text-center text-sm text-text-secondary'>
                No templates available.
              </div>
            ) : (
              <div className='space-y-2'>
                {templates.map((template) => {
                  const categoryKey = template.category || 'Custom';
                  const colorClass =
                    CATEGORY_COLORS[categoryKey] || 'bg-gray-100 text-gray-800';
                  const isSelected = selectedTemplate?.id === template.id;
                  return (
                    <button
                      key={template.id}
                      onClick={() => handlePreview(template)}
                      className={`w-full rounded-lg border p-3 text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className='flex items-start justify-between'>
                        <div>
                          <div className='font-medium text-text'>{template.name}</div>
                          <div className='mt-1 text-xs text-text-secondary'>
                            {template.description || 'No description'}
                          </div>
                        </div>
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${colorClass}`}
                        >
                          {template.category}
                        </span>
                      </div>
                      <div className='mt-2 flex items-center gap-3 text-xs text-text-secondary'>
                        <span>Version {template.version}</span>
                        <span>Vars: {template.variables.length}</span>
                        {!template.enabled && (
                          <span className='text-red-500'>(Disabled)</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* History */}
          <div className='rounded-lg border border-border bg-surface p-4'>
            <div className='mb-3 flex items-center justify-between'>
              <h2 className='text-sm font-semibold uppercase text-text-secondary'>
                Prompt History
              </h2>
              <Search className='h-4 w-4 text-text-secondary' />
            </div>
            <div className='mb-3'>
              <SearchBar
                value={historySearchQuery}
                onChange={setHistorySearchQuery}
                placeholder='Search history...'
              />
            </div>
            {promptsLoading ? (
              <div className='py-4 text-center text-sm text-text-secondary'>
                Loading history...
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className='py-4 text-center text-sm text-text-secondary'>
                No built prompts yet.
              </div>
            ) : (
              <div className='space-y-2'>
                {filteredHistory.slice(0, 10).map((prompt) => (
                  <div
                    key={prompt.id}
                    className='cursor-pointer rounded border border-border p-3 text-left transition-colors hover:border-primary'
                    onClick={() => {
                      // Open in viewer modal
                      setSelectedTemplate(null);
                      const event = new CustomEvent('openPromptViewer', { detail: { prompt } });
                      window.dispatchEvent(event);
                    }}
                  >
                    <div className='flex items-center gap-2'>
                      {getStatusIcon(prompt.status)}
                      <span className='font-medium text-sm text-text'>{prompt.name}</span>
                    </div>
                    <div className='mt-1 text-xs text-text-secondary'>
                      Template: {prompt.templateId} • Tokens: ~{prompt.tokenEstimate}
                    </div>
                    {prompt.validationWarnings.length > 0 && (
                      <div className='mt-1 text-xs text-red-500'>
                        {prompt.validationWarnings.length} warning(s)
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle + Right: Preview + Variables + Validation */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Template Details */}
          {selectedTemplate && (
            <div className='rounded-lg border border-border bg-surface p-5'>
              <div className='mb-3 flex items-center justify-between'>
                <h2 className='text-lg font-semibold text-text'>{selectedTemplate.name}</h2>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    CATEGORY_COLORS[selectedTemplate.category || 'Custom'] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {selectedTemplate.category}
                </span>
              </div>
              <p className='text-sm text-text-secondary'>{selectedTemplate.description}</p>
              <div className='mt-3 flex gap-4 text-xs text-text-secondary'>
                <span>ID: {selectedTemplate.id}</span>
                <span>Version: {selectedTemplate.version}</span>
                <span>Variables: {selectedTemplate.variables.length}</span>
              </div>
            </div>
          )}

          {/* Token Estimate + Status */}
          {preview && (
            <div className='rounded-lg border border-border bg-surface p-5'>
              <div className='mb-3 flex items-center justify-between'>
                <h2 className='text-lg font-semibold text-text'>Token Estimate & Status</h2>
                <div className='flex items-center gap-2'>
                  {getStatusIcon(preview.status)}
                  <span className='text-sm font-medium text-text'>{preview.status}</span>
                </div>
              </div>
              <div className='grid grid-cols-3 gap-4'>
                <div className='rounded border border-border bg-background p-3 text-center'>
                  <div className='text-2xl font-bold text-text'>{preview.tokenEstimate}</div>
                  <div className='text-xs text-text-secondary'>Estimated Tokens</div>
                </div>
                <div className='rounded border border-border bg-background p-3 text-center'>
                  <div className='text-2xl font-bold text-text'>
                    {(preview.systemPrompt.length + preview.userPrompt.length).toLocaleString()}
                  </div>
                  <div className='text-xs text-text-secondary'>Characters</div>
                </div>
                <div className='rounded border border-border bg-background p-3 text-center'>
                  <div className='text-2xl font-bold text-text'>
                    {preview.variables.filter((v) => v.resolved).length}/{preview.variables.length}
                  </div>
                  <div className='text-xs text-text-secondary'>Variables Resolved</div>
                </div>
              </div>
            </div>
          )}

          {/* Variable Inspector */}
          {preview && selectedTemplate && (
            <div className='rounded-lg border border-border bg-surface p-5'>
              <h2 className='mb-3 text-lg font-semibold text-text'>Variable Inspector</h2>
              <div className='space-y-3'>
                {selectedTemplate.variables.map((variable) => {
                  const { resolved, value } = getVariableStatus(variable);
                  return (
                    <div key={variable.name} className='rounded border border-border bg-background p-3'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <code className='text-xs font-medium text-primary'>{`{{${variable.name}}}`}</code>
                          {variable.required && (
                            <span className='text-xs text-red-500'>(required)</span>
                          )}
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            resolved ? 'text-green-700' : 'text-yellow-700'
                          }`}
                        >
                          {resolved ? 'Resolved' : 'Unresolved'}
                        </span>
                      </div>
                      <div className='mt-1 text-xs text-text-secondary'>
                        {variable.description}
                      </div>
                      <div className='mt-1 text-xs text-text-secondary'>
                        Source: {resolved ? preview.variables.find((v) => v.name === variable.name)?.source : variable.sourcePath}
                      </div>
                      {resolved && value !== null && value !== undefined && (
                        <pre className='mt-2 max-h-32 overflow-auto rounded bg-gray-50 p-2 text-xs text-text'>
                          {typeof value === 'object'
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Validation Warnings */}
          {preview && preview.validationWarnings.length > 0 && (
            <div className='rounded-lg border border-border bg-surface p-5'>
              <div className='mb-3 flex items-center gap-2'>
                <AlertTriangle className='h-5 w-5 text-yellow-500' />
                <h2 className='text-lg font-semibold text-text'>
                  Validation Warnings ({preview.validationWarnings.length})
                </h2>
              </div>
              <div className='space-y-2'>
                {preview.validationWarnings.map((warning, idx) => (
                  <div key={idx} className='rounded border border-border bg-background p-3'>
                    <div className='text-sm text-text'>{warning}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prompt Preview */}
          {preview && (
            <div className='rounded-lg border border-border bg-surface p-5'>
              <div className='mb-3 flex items-center justify-between'>
                <h2 className='text-lg font-semibold text-text'>Prompt Preview</h2>
                <button
                  onClick={handleCopy}
                  className='flex items-center gap-2 rounded bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90'
                >
                  <Copy className='h-4 w-4' />
                  {copied ? 'Copied!' : 'Copy Prompt'}
                </button>
              </div>
              <div className='space-y-4'>
                <div>
                  <label className='text-xs font-medium uppercase text-text-secondary'>
                    System Prompt
                  </label>
                  <pre className='mt-1 w-full rounded bg-background p-3 text-xs text-text overflow-auto max-h-48'>
                    {preview.systemPrompt || '(empty)'}
                  </pre>
                </div>
                <div>
                  <label className='text-xs font-medium uppercase text-text-secondary'>
                    User Prompt
                  </label>
                  <pre className='mt-1 w-full rounded bg-background p-3 text-xs text-text overflow-auto max-h-64'>
                    {preview.userPrompt || '(empty)'}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Build Action */}
          {selectedTemplate && preview && (
            <div className='rounded-lg border border-border bg-surface p-5'>
              <div className='flex items-center justify-between'>
                <div>
                  <h2 className='text-lg font-semibold text-text'>Save Prompt</h2>
                  <p className='text-sm text-text-secondary'>
                    Persist this built prompt to project history.
                  </p>
                </div>
                <button
                  onClick={() => handleBuildPrompt()}
                  disabled={building || preview.validationWarnings.some((w) => w.includes('Required'))}
                  className='flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50'
                >
                  {building ? (
                    <>
                      <Clock className='h-4 w-4 animate-spin' />
                      Building...
                    </>
                  ) : (
                    <>
                      <Save className='h-4 w-4' />
                      Build & Save
                    </>
                  )}
                </button>
              </div>
              {buildError && <div className='mt-2 text-sm text-red-500'>{buildError}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PromptBuilderPage;
