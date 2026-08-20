// Rename Project modal with Project name field.
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { TextInput } from '../../../components/forms/TextInput';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { isDuplicateName, FormErrors } from '../../../utils/validation';

export interface RenameProjectModalProps {
  open: boolean;
  currentName: string;
  onClose: () => void;
  onSave: (newName: string) => void;
  existingNames?: string[];
  isSaving?: boolean;
}

export const RenameProjectModal = ({
  open,
  currentName,
  onClose,
  onSave,
  existingNames = [],
  isSaving = false,
}: RenameProjectModalProps) => {
  const [name, setName] = React.useState(currentName);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  const validate = React.useCallback((): FormErrors => {
    const newErrors: FormErrors = {};
    const trimmed = name.trim();

    if (!trimmed) {
      newErrors.name = 'Project name is required';
    } else if (isDuplicateName(trimmed, existingNames, currentName)) {
      newErrors.name = 'A project with this name already exists';
    }

    return newErrors;
  }, [name, existingNames, currentName]);

  const { errors, validateForm, clearError } = useFormValidation({ validate });

  // Sync the input with the current project name whenever the modal opens
  React.useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setName(currentName);
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && !isSaving) onClose();
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        previousFocusRef.current?.focus();
      };
    }
  }, [open, currentName, onClose, isSaving]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(name.trim());
    }
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
      onClick={onClose}
      role='dialog'
      aria-modal='true'
      aria-labelledby='rename-project-title'
    >
      <Card className='mx-4 w-full max-w-md' onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle id='rename-project-title'>Rename Project</CardTitle>
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
              name='name'
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError('name');
              }}
              placeholder='Enter project name'
              error={errors.name}
              autoFocus
              required
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

export default RenameProjectModal;
