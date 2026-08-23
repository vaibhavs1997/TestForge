import React, { useEffect, useRef, useState } from 'react';

import { ChevronDown, ChevronRight } from 'lucide-react';

import { Badge } from '../../../components/ui/Badge';

import type { Requirement, TestDesign } from '../types';

import { getTestCaseLabel } from '../utils/requirementReviewDisplay';

import {

  getExpectedHttpStatus,

  getTestCaseType,

  getTestCaseTypeBadgeClass,

} from '../utils/testDesignDisplay';

import type { ApiOperationOption } from '../utils/operationDisplay';

import { formatOperationLabel, resolveOperationLabel, findOperation } from '../utils/operationDisplay';
import { buildDependencyChain, formatDependencyEdge } from '../utils/dependencyDisplay';
import { getMappingDisplay } from '../utils/mappingDisplay';



export interface TestCasesListBlockProps {

  requirement: Requirement;

  designs: TestDesign[];

  isLoading?: boolean;

  onToggleIncluded?: (design: TestDesign) => void | Promise<void>;

  getPriorityBadgeClassName: (priority: string) => string;

  readOnlyInclude?: boolean;

  operations?: ApiOperationOption[];

  onChangeOperation?: (design: TestDesign, operationId: string) => void | Promise<void>;

  onChangeRequestBody?: (design: TestDesign, body: unknown) => Promise<void>;

  allowRequestBodyEdit?: boolean;

  allowMappingEdit?: boolean;

  isUpdatingMapping?: boolean;

}



function formatJsonPreview(body: unknown): string {

  if (body === undefined || body === null) return '—';

  try {

    return JSON.stringify(body, null, 2);

  } catch {

    return String(body);

  }

}

interface RequestBodyEditorProps {
  designId: string;
  body: unknown;
  canEdit: boolean;
  onSave: (body: unknown) => Promise<void>;
}

