// Flow Dialog for creating and editing business flows with ordered steps
import React from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { TextInput } from '../../../components/forms/TextInput';
import { TextArea } from '../../../components/forms/TextArea';
import { Select } from '../../../components/forms/Select';
import { Badge } from '../../../components/ui/Badge';
import { FLOW_STATUS_OPTIONS } from '../constants';
import type { KnowledgeFlowFormData, FlowStep, FlowStatus } from '../types';
import { useServices, useApiOperations } from '../../api/hooks/useService';

export interface FlowDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: KnowledgeFlowFormData) => void;
  flow?: KnowledgeFlowFormData;
  projectId: string;
  isSubmitting?: boolean;
}

export const FlowDialog = ({ open, onClose, onSubmit, flow, projectId, isSubmitting }: FlowDialogProps) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState('');
  const [status, setStatus] = React.useState<FlowStatus>('Draft');
  const [steps, setSteps] = React.useState<FlowStep[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Load services and operations for linking API operations to steps
  const { services } = useServices(projectId);
  const serviceIds = React.useMemo(() => services.map((s) => s.id), [services]);
  const { operations } = useApiOperations(projectId, serviceIds);

  React.useEffect(() => {
    if (open) {
      if (flow) {
        setName(flow.name);
        setDescription(flow.description);
        setTags(flow.tags || []);
        setStatus(flow.status);
        setSteps(flow.steps || []);
      } else {
        setName('');
        setDescription('');
        setTags([]);
        setStatus('Draft');
        setSteps([]);
      }
      setErrors({});
    }
  }, [open, flow]);

  if (!open) return null;

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const addStep = () => {
    const newStep: FlowStep = {
      id: crypto.randomUUID(),
      title: '',
      linkedApiOperationId: '',
      description: '',
      expectedResult: '',
      notes: '',
    };
    setSteps((prev) => [...prev, newStep]);
  };

  const removeStep = (stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
  };

  const moveStepUp = (index: number) => {
    if (index === 0) return;
    setSteps((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveStepDown = (index: number) => {
    if (index >= steps.length - 1) return;
    setSteps((prev) => {
      const next = [...prev];
      [next[index + 1], next[index]] = [next[index], next[index + 1]];
      return next;
    });
  };

  const updateStep = (stepId: string, field: keyof FlowStep, value: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, [field]: value } : s))
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Flow Name is required';
    if (steps.length === 0) newErrors.steps = 'Add at least one step';
    steps.forEach((step, idx) => {
      if (!step.title.trim()) {
        newErrors[`step-${idx}`] = 'Step title is required';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const cleanedSteps = steps.map((s) => ({
      ...s,
      title: s.title.trim(),
      linkedApiOperationId: s.linkedApiOperationId || undefined,
      description: s.description.trim(),
      expectedResult: s.expectedResult.trim(),
      notes: s.notes.trim(),
    }));

    onSubmit({
      id: flow?.id,
      projectId,
      name: name.trim(),
      description: description.trim(),
      tags,
      status,
      steps: cleanedSteps,
    });
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50' onClick={onClose}>
      <Card className='mx-4 w-full max-w-4xl max-h-[90vh] overflow-y-auto' onClick={(e) => e.stopPropagation()}>
        <CardHeader className='sticky top-0 bg-background z-10 border-b border-border'>
          <div className='flex items-center justify-between'>
            <CardTitle>{flow ? 'Edit Business Flow' : 'Create Business Flow'}</CardTitle>
            <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={onClose} aria-label='Close' type='button' disabled={isSubmitting}>
              <X className='h-4 w-4' />
            </Button>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className='space-y-6'>
            {/* General Section */}
            <div className='space-y-4'>
              <h3 className='text-sm font-semibold text-text'>General</h3>
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <TextInput
                  label='Flow Name'
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }}
                  placeholder='e.g., User Registration'
                  error={errors.name}
                  required
                />
                <Select
                  label='Status'
                  value={status}
                  onChange={(e) => setStatus(e.target.value as FlowStatus)}
                  options={FLOW_STATUS_OPTIONS}
                />
              </div>
              <TextArea
                label='Description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Describe what this flow does...'
                rows={3}
              />
              <div>
                <label className='mb-1.5 block text-sm font-medium text-text'>Tags</label>
                <div className='flex flex-wrap gap-2 rounded-lg border border-border bg-background p-2 min-h-10'>
                  {tags.map((tag) => (
                    <Badge key={tag} variant='secondary' className='flex items-center gap-1'>
                      {tag}
                      <button
                        type='button'
                        onClick={() => handleRemoveTag(tag)}
                        className='ml-1 text-text-secondary hover:text-text'
                      >
                        <X className='h-3 w-3' />
                      </button>
                    </Badge>
                  ))}
                  <input
                    type='text'
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? 'Type and press Enter to add tags...' : ''}
                    className='flex-1 min-w-32 bg-transparent text-sm text-text placeholder:text-text-secondary/50 focus:outline-none'
                  />
                </div>
                {tags.length > 0 && (
                  <p className='mt-1 text-xs text-text-secondary'>Press Enter to add a tag</p>
                )}
              </div>
            </div>

            {/* Steps Section */}
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-semibold text-text'>Ordered Steps</h3>
                <Button type='button' variant='outline' size='sm' onClick={addStep}>
                  <Plus className='mr-1 h-4 w-4' />
                  Add Step
                </Button>
              </div>

              {errors.steps && <p className='text-sm text-error'>{errors.steps}</p>}

              {steps.length === 0 ? (
                <div className='rounded-lg border border-dashed border-border p-8 text-center'>
                  <p className='text-sm text-text-secondary'>No steps yet. Add a step to define the flow.</p>
                </div>
              ) : (
                <div className='space-y-4'>
                  {steps.map((step, idx) => (
                    <div key={step.id} className='rounded-lg border border-border p-4'>
                      <div className='mb-3 flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <span className='flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white'>
                            {idx + 1}
                          </span>
                          <h4 className='text-sm font-semibold text-text'>Step {idx + 1}</h4>
                        </div>
                        <div className='flex items-center gap-1'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => moveStepUp(idx)}
                            disabled={idx === 0}
                            aria-label='Move step up'
                          >
                            <ArrowUp className='h-4 w-4' />
                          </Button>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => moveStepDown(idx)}
                            disabled={idx >= steps.length - 1}
                            aria-label='Move step down'
                          >
                            <ArrowDown className='h-4 w-4' />
                          </Button>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => removeStep(step.id)}
                            aria-label='Remove step'
                          >
                            <Trash2 className='h-4 w-4 text-error' />
                          </Button>
                        </div>
                      </div>

                      <div className='space-y-3'>
                        <TextInput
                          label='Title'
                          value={step.title}
                          onChange={(e) => updateStep(step.id, 'title', e.target.value)}
                          placeholder='e.g., Verify Email'
                          error={errors[`step-${idx}`]}
                          required
                        />
                        <div>
                          <label className='mb-1.5 block text-sm font-medium text-text'>Linked API Operation</label>
                          <select
                            value={step.linkedApiOperationId || ''}
                            onChange={(e) => updateStep(step.id, 'linkedApiOperationId', e.target.value)}
                            className='flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1'
                          >
                            <option value=''>No linked operation</option>
                            {operations.map((op) => (
                              <option key={op.id} value={op.id}>
                                {op.serviceName ? `${op.serviceName} · ` : ''}{op.method} {op.path}
                              </option>
                            ))}
                          </select>
                          {operations.length === 0 && (
                            <p className='mt-1 text-xs text-text-secondary'>No API operations available. Import APIs first to link operations.</p>
                          )}
                        </div>
                        <TextArea
                          label='Description'
                          value={step.description}
                          onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                          placeholder='What happens in this step?'
                          rows={2}
                        />
                        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                          <TextArea
                            label='Expected Result'
                            value={step.expectedResult}
                            onChange={(e) => updateStep(step.id, 'expectedResult', e.target.value)}
                            placeholder='What should happen?'
                            rows={2}
                          />
                          <TextArea
                            label='Notes'
                            value={step.notes}
                            onChange={(e) => updateStep(step.id, 'notes', e.target.value)}
                            placeholder='Additional notes...'
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className='sticky bottom-0 bg-background border-t border-border justify-end gap-2'>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : flow ? 'Update Flow' : 'Create Flow'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default FlowDialog;