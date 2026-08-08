import React, { useState } from 'react';

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

import { formatOperationLabel, resolveOperationLabel } from '../utils/operationDisplay';



export interface TestCasesListBlockProps {

  requirement: Requirement;

  designs: TestDesign[];

  isLoading?: boolean;

  onToggleIncluded?: (design: TestDesign) => void | Promise<void>;

  getPriorityBadgeClassName: (priority: string) => string;

  readOnlyInclude?: boolean;

  operations?: ApiOperationOption[];

  onChangeOperation?: (design: TestDesign, operationId: string) => void | Promise<void>;

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



export const TestCasesListBlock: React.FC<TestCasesListBlockProps> = ({

  requirement,

  designs,

  isLoading,

  onToggleIncluded,

  getPriorityBadgeClassName,

  readOnlyInclude,

  operations = [],

  onChangeOperation,

  allowMappingEdit = true,

  isUpdatingMapping,

}) => {

  const [expandedPayloadIds, setExpandedPayloadIds] = useState<Set<string>>(new Set());

  const showApiColumn = operations.length > 0 || designs.some((d) => d.operationId);



  const togglePayload = (designId: string) => {

    setExpandedPayloadIds((prev) => {

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

            const body = design.requestOverrides?.body;

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

                      ) : (

                        <span className='font-mono text-xs text-text'>

                          {resolveOperationLabel(operations, design.operationId)}

                        </span>

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

                    </td>

                  ) : null}

                </tr>

                {showApiColumn && payloadExpanded ? (

                  <tr className={!included ? 'opacity-50' : ''}>

                    <td colSpan={7} className='bg-surface/50 px-3 py-2'>

                      <pre className='max-h-48 overflow-auto rounded border border-border bg-background p-2 font-mono text-xs text-text'>

                        {formatJsonPreview(body)}

                      </pre>

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

