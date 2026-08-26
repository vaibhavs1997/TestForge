import React from 'react';

import { Card, CardContent } from '../../../components/ui/Card';

import { Button } from '../../../components/ui/Button';

import { TextInput } from '../../../components/forms/TextInput';

import { TextArea } from '../../../components/forms/TextArea';

import { fieldLabelClass } from '../../../components/forms/fieldStyles';

import { ClipboardList, Sparkles, Link2 } from 'lucide-react';

import { parseAcceptanceCriteriaText } from '../utils/parseAcceptanceCriteria';
import { clearRequirementCaptureDraft, readRequirementCaptureDraft, writeRequirementCaptureDraft } from '../utils/requirementCaptureDraft';



export interface RequirementCaptureCardProps {

  onGenerateTestCases: (payload: {

    title: string;

    description: string;

    acceptanceCriteria: ReturnType<typeof parseAcceptanceCriteriaText>;

  }) => Promise<void>;

  onImportFromJira: () => void;
  jiraConfigured?: boolean;
  apiOperationsCount?: number;
  apiOperationsLoading?: boolean;

  isSubmitting?: boolean;
  generateBlocked?: boolean;
  generateBlockedMessage?: string;
  onViewOpenDraft?: () => void;
  onDiscardOpenDraft?: () => void;
  isDiscardingDraft?: boolean;
  onCancelGeneration?: () => void;
  /** Project scope for retaining an unfinished capture while navigating. */
  draftStorageKey?: string;
}



