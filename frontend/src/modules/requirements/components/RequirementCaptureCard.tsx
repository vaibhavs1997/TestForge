import React from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ClipboardList, Sparkles, Link2 } from 'lucide-react';
import { parseAcceptanceCriteriaText } from '../utils/parseAcceptanceCriteria';

export interface RequirementCaptureCardProps {
  onCreateFromCriteria: (payload: {
    title: string;
    description: string;
    acceptanceCriteria: ReturnType<typeof parseAcceptanceCriteriaText>;
  }) => Promise<void>;
  onImportFromJira: () => void;
  isSubmitting?: boolean;
}

export const RequirementCaptureCard: React.FC<RequirementCaptureCardProps> = ({
  onCreateFromCriteria,
  onImportFromJira,
  isSubmitting,
}) => {
  const [title, setTitle] = React.useState('');
  const [criteriaText, setCriteriaText] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const acceptanceCriteria = parseAcceptanceCriteriaText(criteriaText);
    if (!title.trim() || acceptanceCriteria.length === 0) return;
    await onCreateFromCriteria({
      title: title.trim(),
      description: criteriaText.trim(),
      acceptanceCriteria,
    });
    setTitle('');
    setCriteriaText('');
  };

  return (
    <Card className='mb-8 border-primary/30'>
      <CardContent className='p-6'>
        <div className='mb-4 flex items-start gap-3'>
          <div className='rounded-lg bg-primary/10 p-2'>
            <ClipboardList className='h-6 w-6 text-primary' />
          </div>
          <div>
            <h2 className='text-lg font-semibold text-text'>Start from acceptance criteria</h2>
            <p className='text-sm text-text-secondary'>
              Paste acceptance criteria from a ticket or spec. We&apos;ll generate API test cases mapped to your project.
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className='space-y-4'>
          <div>
            <label className='text-sm font-medium text-text'>Requirement title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g. User can reset password via email'
              className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
            />
          </div>
          <div>
            <label className='text-sm font-medium text-text'>Acceptance criteria *</label>
            <textarea
              value={criteriaText}
              onChange={(e) => setCriteriaText(e.target.value)}
              rows={6}
              placeholder={'Given a registered user\nWhen they request a reset link\nThen they receive email within 60s\n...'}
              className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-text'
            />
            <p className='mt-1 text-xs text-text-secondary'>One criterion per line. Bullets and numbers are stripped automatically.</p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button type='submit' disabled={isSubmitting || !title.trim() || !criteriaText.trim()}>
              {isSubmitting ? 'Creating…' : 'Create requirement'}
            </Button>
            <Button type='button' variant='outline' onClick={onImportFromJira}>
              <Link2 className='mr-2 h-4 w-4' />
              Import from Jira
            </Button>
            <Button type='button' variant='ghost' className='text-text-secondary' disabled>
              <Sparkles className='mr-2 h-4 w-4' />
              Or run project analysis above
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default RequirementCaptureCard;
