// Dataset Editor Dialog for creating and editing datasets
import React from 'react';
import { EntityDialog } from '../../../components/dialogs/EntityDialog';
import { EntityForm, FormField } from '../../../components/forms/EntityForm';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { isDuplicateName, FormErrors } from '../../../utils/validation';

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
  const [existingNames, setExistingNames] = React.useState<string[]>([]);

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
    }
  }, [open, dataset]);

  const validate = React.useCallback((): FormErrors => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Dataset Name is required';
    } else if (isDuplicateName(name, existingNames, dataset?.name)) {
      newErrors.name = 'A dataset with this name already exists';
    }

    return newErrors;
  }, [name, existingNames, dataset]);

  const { errors, validateForm, clearError } = useFormValidation({ validate });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
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

  const formFields: FormField[] = [
    {
      name: 'name',
      label: 'Dataset Name',
      type: 'text',
      placeholder: 'e.g., Customer Data, Product Catalog',
      required: true,
      value: name,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'text',
      placeholder: 'Optional description',
      value: description,
    },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      value: category,
      options: categoryOptions,
    },
  ];

  return (
    <EntityDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={dataset ? 'Edit Dataset' : 'Create Dataset'}
      submitLabel={dataset ? 'Update' : 'Create'}
      isLoading={isSubmitting}
      size="lg"
    >
      <div className="space-y-4">
        <EntityForm
          fields={formFields}
          values={{ name, description, category }}
          onChange={(field, value) => {
            if (field === 'name') {
              setName(value);
              clearError('name');
            } else if (field === 'description') {
              setDescription(value);
            } else if (field === 'category') {
              setCategory(value);
            }
          }}
          errors={errors}
        />
      </div>
    </EntityDialog>
  );
};

export default DatasetDialog;