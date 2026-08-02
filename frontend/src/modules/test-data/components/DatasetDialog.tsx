// Dataset Editor Dialog for creating and editing datasets
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { TextInput } from '../../../components/forms/TextInput';
import { Select } from '../../../components/forms/Select';

export interface DatasetDialogData {
  id?: string;
  projectId: string;
  name: string;
  description: string;
  category: string;
}

export interface DatasetDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: DatasetDialogData) => void;
  dataset?: DatasetDialogData;
  isSubmitting?: boolean;
}

const categoryOptions = [
  { value: 'General', label: 'General' },
  { value: 'Customer', label: 'Customer' },
  { value: 'Product', label: 'Product' },
  { value: 'Order', label: 'Order' },
  { value: 'Payment', label: 'Payment' },
  { value: 'User', label: 'User' },
  { value: 'Custom', label: 'Custom' },
];

export const DatasetDialog = ({ open, onClose, onSubmit, dataset, isSubmitting }: DatasetDialogProps) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [category, setCategory] = React.useState('Custom');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      if (dataset) {
        setName(dataset.name);
        setDescription(dataset.description);
        setCategory(dataset.category);
      } else {
        setName('');
        setDescription('');
        setCategory('Custom');
      }
      setErrors({});
    }
  }, [open, dataset]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Dataset Name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit({
      id: dataset?.id,
      projectId: dataset?.projectId || '',
      name: name.trim(),
      description: description.trim(),
      category,
    });
  };

  if (!open) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50' onClick={onClose}>
      <Card className='mx-4 w-full max-w-2xl' onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle>{dataset ? 'Edit Dataset' : 'Create Dataset'}</CardTitle>
            <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={onClose} aria-label='Close' type='button' disabled={isSubmitting}>
              <X className='h-4 w-4' />
            </Button>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className='space-y-4'>
            <TextInput
              label='Dataset Name'
              value={name}
              onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }}
              placeholder='e.g., Customer Data, Product Catalog'
              error={errors.name}
              required
            />
            <TextInput
              label='Description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Optional description'
            />
            <Select
              label='Category'
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categoryOptions}
            />
          </CardContent>
          <CardFooter className='justify-end gap-2'>
            <Button type='button' variant='outline' onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : dataset ? 'Update' : 'Create'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default DatasetDialog;