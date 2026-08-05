// Mapping Editor Dialog for creating and editing data source mappings
import React from 'react';
import { EntityDialog } from '../../../components/dialogs/EntityDialog';
import { TextInput } from '../../../components/forms/TextInput';
import { Select } from '../../../components/forms/Select';

export interface MappingDialogData {
  id?: string;
  projectId: string;
  serviceId: string;
  operationId: string;
  fieldPath: string;
  sourceType: string;
  datasetId?: string;
  datasetColumn?: string;
  environmentVariable?: string;
  runtimeOperationId?: string;
  runtimeField?: string;
  notes: string;
}

export interface MappingDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: MappingDialogData) => void;
  mapping?: MappingDialogData;
  isSubmitting?: boolean;
}

const sourceTypeOptions = [
  { value: 'Existing Dataset', label: 'Existing Dataset' },
  { value: 'Generated', label: 'Generated' },
  { value: 'Runtime Response', label: 'Runtime Response' },
  { value: 'Manual', label: 'Manual' },
  { value: 'Environment Variable', label: 'Environment Variable' },
];

export const MappingDialog = ({ open, onClose, onSubmit, mapping, isSubmitting }: MappingDialogProps) => {
  const [fieldPath, setFieldPath] = React.useState('');
  const [sourceType, setSourceType] = React.useState('Existing Dataset');
  const [datasetId, setDatasetId] = React.useState('');
  const [datasetColumn, setDatasetColumn] = React.useState('');
  const [environmentVariable, setEnvironmentVariable] = React.useState('');
  const [runtimeOperationId, setRuntimeOperationId] = React.useState('');
  const [runtimeField, setRuntimeField] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      if (mapping) {
        setFieldPath(mapping.fieldPath);
        setSourceType(mapping.sourceType);
        setDatasetId(mapping.datasetId || '');
        setDatasetColumn(mapping.datasetColumn || '');
        setEnvironmentVariable(mapping.environmentVariable || '');
        setRuntimeOperationId(mapping.runtimeOperationId || '');
        setRuntimeField(mapping.runtimeField || '');
        setNotes(mapping.notes || '');
      } else {
        setFieldPath('');
        setSourceType('Existing Dataset');
        setDatasetId('');
        setDatasetColumn('');
        setEnvironmentVariable('');
        setRuntimeOperationId('');
        setRuntimeField('');
        setNotes('');
      }
      setErrors({});
    }
  }, [open, mapping]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fieldPath.trim()) {
      newErrors.fieldPath = 'Field path is required';
    }

    if (!sourceType.trim()) {
      newErrors.sourceType = 'Source type is required';
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
      id: mapping?.id,
      projectId: mapping?.projectId || '',
      serviceId: mapping?.serviceId || '',
      operationId: mapping?.operationId || '',
      fieldPath: fieldPath.trim(),
      sourceType,
      datasetId: datasetId || undefined,
      datasetColumn: datasetColumn.trim() || undefined,
      environmentVariable: environmentVariable.trim() || undefined,
      runtimeOperationId: runtimeOperationId || undefined,
      runtimeField: runtimeField.trim() || undefined,
      notes: notes.trim(),
    });
  };

  if (!open) return null;

  return (
    <EntityDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={mapping ? 'Edit Mapping' : 'Create Mapping'}
      submitLabel={mapping ? 'Update' : 'Create'}
      isLoading={isSubmitting}
      size="lg"
    >
      <div className="space-y-4">
        <TextInput
          label="Field Path"
          value={fieldPath}
          onChange={(e) => {
            setFieldPath(e.target.value);
            setErrors((prev) => ({ ...prev, fieldPath: '' }));
          }}
          placeholder="e.g., body.customerId, query.id"
          error={errors.fieldPath}
          required
        />
        <Select
          label="Source Type"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value)}
          options={sourceTypeOptions}
        />
        {errors.sourceType && <p className="text-sm text-error">{errors.sourceType}</p>}

        {sourceType === 'Existing Dataset' && (
          <div className="space-y-4">
            <TextInput
              label="Dataset ID"
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              placeholder="Select or enter dataset ID"
            />
            <TextInput
              label="Column"
              value={datasetColumn}
              onChange={(e) => setDatasetColumn(e.target.value)}
              placeholder="Column name in dataset"
            />
          </div>
        )}

        {sourceType === 'Generated' && (
          <div className="space-y-4">
            <TextInput
              label="Generator"
              value=""
              disabled
              placeholder="Generator selection coming soon"
            />
            <p className="text-xs text-text-secondary">
              Generator configuration will be available in a future update.
            </p>
          </div>
        )}

        {sourceType === 'Runtime Response' && (
          <div className="space-y-4">
            <TextInput
              label="Operation ID"
              value={runtimeOperationId}
              onChange={(e) => setRuntimeOperationId(e.target.value)}
              placeholder="Operation that returns the value"
            />
            <TextInput
              label="Response Field"
              value={runtimeField}
              onChange={(e) => setRuntimeField(e.target.value)}
              placeholder="Field path in response"
            />
          </div>
        )}

        {sourceType === 'Environment Variable' && (
          <div className="space-y-4">
            <TextInput
              label="Environment Variable"
              value={environmentVariable}
              onChange={(e) => setEnvironmentVariable(e.target.value)}
              placeholder="e.g., API_KEY, BASE_URL"
            />
          </div>
        )}

        {sourceType === 'Manual' && (
          <div className="space-y-4">
            <TextInput
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this manual value"
            />
          </div>
        )}

        <TextInput
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
        />
      </div>
    </EntityDialog>
  );
};

export default MappingDialog;
