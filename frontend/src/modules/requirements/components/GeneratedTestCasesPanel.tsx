import React from 'react';
import { Sparkles, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { Requirement, TestDesign } from '../types';
import { TestCasesListBlock } from './TestCasesListBlock';
import { ApiMappingBanner } from './ApiMappingBanner';
import type { ApiOperationOption } from '../utils/operationDisplay';

export interface GeneratedTestCasesPanelProps {
  requirement?: Requirement;
  designs: TestDesign[];
  isGenerating: boolean;
  isLoadingDesigns?: boolean;
  onToggleIncluded: (design: TestDesign) => void | Promise<void>;
  getPriorityBadgeClassName: (priority: string) => string;
  onApproveSuite?: () => void | Promise<void>;
  onRejectSuite?: () => void | Promise<void>;
  onAddToPendingReview?: () => void | Promise<void>;
  isApproving?: boolean;
  isRejecting?: boolean;
  isAddingToPending?: boolean;
  canApproveSuite?: boolean;
  canRejectSuite?: boolean;
  canAddToPending?: boolean;
  isSuiteApproved?: boolean;
  operations?: ApiOperationOption[];
  onChangeOperation?: (design: TestDesign, operationId: string) => void | Promise<void>;
  isUpdatingMapping?: boolean;
  mappingBannerMessage?: string;
  mappingLowConfidence?: boolean;
  onCancelGeneration?: () => void;
}

export const GeneratedTestCasesPanel: React.FC<GeneratedTestCasesPanelProps> = ({
  requirement,
  designs,
  isGenerating,
  isLoadingDesigns,
  onToggleIncluded,
  getPriorityBadgeClassName,
  onApproveSuite,
  onRejectSuite,
  onAddToPendingReview,
  isApproving,
  isRejecting,
  isAddingToPending,
  canApproveSuite,
  canRejectSuite,
  canAddToPending,
  isSuiteApproved,
  operations,
  onChangeOperation,
  isUpdatingMapping,
  mappingBannerMessage,
  mappingLowConfidence,
  onCancelGeneration,
}) => {
  const includedCount = designs.filter((d) => d.status !== 'Disabled').length;

  return (
    <div className='mb-8' aria-busy={isGenerating}>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
        <div>
          <div className='flex items-center gap-2'>
            <h2 className='text-lg font-semibold text-text'>Generated test cases</h2>
            {isGenerating && (
              <Badge variant='secondary' className='inline-flex items-center gap-1.5'>
                <Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden />
                Generating...
              </Badge>
            )}
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          {designs.length > 0 && (
            <Badge variant='secondary'>
              {includedCount} of {designs.length} selected
            </Badge>
          )}
          {canAddToPending && onAddToPendingReview && (
            <Button
              type='button'
              size='sm'
              variant='secondary'
              onClick={() => void onAddToPendingReview()}
              disabled={isApproving || isRejecting || isAddingToPending}
            >
              <Clock className='mr-2 h-4 w-4' aria-hidden />
              {isAddingToPending ? 'Adding…' : 'Add to pending review'}
            </Button>
          )}
          {canApproveSuite && onApproveSuite && (
            <Button
              type='button'
              size='sm'
              onClick={() => void onApproveSuite()}
              disabled={isApproving || isRejecting || includedCount === 0}
            >
              <CheckCircle className='mr-2 h-4 w-4' />
              {isApproving ? 'Approving…' : 'Approve test suite'}
            </Button>
          )}
          {canRejectSuite && onRejectSuite && (
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={() => void onRejectSuite()}
              disabled={isApproving || isRejecting}
            >
              <XCircle className='mr-2 h-4 w-4' />
              {isRejecting ? 'Rejecting…' : 'Reject'}
            </Button>
          )}
          {isSuiteApproved && (
            <Badge className='bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' variant='outline'>
              Suite approved
            </Badge>
          )}
        </div>
      </div>

      {isGenerating ? (
        <div className='rounded-lg border border-primary/40 bg-primary/5 py-12 text-center text-sm text-text-secondary' role='status' aria-live='polite'>
          <Loader2 className='mx-auto mb-3 h-8 w-8 animate-spin text-primary' aria-hidden />
          <p className='font-medium text-text'>Generating test cases...</p>
          <p>Creating test cases from your acceptance criteria…</p>
          <p className='mt-2 text-xs'>This can take up to a minute when AI mapping is enabled. Mapped APIs and payloads will appear below.</p>
          {onCancelGeneration ? (
            <Button type='button' variant='outline' size='sm' className='mt-4' onClick={onCancelGeneration}>
              Cancel generation
            </Button>
          ) : null}
        </div>
      ) : isLoadingDesigns && designs.length === 0 ? (
        <div className='rounded-lg border border-dashed border-border py-12 text-center text-sm text-text-secondary'>
          Loading saved test cases…
        </div>
      ) : !requirement ? (
        <EmptyState
          icon={<Sparkles className='h-8 w-8' />}
          title='No test cases yet'
          description='Fill in the requirement title and acceptance criteria, then generate test cases mapped to your APIs.'
        />
      ) : designs.length === 0 ? (
        <div className='rounded-lg border border-dashed border-border py-12 text-center text-sm text-text-secondary'>
          No test cases were returned. Try generating again or check that APIs are imported for this project.
        </div>
      ) : (
        <>
          {(mappingLowConfidence || mappingBannerMessage) && (
            <ApiMappingBanner
              lowConfidence={mappingLowConfidence}
              message={mappingBannerMessage || 'Review API mappings before approving this suite.'}
            />
          )}
          <TestCasesListBlock
            requirement={requirement}
            designs={designs}
            isLoading={isLoadingDesigns}
            onToggleIncluded={onToggleIncluded}
            getPriorityBadgeClassName={getPriorityBadgeClassName}
            operations={operations}
            onChangeOperation={onChangeOperation}
            isUpdatingMapping={isUpdatingMapping}
          />
        </>
      )}

      <p className='mt-3 text-xs text-text-secondary'>
        Test cases are matched to imported API operations; payloads cover positive, negative, and security scenarios.
        Run included cases from the Execution workspace.
      </p>
    </div>
  );
};

export default GeneratedTestCasesPanel;
