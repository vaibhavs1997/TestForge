import React from 'react';
import { Button } from '../../../components/ui/Button';

export interface JiraImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (issueKey: string) => Promise<void>;
  isSubmitting?: boolean;
  jiraConfigured: boolean;
}

export const JiraImportDialog: React.FC<JiraImportDialogProps> = ({
  open,
  onClose,
  onImport,
  isSubmitting,
  jiraConfigured,
}) => {
  const [issueKey, setIssueKey] = React.useState('');

  React.useEffect(() => {
    if (!open) setIssueKey('');
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = issueKey.trim();
    if (!key) return;
    await onImport(key);
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4' role='dialog' aria-modal='true'>
      <div className='w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-lg'>
        <h3 className='text-lg font-semibold text-text'>Import from Jira</h3>
        <p className='mt-2 text-sm text-text-secondary'>
          Enter a Jira issue key (e.g. PROJ-42). Summary and description become the requirement; bullet lines become acceptance criteria.
        </p>
        {!jiraConfigured && (
          <p className='mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200'>
            Jira is not configured on the server. Add JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN to the repository root .env and restart the backend.
          </p>
        )}
        <form className='mt-4 space-y-4' onSubmit={handleSubmit}>
          <div>
            <label className='mb-1 block text-sm font-medium text-text' htmlFor='jira-issue-key'>
              Issue key
            </label>
            <input
              id='jira-issue-key'
              className='w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text'
              placeholder='PROJ-123'
              value={issueKey}
              onChange={(e) => setIssueKey(e.target.value)}
              disabled={!jiraConfigured || isSubmitting}
              autoFocus
            />
          </div>
          <div className='flex justify-end gap-2'>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type='submit' disabled={!jiraConfigured || !issueKey.trim() || isSubmitting}>
              {isSubmitting ? 'Importing…' : 'Import'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JiraImportDialog;
