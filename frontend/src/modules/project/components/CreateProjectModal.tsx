// Create Project modal — name and description; id and projectKey are assigned by the API.
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { TextInput } from '../../../components/forms/TextInput';
import { TextArea } from '../../../components/forms/TextArea';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { isDuplicateName, FormErrors } from '../../../utils/validation';

export interface CreateProjectModalData {
  projectName: string;
  description: string;
}

export interface ExistingProjectRef {
  id: string;
  name: string;
}

export interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateProjectModalData) => void;
  existingProjects?: ExistingProjectRef[];
  isSaving?: boolean;
}

export const CreateProjectModal = ({ open, onClose, onSave, existingProjects = [], isSaving = false }: CreateProjectModalProps) => {
  const [projectName, setProjectName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  const validate = React.useCallback((): FormErrors => {
    const newErrors: FormErrors = {};
    const trimmedName = projectName.trim();

    if (!trimmedName) {
      newErrors.projectName = 'Project name is required';
    } else if (isDuplicateName(trimmedName, existingProjects.map((p) => p.name))) {
      newErrors.projectName = 'A project with this name already exists';
    }

    return newErrors;
  }, [projectName, existingProjects]);

  const { errors, validateForm, clearError } = useFormValidation({ validate });

  React.useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setProjectName('');
      setDescription('');
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && !isSaving) onClose();
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        previousFocusRef.current?.focus();
      };
    }
  }, [open, onClose, isSaving]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave({
        projectName: projectName.trim(),
        description: description.trim(),
      });
    }
  };

  return (
    <div
      className='app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center'
      onClick={onClose}
      role='dialog'
      aria-modal='true'
      aria-labelledby='create-project-title'
    >
      <Card className='mx-4 w-full max-w-lg' onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle id='create-project-title'>Create New Project</CardTitle>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0'
              onClick={onClose}
              aria-label='Close'
              type='button'
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit} noValidate>
          <CardContent className='space-y-4'>
            <TextInput
              label='Project name'
              name='projectName'
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                clearError('projectName');
              }}
              placeholder='Enter project name'
              error={errors.projectName}
              required
            />
            <TextArea
              label='Description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Enter project description'
              rows={3}
            />
          </CardContent>
          <CardFooter className='justify-end gap-2'>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type='submit' loading={isSaving}>Save</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CreateProjectModal;
