import React from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import type { RequirementFormData } from '../types';
import { parseAcceptanceCriteriaText } from '../utils/parseAcceptanceCriteria';

export interface RequirementFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<RequirementFormData, 'id'>) => Promise<void>;
  isSubmitting?: boolean;
  projectId: string;
}

const defaultForm = (projectId: string): Omit<RequirementFormData, 'id'> & { criteriaText: string } => ({
  projectId,
  title: '',
  description: '',
  category: 'General',
  confidence: 80,
  source: 'Manual',
  projectAnalysisId: null,
  reviewStatus: 'Pending',
  approvalStatus: 'Suggested',
  relatedOperations: [],
  relatedFlows: [],
  relatedDatasets: [],
  acceptanceCriteria: [],
  criteriaText: '',
});

export const RequirementFormDialog: React.FC<RequirementFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  projectId,
}) => {
  const [form, setForm] = React.useState(() => defaultForm(projectId));

  React.useEffect(() => {
    if (open) {
      setForm(defaultForm(projectId));
    }
  }, [open, projectId]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const fromText = parseAcceptanceCriteriaText(form.criteriaText);
    const acceptanceCriteria =
      fromText.length > 0 ? fromText : form.acceptanceCriteria;
    const { criteriaText: _omit, ...rest } = form;
    await onSubmit({
      ...rest,
      title: form.title.trim(),
      description: form.description.trim(),
      acceptanceCriteria,
    });
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50' onClick={onClose}>
      <div className='max-h-[90vh] w-full max-w-lg overflow-y-auto' onClick={(e) => e.stopPropagation()}>
        <Card>
          <CardContent className='p-6'>
            <h3 className='text-lg font-semibold text-text'>Add requirement</h3>
            <p className='mt-1 text-sm text-text-secondary'>
              Add title, description, and paste acceptance criteria (one per line).
            </p>
            <form onSubmit={handleSubmit} className='mt-4 space-y-4'>
              <div>
                <label className='text-sm font-medium text-text'>Title *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                  placeholder='Requirement title'
                />
              </div>
              <div>
                <label className='text-sm font-medium text-text'>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                  placeholder='Context or ticket summary'
                />
              </div>
              <div>
                <label className='text-sm font-medium text-text'>Acceptance criteria</label>
                <textarea
                  value={form.criteriaText}
                  onChange={(e) => setForm((f) => ({ ...f, criteriaText: e.target.value }))}
                  rows={5}
                  className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono text-text'
                  placeholder='One criterion per line'
                />
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='text-sm font-medium text-text'>Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                  />
                </div>
                <div>
                  <label className='text-sm font-medium text-text'>Confidence %</label>
                  <input
                    type='number'
                    min={0}
                    max={100}
                    value={form.confidence}
                    onChange={(e) => setForm((f) => ({ ...f, confidence: Number(e.target.value) || 0 }))}
                    className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text'
                  />
                </div>
              </div>
              <div className='flex justify-end gap-2 pt-2'>
                <Button type='button' variant='outline' onClick={onClose}>
                  Cancel
                </Button>
                <Button type='submit' disabled={isSubmitting || !form.title.trim()}>
                  {isSubmitting ? 'Saving…' : 'Create requirement'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RequirementFormDialog;
