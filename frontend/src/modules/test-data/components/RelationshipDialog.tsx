// RelationshipDialog - Create/Edit Dataset Relationships

import React from 'react';
import { EntityDialog } from '../../../components/dialogs/EntityDialog';
import { TextInput } from '../../../components/forms/TextInput';
import { Select } from '../../../components/forms/Select';

export interface RelationshipDialogData {
  parentDatasetId: string;
  childDatasetId: string;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  parentColumn: string;
  childColumn: string;
  cardinality: '1:1' | '1:N' | 'N:1';
  enabled?: boolean;
}

interface RelationshipDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RelationshipDialogData) => void;
  datasets: Array<{ id: string; name: string }>;
  relationship?: RelationshipDialogData & { id: string };
  isSubmitting?: boolean;
}

export const RelationshipDialog: React.FC<RelationshipDialogProps> = ({
  open,
  onClose,
  onSubmit,
  datasets,
  relationship,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = React.useState<RelationshipDialogData>({
    parentDatasetId: relationship?.parentDatasetId || '',
    childDatasetId: relationship?.childDatasetId || '',
    relationshipType: relationship?.relationshipType || 'one-to-many',
    parentColumn: relationship?.parentColumn || '',
    childColumn: relationship?.childColumn || '',
    cardinality: relationship?.cardinality || '1:N',
    enabled: relationship?.enabled ?? true,
  });

  React.useEffect(() => {
    if (relationship) {
      setFormData({
        parentDatasetId: relationship.parentDatasetId,
        childDatasetId: relationship.childDatasetId,
        relationshipType: relationship.relationshipType,
        parentColumn: relationship.parentColumn,
        childColumn: relationship.childColumn,
        cardinality: relationship.cardinality,
        enabled: relationship.enabled,
      });
    } else {
      setFormData({
        parentDatasetId: '',
        childDatasetId: '',
        relationshipType: 'one-to-many',
        parentColumn: '',
        childColumn: '',
        cardinality: '1:N',
        enabled: true,
      });
    }
  }, [relationship]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isEditing = !!relationship;

  const datasetOptions = datasets.map((ds) => ({ value: ds.id, label: ds.name }));
  const childDatasetOptions = datasets
    .filter((ds) => ds.id !== formData.parentDatasetId)
    .map((ds) => ({ value: ds.id, label: ds.name }));

  const relationshipTypeOptions = [
    { value: 'one-to-one', label: 'One to One' },
    { value: 'one-to-many', label: 'One to Many' },
    { value: 'many-to-one', label: 'Many to One' },
    { value: 'many-to-many', label: 'Many to Many (Future)' },
  ];

  const cardinalityOptions = [
    { value: '1:1', label: '1:1' },
    { value: '1:N', label: '1:N' },
    { value: 'N:1', label: 'N:1' },
  ];

  return (
    <EntityDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={isEditing ? 'Edit Relationship' : 'Create Relationship'}
      submitLabel={isEditing ? 'Update' : 'Create'}
      isLoading={isSubmitting}
      size="md"
    >
      <div className="space-y-4">
        <Select
          label="Parent Dataset"
          value={formData.parentDatasetId}
          onChange={(e) => setFormData({ ...formData, parentDatasetId: e.target.value })}
          options={datasetOptions}
          required
        />

        <Select
          label="Child Dataset"
          value={formData.childDatasetId}
          onChange={(e) => setFormData({ ...formData, childDatasetId: e.target.value })}
          options={childDatasetOptions}
          required
        />

        <Select
          label="Relationship Type"
          value={formData.relationshipType}
          onChange={(e) => setFormData({ ...formData, relationshipType: e.target.value as any })}
          options={relationshipTypeOptions}
        />

        <Select
          label="Cardinality"
          value={formData.cardinality}
          onChange={(e) => setFormData({ ...formData, cardinality: e.target.value as any })}
          options={cardinalityOptions}
        />

        <TextInput
          label="Parent Column"
          value={formData.parentColumn}
          onChange={(e) => setFormData({ ...formData, parentColumn: e.target.value })}
          placeholder="e.g., id"
          required
        />

        <TextInput
          label="Child Column"
          value={formData.childColumn}
          onChange={(e) => setFormData({ ...formData, childColumn: e.target.value })}
          placeholder="e.g., customerId"
          required
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          <label htmlFor="enabled" className="text-sm">
            Enabled
          </label>
        </div>
      </div>
    </EntityDialog>
  );
};

export default RelationshipDialog;