const RequestBodyEditor: React.FC<RequestBodyEditorProps> = ({ designId, body, canEdit, onSave }) => {
  const serializedBody = formatJsonPreview(body);
  const [draft, setDraft] = useState(serializedBody === '—' ? '' : serializedBody);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'invalid' | 'error'>('idle');
  const previousDesignId = useRef(designId);
  const previousIncomingBody = useRef(serializedBody);

  useEffect(() => {
    if (previousDesignId.current !== designId || previousIncomingBody.current !== serializedBody) {
      setDraft(serializedBody === '—' ? '' : serializedBody);
      setDirty(false);
      setStatus('idle');
    }
    previousDesignId.current = designId;
    previousIncomingBody.current = serializedBody;
  }, [designId, serializedBody]);

  useEffect(() => {
    if (!dirty || !canEdit) return;
    let value: unknown;
    try {
      value = draft.trim() === '' ? undefined : JSON.parse(draft);
    } catch {
      setStatus('invalid');
      return;
    }
    setStatus('saving');
    const timer = window.setTimeout(() => {
      void onSave(value)
        .then(() => { setDirty(false); setStatus('saved'); })
        .catch(() => setStatus('error'));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [canEdit, dirty, draft, onSave]);

  if (!canEdit) return <pre className='max-h-48 overflow-auto rounded border border-border bg-background p-2 font-mono text-xs text-text'>{serializedBody}</pre>;

  return <div>
    <textarea aria-label='Request body payload' value={draft} onChange={(event) => { setDraft(event.target.value); setDirty(true); setStatus('idle'); }} spellCheck={false} className='min-h-40 w-full rounded border border-border bg-background p-2 font-mono text-xs text-text outline-none focus:border-primary' />
    <p className={`mt-1 text-xs ${status === 'invalid' || status === 'error' ? 'text-error' : 'text-text-secondary'}`}>{status === 'saving' ? 'Saving request body…' : status === 'saved' ? 'Request body saved' : status === 'invalid' ? 'Enter valid JSON to save' : status === 'error' ? 'Request body could not be saved. Changes remain in the editor.' : 'Changes save automatically.'}</p>
  </div>;
};



export const TestCasesListBlock: React.FC<TestCasesListBlockProps> = ({

  requirement,

  designs,

  isLoading,

  onToggleIncluded,

  getPriorityBadgeClassName,

  readOnlyInclude,

  operations = [],

  onChangeOperation,

  onChangeRequestBody,

  allowRequestBodyEdit = false,

  allowMappingEdit = true,

  isUpdatingMapping,

}) => {

  const [expandedPayloadIds, setExpandedPayloadIds] = useState<Set<string>>(new Set());
  const [expandedDependencyIds, setExpandedDependencyIds] = useState<Set<string>>(new Set());

  const showApiColumn = operations.length > 0 || designs.some((d) => d.operationId);



  const togglePayload = (designId: string) => {

    setExpandedPayloadIds((prev) => {

      const next = new Set(prev);

      if (next.has(designId)) next.delete(designId);

      else next.add(designId);

      return next;

    });

  };

  const toggleDependencies = (designId: string) => {
    setExpandedDependencyIds((prev) => {
      const next = new Set(prev);
      if (next.has(designId)) next.delete(designId);
      else next.add(designId);
      return next;
    });
  };



  if (isLoading && designs.length === 0) {

    return (

      <div className='rounded-lg border border-dashed border-border py-8 text-center text-sm text-text-secondary'>

        Loading test cases…

      </div>

    );

  }



  if (designs.length === 0) {

    return (

      <div className='rounded-lg border border-dashed border-border py-8 text-center text-sm text-text-secondary'>

        No test cases for this suite.

      </div>

    );

  }



  return (

    <div className='overflow-x-auto rounded-lg border border-border'>

      <table

        className='w-full text-sm'

        aria-label={`Test cases for ${requirement.title}`}

      >

        <thead className='bg-surface text-left text-xs text-text-secondary'>

          <tr>

            <th className='px-3 py-2 w-16'>Include</th>

            <th className='px-3 py-2'>Test case</th>

            {showApiColumn ? <th className='px-3 py-2 min-w-[12rem]'>API</th> : null}

            <th className='px-3 py-2 w-24'>Type</th>

            <th className='px-3 py-2 w-28'>Expected</th>

            <th className='px-3 py-2 w-24'>Priority</th>

            {showApiColumn ? <th className='px-3 py-2 w-28'>Payload</th> : null}

          </tr>

        </thead>

        <tbody className='divide-y divide-border'>

          {designs.map((design, index) => {

            const testCaseType = getTestCaseType(design);

            const expectedStatus = getExpectedHttpStatus(design);

            const caseLabel = getTestCaseLabel(design, requirement.title, index);

            const included = design.status !== 'Disabled';

            const payloadExpanded = expandedPayloadIds.has(design.id);
            const dependenciesExpanded = expandedDependencyIds.has(design.id);
            const body = design.requestOverrides?.body;
            const primaryOperation = findOperation(operations, design.operationId);
            const dependencyChain = buildDependencyChain(designs, design);
            const dependencyCount = dependencyChain.length;
            const mappingDisplay = getMappingDisplay(design);

            const canEditApi =

              allowMappingEdit && !readOnlyInclude && operations.length > 0 && onChangeOperation;



            return (

              <React.Fragment key={design.id}>

                <tr className={!included ? 'opacity-50' : ''}>

                  <td className='px-3 py-2 align-top'>

                    {readOnlyInclude ? (

                      <span className='text-xs text-text-secondary' aria-label={included ? 'Included' : 'Excluded'}>

                        {included ? 'Yes' : 'No'}

                      </span>

                    ) : (

                      <input

                        type='checkbox'

                        checked={included}

                        onChange={() => void onToggleIncluded?.(design)}

                        aria-label={`Include in suite: ${caseLabel}`}

                      />

                    )}

                  </td>

                  <td className='px-3 py-2 text-text align-top'>{caseLabel}</td>

                  {showApiColumn ? (

                    <td className='px-3 py-2 align-top'>

                      {canEditApi ? (
                        <>

                        <select

                          className='w-full max-w-xs rounded border border-border bg-surface px-2 py-1 text-xs text-text'

                          value={design.operationId || ''}

                          disabled={isUpdatingMapping}

                          onChange={(e) => void onChangeOperation?.(design, e.target.value)}

                          aria-label={`API for ${caseLabel}`}

                        >

                          <option value=''>Select operation…</option>

                          {operations.map((op) => (

                            <option key={op.id} value={op.id}>

                              {formatOperationLabel(op)}

                            </option>

                          ))}

                        </select>
                        <div className='mt-1 flex flex-wrap items-center gap-1'>
                          <Badge variant='outline' className='text-[10px]'>{mappingDisplay.stateLabel}</Badge>
                          {mappingDisplay.provenance ? <Badge variant='secondary' className='text-[10px]'>{mappingDisplay.provenance}</Badge> : null}
                          {typeof design.mappingConfidence === 'number' ? <span className='text-[10px] text-text-secondary'>{Math.round(design.mappingConfidence)}%</span> : null}
                        </div>
                        </>
                      ) : (

                        <div>
                        <div className='font-mono text-xs text-text'>

                          {resolveOperationLabel(operations, design.operationId)}{primaryOperation?.name ? ` — ${primaryOperation.name}` : ''}

                        </div>
                        <div className='mt-1 flex flex-wrap items-center gap-1'>
                          <Badge variant='outline' className='text-[10px]'>{mappingDisplay.stateLabel}</Badge>
                          {mappingDisplay.provenance ? <Badge variant='secondary' className='text-[10px]'>{mappingDisplay.provenance}</Badge> : null}
                          {typeof design.mappingConfidence === 'number' ? <span className='text-[10px] text-text-secondary'>{Math.round(design.mappingConfidence)}%</span> : null}
                        </div>
                        </div>

                      )}

                    </td>

                  ) : null}

                  <td className='px-3 py-2 align-top'>

                    <Badge className={getTestCaseTypeBadgeClass(testCaseType)} variant='outline'>

                      {testCaseType}

                    </Badge>

                  </td>

                  <td className='px-3 py-2 font-mono text-xs text-text align-top'>

                    {expectedStatus !== undefined ? `HTTP ${expectedStatus}` : '—'}

                  </td>

                  <td className='px-3 py-2 align-top'>

                    <Badge className={getPriorityBadgeClassName(design.priority)} variant='outline'>

                      {design.priority}

                    </Badge>

                  </td>

                  {showApiColumn ? (

                    <td className='px-3 py-2 align-top'>

                      <button

                        type='button'

                        className='inline-flex items-center gap-1 text-xs text-primary hover:underline'

                        onClick={() => togglePayload(design.id)}

                        aria-expanded={payloadExpanded}

                        aria-label={payloadExpanded ? 'Hide request body' : 'Show request body'}

                      >

                        {payloadExpanded ? (

                          <ChevronDown className='h-3 w-3' aria-hidden />

                        ) : (

                          <ChevronRight className='h-3 w-3' aria-hidden />

                        )}

                        Body

                      </button>
                      {dependencyCount > 0 ? (
                        <button type='button' className='ml-3 inline-flex items-center gap-1 text-xs text-primary hover:underline' onClick={() => toggleDependencies(design.id)} aria-expanded={dependenciesExpanded}>
                          {dependenciesExpanded ? <ChevronDown className='h-3 w-3' aria-hidden /> : <ChevronRight className='h-3 w-3' aria-hidden />}
                          Dependencies: {dependencyCount}
                        </button>
                      ) : null}

                    </td>

                  ) : null}

                </tr>

                {showApiColumn && payloadExpanded ? (

                  <tr className={!included ? 'opacity-50' : ''}>

                    <td colSpan={7} className='bg-surface/50 px-3 py-2'>

                      <RequestBodyEditor
                        designId={design.id}
                        body={body}
                        canEdit={allowRequestBodyEdit && Boolean(design.operationId) && design.mappingState === 'confirmed' && Boolean(onChangeRequestBody)}
                        onSave={(nextBody) => onChangeRequestBody?.(design, nextBody) ?? Promise.resolve()}
                      />
                      {dependenciesExpanded && dependencyCount > 0 ? (
                        <div className='mt-2 rounded border border-border bg-background p-2 text-xs'>
                          <div className='mb-1 font-medium text-text'>Prerequisite chain</div>
                          {dependencyChain.map((dependency) => (
                            <div key={`${dependency.sourceOperationId}-${dependency.targetOperationId}`} className='flex flex-wrap items-center gap-1 text-text-secondary'>
                              <span className='font-mono'>{formatDependencyEdge(dependency, operations)}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}

                    </td>

                  </tr>

                ) : null}

              </React.Fragment>

            );

          })}

        </tbody>

      </table>

    </div>

  );

};



export default TestCasesListBlock;

