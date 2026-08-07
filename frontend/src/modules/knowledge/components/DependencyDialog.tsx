import React from 'react';
import { EntityDialog } from '../../../components/dialogs/EntityDialog';
import { EntityForm, FormField } from '../../../components/forms/EntityForm';
import { useFormValidation } from '../../../hooks/useFormValidation';
import type { DependencyFormData, DependencyType } from '../types';

const TYPE_OPTIONS = [
  { value: 'Service', label: 'Service' },
  { value: 'Database', label: 'Database' },
  { value: 'Queue', label: 'Queue' },
  { value: 'Cache', label: 'Cache' },
  { value: 'External', label: 'External' },
  { value: 'Token', label: 'Token' },
  { value: 'Config', label: 'Config' },
];

export interface DependencyDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: DependencyFormData) => void;
  dependency?: DependencyFormData;
  projectId: string;
  isSubmitting?: boolean;
}

export const DependencyDialog = ({
  open,
  onClose,
  onSubmit,
  dependency,
  projectId,
  isSubmitting,
}: DependencyDialogProps) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [dependencyType, setDependencyType] = React.useState<DependencyType>('Service');
  const [target, setTarget] = React.useState('');
  const [version, setVersion] = React.useState('');
  const [isRequired, setIsRequired] = React.useState(true);

  React.useEffect(() => {
    if (!open) return;
    if (dependency) {
      setName(dependency.name);
      setDescription(dependency.description);
      setDependencyType(dependency.dependencyType);
      setTarget(dependency.target);
      setVersion(dependency.version);
      setIsRequired(dependency.isRequired);
    } else {
      setName('');
      setDescription('');
      setDependencyType('Service');
      setTarget('');
      setVersion('');
      setIsRequired(true);
    }
  }, [open, dependency]);

  const validate = React.useCallback(() => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    return errors;
  }, [name]);

  const { errors, validateForm, clearError } = useFormValidation({ validate });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSubmit({
      id: dependency?.id,
      projectId,
      name: name.trim(),
      description: description.trim(),
      dependencyType,
      target: target.trim(),
      version: version.trim(),
      isRequired,
      linkedApiOperationIds: dependency?.linkedApiOperationIds ?? [],
      linkedRequirementIds: dependency?.linkedRequirementIds ?? [],
      tags: dependency?.tags ?? [],
    });
  };

  const fields: FormField[] = [
    { name: 'name', label: 'Dependency Name', type: 'text', required: true, value: name },
    { name: 'description', label: 'Description', type: 'text', value: description },
    { name: 'dependencyType', label: 'Type', type: 'select', value: dependencyType, options: TYPE_OPTIONS },
    { name: 'target', label: 'Target', type: 'text', value: target, placeholder: 'Service or resource identifier' },
    { name: 'version', label: 'Version', type: 'text', value: version },
  ];

  if (!open) return null;

  return (
    <EntityDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={dependency ? 'Edit Dependency' : 'Add Dependency'}
      submitLabel={dependency ? 'Update' : 'Create'}
      isLoading={isSubmitting}
      size="lg"
    >
      <div className="space-y-4">
        <EntityForm
          fields={fields}
          values={{ name, description, dependencyType, target, version }}
          onChange={(field, value) => {
            if (field === 'name') {
              setName(value);
              clearError('name');
            } else if (field === 'description') setDescription(value);
            else if (field === 'dependencyType') setDependencyType(value as DependencyType);
            else if (field === 'target') setTarget(value);
            else if (field === 'version') setVersion(value);
          }}
          errors={errors}
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
            className="rounded border-border"
          />
          Required dependency
        </label>
      </div>
    </EntityDialog>
  );
};

export default DependencyDialog;