export const RequirementCaptureCard: React.FC<RequirementCaptureCardProps> = ({

  onGenerateTestCases,

  onImportFromJira,
  jiraConfigured = false,
  apiOperationsCount = 0,
  apiOperationsLoading = false,

  isSubmitting,
  generateBlocked,
  generateBlockedMessage,
  onViewOpenDraft,
  onDiscardOpenDraft,
  isDiscardingDraft,
  onCancelGeneration,
  draftStorageKey,
}) => {
  const restoredDraft = React.useMemo(() => readRequirementCaptureDraft(draftStorageKey), [draftStorageKey]);
  const [title, setTitle] = React.useState(() => restoredDraft?.title ?? '');
  const [criteriaText, setCriteriaText] = React.useState(() => restoredDraft?.criteriaText ?? '');
  const [sourceMode, setSourceMode] = React.useState<'manual' | 'jira'>(() => restoredDraft?.sourceMode ?? 'manual');

  React.useEffect(() => {
    writeRequirementCaptureDraft(draftStorageKey, { title, criteriaText, sourceMode });
  }, [criteriaText, draftStorageKey, sourceMode, title]);



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    const acceptanceCriteria = parseAcceptanceCriteriaText(criteriaText);

    if (!title.trim() || acceptanceCriteria.length === 0) return;

    await onGenerateTestCases({

      title: title.trim(),

      description: '',

      acceptanceCriteria,

    });

    clearRequirementCaptureDraft(draftStorageKey);
    setTitle('');

    setCriteriaText('');

  };

  const handleClearCapture = () => {
    clearRequirementCaptureDraft(draftStorageKey);
    setTitle('');
    setCriteriaText('');
  };



  return (

    <Card className='mb-8 border-primary/30'>

      <CardContent className='p-6'>

        <div className='mb-4 flex items-start gap-3'>

          <div className='rounded-lg bg-primary/10 p-2' aria-hidden>

            <ClipboardList className='h-6 w-6 text-primary' />

          </div>

          <div>

            <h2 className='text-lg font-semibold text-text'>Start from acceptance criteria</h2>

            <p className='text-sm text-text-secondary'>

              Paste acceptance criteria from a ticket or spec. We&apos;ll generate API test cases mapped to your project.

            </p>

          </div>

        </div>

        <div className='mb-5 grid gap-3 md:grid-cols-2' aria-label='Requirement source'>
          <button
            type='button'
            onClick={() => setSourceMode('jira')}
            className={`rounded-xl border p-4 text-left transition-colors ${sourceMode === 'jira' ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-surface'}`}
            aria-pressed={sourceMode === 'jira'}
          >
            <div className='flex items-center justify-between gap-2'>
              <span className='font-medium text-text'>Import from Jira</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${jiraConfigured ? 'bg-success/10 text-success' : 'bg-background text-text-secondary'}`}>
                {jiraConfigured ? 'Connected' : 'Not configured'}
              </span>
            </div>
            <p className='mt-1 text-xs text-text-secondary'>Fetch a ticket description and acceptance criteria.</p>
          </button>
          <button
            type='button'
            onClick={() => setSourceMode('manual')}
            className={`rounded-xl border p-4 text-left transition-colors ${sourceMode === 'manual' ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-surface'}`}
            aria-pressed={sourceMode === 'manual'}
          >
            <div className='flex items-center justify-between gap-2'>
              <span className='font-medium text-text'>Paste acceptance criteria</span>
              {sourceMode === 'manual' && <span className='rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary'>Selected</span>}
            </div>
            <p className='mt-1 text-xs text-text-secondary'>Add plain text from a specification or ticket.</p>
          </button>
        </div>

        {generateBlocked && generateBlockedMessage ? (
          <div
            className='mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100'
            role='status'
          >
            <p>{generateBlockedMessage}</p>
            {(onViewOpenDraft || onDiscardOpenDraft) && (
              <div className='mt-2 flex flex-wrap gap-2'>
                {onViewOpenDraft ? (
                  <Button type='button' size='sm' variant='secondary' onClick={onViewOpenDraft}>
                    Continue draft
                  </Button>
                ) : null}
                {onDiscardOpenDraft ? (
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={onDiscardOpenDraft}
                    disabled={isDiscardingDraft}
                  >
                    {isDiscardingDraft ? 'Discarding…' : 'Discard draft'}
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {!apiOperationsLoading && apiOperationsCount === 0 ? (
          <div className='mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100' role='status'>
            No API operations are imported yet. Test cases can still be generated and will be displayed for review; you can map them after importing APIs.
          </div>
        ) : null}

        {sourceMode === 'manual' ? <form onSubmit={(e) => void handleSubmit(e)} className='space-y-4' aria-label='Generate test cases from acceptance criteria'>

          <div>
            <div className='flex items-center gap-2'>
              <label htmlFor='requirement-capture-title' className={`${fieldLabelClass} mb-1.5`}>
                Requirement title <span className='ml-1 text-error' aria-hidden='true'>*</span>
              </label>
              <button
                type='button'
                onClick={handleClearCapture}
                className='mb-1.5 text-sm text-primary underline underline-offset-4 transition-colors hover:text-primary/80'
              >
                Clear title and criteria
              </button>
            </div>

            <TextInput

            id='requirement-capture-title'

            required

            value={title}

            onChange={(e) => setTitle(e.target.value)}

            placeholder='e.g. User can reset password via email'

            helperText='Short label for the requirement; test scenarios are derived from acceptance criteria below.'

            />
          </div>

          <TextArea

            id='requirement-capture-criteria'

            label='Acceptance criteria'

            required

            value={criteriaText}

            onChange={(e) => setCriteriaText(e.target.value)}

            rows={6}

            placeholder={'Given a registered user\nWhen they request a reset link\nThen they receive email within 60s\n...'}

            className='font-mono'

            helperText='Use lines, bullets, or complete sentences in a paragraph. Each criterion is analyzed automatically.'

          />

          <div className='flex flex-wrap gap-2'>

            {isSubmitting && onCancelGeneration ? (
              <Button type='button' variant='outline' onClick={onCancelGeneration}>
                Cancel generation
              </Button>
            ) : null}

            <Button type='submit' disabled={isSubmitting || generateBlocked || apiOperationsLoading || !title.trim() || !criteriaText.trim()}>

              <Sparkles className='mr-2 h-4 w-4' aria-hidden />

              {isSubmitting ? 'Generating test cases…' : 'Generate Test Cases'}

            </Button>

            <Button type='button' variant='outline' onClick={onImportFromJira}>

              <Link2 className='mr-2 h-4 w-4' aria-hidden />

              Import from Jira

            </Button>

            <Button type='button' variant='ghost' className='text-text-secondary' disabled aria-disabled>

              <Sparkles className='mr-2 h-4 w-4' aria-hidden />

              Or run project analysis above

            </Button>

          </div>

        </form> : (
          <div className='rounded-xl border border-dashed border-border bg-background/60 p-5'>
            <p className='text-sm font-medium text-text'>Fetch a Jira ticket to begin</p>
            <p className='mt-1 max-w-2xl text-sm text-text-secondary'>Enter an issue key, review the imported requirement, and then generate API test cases from its acceptance criteria.</p>
            <Button type='button' className='mt-4' onClick={onImportFromJira} disabled={isSubmitting}>
              <Link2 className='mr-2 h-4 w-4' aria-hidden />
              {jiraConfigured ? 'Fetch from Jira' : 'Open Jira import'}
            </Button>
          </div>
        )}

      </CardContent>

    </Card>

  );

};



export default RequirementCaptureCard;


