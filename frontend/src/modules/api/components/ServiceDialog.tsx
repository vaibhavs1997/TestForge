// Service create/edit dialog scoped to the API module.
import React from 'react';
import { EntityDialog } from '../../../components/dialogs/EntityDialog';
import { TextInput } from '../../../components/forms/TextInput';
import { TextArea } from '../../../components/forms/TextArea';
import { Select } from '../../../components/forms/Select';
import type { Service, ServiceFormData } from '../types';

export interface ServiceDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  service?: Service;
  onSubmit: (data: ServiceFormData) => void;
  onCancel: () => void;
}

const protocolOptions = [
  { value: 'REST', label: 'REST' },
  { value: 'GraphQL', label: 'GraphQL' },
  { value: 'SOAP', label: 'SOAP' },
  { value: 'gRPC', label: 'gRPC' },
  { value: 'Other', label: 'Other' },
];

const statusOptions = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

export const ServiceDialog = ({ open, mode, service, onSubmit, onCancel }: ServiceDialogProps) => {
  const [name, setName] = React.useState(service?.name ?? '');
  const [description, setDescription] = React.useState(service?.description ?? '');
  const [protocol, setProtocol] = React.useState<ServiceFormData['protocol']>(service?.protocol ?? 'REST');
  const [baseUrl, setBaseUrl] = React.useState(service?.baseUrl ?? '');
  const [version, setVersion] = React.useState(service?.version ?? '');
  const [status, setStatus] = React.useState<ServiceFormData['status']>(service?.status ?? 'Active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ projectId: service?.projectId ?? '', name, description, protocol, baseUrl, version, status });
  };

  const title = mode === 'create' ? 'Create Service' : 'Edit Service';
  const submitLabel = mode === 'create' ? 'Create' : 'Save';

  return (
    <EntityDialog
      open={open}
      onClose={onCancel}
      onSubmit={handleSubmit}
      title={title}
      submitLabel={submitLabel}
      size="md"
    >
      <div className="space-y-4">
        <TextInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Service name"
          required
        />
        <TextArea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Service description"
          rows={3}
        />
        <Select
          label="Protocol"
          value={protocol}
          onChange={(e) => setProtocol(e.target.value as ServiceFormData['protocol'])}
          options={protocolOptions}
        />
        <TextInput
          label="Base URL"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.example.com"
        />
        <TextInput
          label="Version"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="v1"
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ServiceFormData['status'])}
          options={statusOptions}
        />
      </div>
    </EntityDialog>
  );
};

export default ServiceDialog;