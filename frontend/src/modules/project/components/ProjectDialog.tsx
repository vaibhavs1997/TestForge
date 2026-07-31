// Project create/edit dialog.
import React from 'react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { TextInput } from '../../../components/forms/TextInput';
import { TextArea } from '../../../components/forms/TextArea';
import { Select } from '../../../components/forms/Select';
import type { Project, ProjectFormData } from '../types';

export interface ProjectDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  project?: Project;
  onSubmit: (data: ProjectFormData) => void;
  onCancel: () => void;
}

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const ProjectDialog = ({ open, mode, project, onSubmit, onCancel }: ProjectDialogProps) => {
  if (!open) return null;

  const [name, setName] = React.useState(project?.name ?? '');
  const [description, setDescription] = React.useState(project?.description ?? '');
  const [status, setStatus] = React.useState(project?.status ?? 'active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description, status });
  };

  const title = mode === 'create' ? 'Create Project' : 'Edit Project';
  const submitLabel = mode === 'create' ? 'Create' : 'Save';

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <Card className='mx-4 w-full max-w-lg'>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className='space-y-4'>
            <TextInput
              label='Name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Project name'
              required
            />
            <TextArea
              label='Description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Project description'
              rows={3}
            />
            <Select
              label='Status'
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              options={statusOptions}
            />
          </CardContent>
          <CardFooter className='justify-end gap-2'>
            <Button type='button' variant='outline' onClick={onCancel}>Cancel</Button>
            <Button type='submit'>{submitLabel}</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ProjectDialog;