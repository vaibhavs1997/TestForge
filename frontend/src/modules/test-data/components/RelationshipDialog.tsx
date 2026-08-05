// RelationshipDialog - Create/Edit Dataset Relationships

import React from 'react';
import { Button } from '../../../components/ui/Button';

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

  if (!open) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-lg font-semibold'>{isEditing ? 'Edit Relationship' : 'Create Relationship'}</h2>
          <Button variant='ghost' size='sm' onClick={onClose}>✕</Button>
        </div>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <label className='text-xs font-medium text-text-secondary'>Parent Dataset</label>
            <select
              value={formData.parentDatasetId}
              onChange={(e) => setFormData({ ...formData, parentDatasetId: e.target.value })}
              className='w-full rounded-lg border border-border px-3 py-2 text-sm'
              required
            >
              <option value=''>Select parent dataset</option>
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>{ds.name}</option>
              ))}
            </select>
          </div>

          <div className='space-y-2'>
            <label className='text-xs font-medium text-text-secondary'>Child Dataset</label>
            <select
              value={formData.childDatasetId}
              onChange={(e) => setFormData({ ...formData, childDatasetId: e.target.value })}
              className='w-full rounded-lg border border-border px-3 py-2 text-sm'
              required
            >
              <option value=''>Select child dataset</option>
              {datasets.filter((ds) => ds.id !== formData.parentDatasetId).map((ds) => (
                <option key={ds.id} value={ds.id}>{ds.name}</option>
              ))}
            </select>
          </div>

          <div className='space-y-2'>
            <label className='text-xs font-medium text-text-secondary'>Relationship Type</label>
            <select
              value={formData.relationshipType}
              onChange={(e) => setFormData({ ...formData, relationshipType: e.target.value as any })}
              className='w-full rounded-lg border border-border px-3 py-2 text-sm'
            >
              <option value='one-to-one'>One to One</option>
              <option value='one-to-many'>One to Many</option>
              <option value='many-to-one'>Many to One</option>
              <option value='many-to-many'>Many to Many (Future)</option>
            </select>
          </div>

          <div className='space-y-2'>
            <label className='text-xs font-medium text-text-secondary'>Cardinality</label>
            <select
              value={formData.cardinality}
              onChange={(e) => setFormData({ ...formData, cardinality: e.target.value as any })}
              className='w-full rounded-lg border border-border px-3 py-2 text-sm'
            >
              <option value='1:1'>1:1</option>
              <option value='1:N'>1:N</option>
              <option value='N:1'>N:1</option>
            </select>
          </div>

          <div className='space-y-2'>
            <label className='text-xs font-medium text-text-secondary'>Parent Column</label>
            <input
              type='text'
              value={formData.parentColumn}
              onChange={(e) => setFormData({ ...formData, parentColumn: e.target.value })}
              placeholder='e.g., id'
              className='w-full rounded-lg border border-border px-3 py-2 text-sm'
              required
            />
          </div>

          <div className='space-y-2'>
            <label className='text-xs font-medium text-text-secondary'>Child Column</label>
            <input
              type='text'
              value={formData.childColumn}
              onChange={(e) => setFormData({ ...formData, childColumn: e.target.value })}
              placeholder='e.g., customerId'
              className='w-full rounded-lg border border-border px-3 py-2 text-sm'
              required
            />
          </div>

          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              id='enabled'
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className='h-4 w-4 rounded border-border'
            />
            <label htmlFor='enabled' className='text-sm'>Enabled</label>
          </div>

          <div className='flex justify-end gap-2'>
            <Button type='button' variant='outline' onClick={onClose}>
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RelationshipDialog;