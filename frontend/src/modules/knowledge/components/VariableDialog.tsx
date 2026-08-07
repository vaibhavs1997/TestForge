import React from 'react';
import { EntityDialog } from '../../../components/dialogs/EntityDialog';
import { EntityForm, FormField } from '../../../components/forms/EntityForm';
import { useFormValidation } from '../../../hooks/useFormValidation';
import type { RuntimeVariableFormData, VariableScope } from '../types';

const SCOPE_OPTIONS = [
  { value: 'Global', label: 'Global' },
  { value: 'Project', label: 'Project' },
  { value: 'Environment', label: 'Environment' },
  { value: 'Flow', label: 'Flow' },
];

export interface VariableDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RuntimeVariableFormData) => void;
  variable?: RuntimeVariableFormData;
  projectId: string;
  isSubmitting?: boolean;
}

export const VariableDialog = ({ open, onClose, onSubmit, variable, projectId, isSubmitting }: VariableDialogProps) => {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [scope, setScope] = React.useState<VariableScope>('Project');
  const [defaultValue, setDefaultValue] = React.useState('');
  const [isSensitive, setIsSensitive] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (variable) {
      setName(variable.name);
      setDescription(variable.description);
      setScope(variable.scope);
      setDefaultValue(variable.defaultValue);
      setIsSensitive(variable.isSensitive);
    } else {
      setName('');
      setDescription('');
      setScope('Project');
      setDefaultValue('');
      setIsSensitive(false);
    }
  }, [open, variable]);

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
      id: variable?.id,
      projectId,
      name: name.trim(),
      description: description.trim(),
      scope,
      defaultValue,
      isSensitive,
      linkedApiOperationIds: variable?.linkedApiOperationIds ?? [],
      linkedRequirementIds: variable?.linkedRequirementIds ?? [],
      tags: variable?.tags ?? [],
    });
  };

  const fields: FormField[] = [
    { name: 'name', label: 'Variable Name', type: 'text', required: true, value: name },
    { name: 'description', label: 'Description', type: 'text', value: description },
    { name: 'scope', label: 'Scope', type: 'select', value: scope, options: SCOPE_OPTIONS },
    { name: 'defaultValue', label: 'Default Value', type: 'text', value: defaultValue },
  ];

  if (!open) return null;

  return (
    <EntityDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={variable ? 'Edit Runtime Variable' : 'Add Runtime Variable'}
      submitLabel={variable ? 'Update' : 'Create'}
      isLoading={isSubmitting}
      size="lg"
    >
      <div className="space-y-4">
        <EntityForm
          fields={fields}
          values={{ name, description, scope, defaultValue }}
          onChange={(field, value) => {
            if (field === 'name') {
              setName(value);
              clearError('name');
            } else if (field === 'description') setDescription(value);
            else if (field === 'scope') setScope(value as VariableScope);
            else if (field === 'defaultValue') setDefaultValue(value);
          }}
          errors={errors}
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={isSensitive}
            onChange={(e) => setIsSensitive(e.target.checked)}
            className="rounded border-border"
          />
          Sensitive (mask in UI)
        </label>
      </div>
    </EntityDialog>
  );
};

export default VariableDialog;
