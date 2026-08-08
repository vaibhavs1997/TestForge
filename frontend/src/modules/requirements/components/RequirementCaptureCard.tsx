import React from 'react';

import { Card, CardContent } from '../../../components/ui/Card';

import { Button } from '../../../components/ui/Button';

import { TextInput } from '../../../components/forms/TextInput';

import { TextArea } from '../../../components/forms/TextArea';

import { ClipboardList, Sparkles, Link2 } from 'lucide-react';

import { parseAcceptanceCriteriaText } from '../utils/parseAcceptanceCriteria';



export interface RequirementCaptureCardProps {

  onGenerateTestCases: (payload: {

    title: string;

    description: string;

    acceptanceCriteria: ReturnType<typeof parseAcceptanceCriteriaText>;

  }) => Promise<void>;

  onImportFromJira: () => void;

  isSubmitting?: boolean;
  generateBlocked?: boolean;
  generateBlockedMessage?: string;
  onViewOpenDraft?: () => void;
  onDiscardOpenDraft?: () => void;
  isDiscardingDraft?: boolean;
}



export const RequirementCaptureCard: React.FC<RequirementCaptureCardProps> = ({

  onGenerateTestCases,

  onImportFromJira,

  isSubmitting,
  generateBlocked,
  generateBlockedMessage,
  onViewOpenDraft,
  onDiscardOpenDraft,
  isDiscardingDraft,
}) => {

  const [title, setTitle] = React.useState('');

  const [criteriaText, setCriteriaText] = React.useState('');



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    const acceptanceCriteria = parseAcceptanceCriteriaText(criteriaText);

    if (!title.trim() || acceptanceCriteria.length === 0) return;

    await onGenerateTestCases({

      title: title.trim(),

      description: '',

      acceptanceCriteria,

    });

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

        <form onSubmit={(e) => void handleSubmit(e)} className='space-y-4' aria-label='Generate test cases from acceptance criteria'>

          <TextInput

            id='requirement-capture-title'

            label='Requirement title'

            required

            value={title}

            onChange={(e) => setTitle(e.target.value)}

            placeholder='e.g. User can reset password via email'

            helperText='Short label for the requirement; test scenarios are derived from acceptance criteria below.'

          />

          <TextArea

            id='requirement-capture-criteria'

            label='Acceptance criteria'

            required

            value={criteriaText}

            onChange={(e) => setCriteriaText(e.target.value)}

            rows={6}

            placeholder={'Given a registered user\nWhen they request a reset link\nThen they receive email within 60s\n...'}

            className='font-mono'

            helperText='One criterion per line. Bullets and numbers are stripped automatically.'

          />

          <div className='flex flex-wrap gap-2'>

            <Button type='submit' disabled={isSubmitting || generateBlocked || !title.trim() || !criteriaText.trim()}>

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

        </form>

      </CardContent>

    </Card>

  );

};



export default RequirementCaptureCard;


