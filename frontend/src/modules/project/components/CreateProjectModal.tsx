// Create Project modal with Project name, Project Key, and Description fields.
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { TextInput } from '../../../components/forms/TextInput';
import { TextArea } from '../../../components/forms/TextArea';

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
  const [errors, setErrors] = React.useState<{ projectName?: string; projectId?: string }>({});

  // Reset form fields whenever the modal is opened.
  React.useEffect(() => {
    if (open) {
      setProjectName('');
      setProjectId('');
      setDescription('');
      setErrors({});
    }
  }, [open]);

  if (!open) return null;

  const validate = (): boolean => {
    const newErrors: { projectName?: string; projectId?: string } = {};
    const trimmedName = projectName.trim();
    const trimmedId = projectId.trim();

    if (!trimmedName) {
      newErrors.projectName = 'Project name is required';
    } else if (existingProjects.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      newErrors.projectName = 'A project with this name already exists';
    }

    if (!trimmedId) {
      newErrors.projectId = 'Project Key is required';
    } else if (existingProjects.some((p) => p.id.toLowerCase() === trimmedId.toLowerCase())) {
      newErrors.projectId = 'A project with this Key already exists';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
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
    >
      <Card className='mx-4 w-full max-w-lg' onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>Create New Project</CardTitle>
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
        <form onSubmit={handleSubmit}>
          <CardContent className='space-y-4'>
            <TextInput
              label='Project name'
              value={projectName}
              onChange={(e) => {
                setProjectName(e.target.value);
                if (errors.projectName) setErrors((prev) => ({ ...prev, projectName: undefined }));
              }}
              placeholder='Enter project name'
              error={errors.projectName}
            />
            <TextInput
              label='Project Key'
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                if (errors.projectId) setErrors((prev) => ({ ...prev, projectId: undefined }));
              }}
              placeholder='Enter project key'
              error={errors.projectId}
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