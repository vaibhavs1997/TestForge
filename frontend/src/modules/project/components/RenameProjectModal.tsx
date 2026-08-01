// Rename Project modal with Project name field.
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { TextInput } from '../../../components/forms/TextInput';

export interface RenameProjectModalProps {
  open: boolean;
  currentName: string;
  onClose: () => void;
  onSave: (newName: string) => void;
  existingNames?: string[];
}

export const RenameProjectModal = ({
  open,
  currentName,
  onClose,
  onSave,
  existingNames = [],
}: RenameProjectModalProps) => {
  const [name, setName] = React.useState(currentName);
  const [error, setError] = React.useState<string | undefined>(undefined);

  // Sync the input with the current project name whenever the modal opens
  React.useEffect(() => {
    if (open) {
      setName(currentName);
      setError(undefined);
    }
  }, [open, currentName]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setError('Project name is required');
      return;
    }

    // Allow keeping the same name; only block if it matches another project
    if (trimmed.toLowerCase() !== currentName.toLowerCase() && existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setError('A project with this name already exists');
      return;
    }

    onSave(trimmed);
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
      onClick={onClose}
    >
      <Card className='mx-4 w-full max-w-md' onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>Rename Project</CardTitle>
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
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(undefined);
              }}
              placeholder='Enter project name'
              error={error}
              autoFocus
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

export default RenameProjectModal;