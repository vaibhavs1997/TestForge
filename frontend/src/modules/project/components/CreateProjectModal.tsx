// Create Project modal with Project name, Project Key, and Description fields.
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { TextInput } from '../../../components/forms/TextInput';
import { TextArea } from '../../../components/forms/TextArea';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { isDuplicateName, isDuplicateId, isValidProjectKey, FormErrors } from '../../../utils/validation';

export interface CreateProjectModalData {
  projectName: string;
  projectId: string;
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
}

export const CreateProjectModal = ({ open, onClose, onSave, existingProjects = [] }: CreateProjectModalProps) => {
  const [projectName, setProjectName] = React.useState('');
  const [projectId, setProjectId] = React.useState('');
  const [description, setDescription] = React.useState('');

  const validate = React.useCallback((): FormErrors => {
    const newErrors: FormErrors = {};
    const trimmedName = projectName.trim();
    const trimmedId = projectId.trim();

    if (!trimmedName) {
      newErrors.projectName = 'Project name is required';
    } else if (isDuplicateName(trimmedName, existingProjects.map((p) => p.name))) {
      newErrors.projectName = 'A project with this name already exists';
    }

    if (!trimmedId) {
      newErrors.projectId = 'Project Key is required';
    } else if (!isValidProjectKey(trimmedId)) {
      newErrors.projectId = 'Project Key must start with a letter and contain only uppercase letters, numbers, and underscores (2-20 chars)';
    } else if (isDuplicateId(trimmedId, existingProjects.map((p) => p.id))) {
      newErrors.projectId = 'A project with this Key already exists';
    }

    return newErrors;
  }, [projectName, projectId, existingProjects]);

  const { errors, validateForm, clearError } = useFormValidation({ validate });

  // Reset form fields whenever the modal is opened.
  React.useEffect(() => {
    if (open) {
      setProjectName('');
      setProjectId('');
      setDescription('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave({
        projectName: projectName.trim(),
        projectId: projectId.trim(),
        description: description.trim(),
      });
    }
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
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
            <TextInput
              label='Project Key'
              name='projectId'
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                clearError('projectId');
              }}
              placeholder='Enter project key'
              error={errors.projectId}
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
            <Button type='button' variant='outline' onClick={onClose}>
              Cancel
            </Button>
            <Button type='submit'>Save</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CreateProjectModal;