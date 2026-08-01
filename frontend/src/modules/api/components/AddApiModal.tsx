// Add API modal with service info, API info, authentication, and tags.
import React from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../../components/ui/Card';
import { TextInput } from '../../../components/forms/TextInput';
import { TextArea } from '../../../components/forms/TextArea';
import { Select } from '../../../components/forms/Select';
import { Badge } from '../../../components/ui/Badge';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
export type AuthType = 'None' | 'Bearer Token' | 'Basic Authentication' | 'API Key' | 'OAuth 2.0';

export interface AddApiModalData {
  serviceName: string;
  apiName: string;
  method: HttpMethod;
  endpointPath: string;
  description: string;
  authentication: AuthType;
  tags: string[];
  version: string;
}

export interface ExistingApiRef {
  method: string;
  endpointPath: string;
}

export interface AddApiModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: AddApiModalData) => void;
  existingApis?: ExistingApiRef[];
  existingServiceNames?: string[];
}

const methodOptions = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'OPTIONS', label: 'OPTIONS' },
  { value: 'HEAD', label: 'HEAD' },
];

const authOptions = [
  { value: 'None', label: 'None' },
  { value: 'Bearer Token', label: 'Bearer Token' },
  { value: 'Basic Authentication', label: 'Basic Authentication' },
  { value: 'API Key', label: 'API Key' },
  { value: 'OAuth 2.0', label: 'OAuth 2.0' },
];

export const AddApiModal = ({
  open,
  onClose,
  onCreate,
  existingApis = [],
  existingServiceNames = [],
}: AddApiModalProps) => {
  const [serviceName, setServiceName] = React.useState('');
  const [serviceSearch, setServiceSearch] = React.useState('');
  const [serviceDropdownOpen, setServiceDropdownOpen] = React.useState(false);
  const [apiName, setApiName] = React.useState('');
  const [method, setMethod] = React.useState<HttpMethod>('POST');
  const [endpointPath, setEndpointPath] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [authentication, setAuthentication] = React.useState<AuthType>('None');
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState('');
  const [version, setVersion] = React.useState('v1');
  const [errors, setErrors] = React.useState<{
    serviceName?: string;
    apiName?: string;
    endpointPath?: string;
    duplicate?: string;
  }>({});

  React.useEffect(() => {
    if (open) {
      setServiceName('');
      setServiceSearch('');
      setServiceDropdownOpen(false);
      setApiName('');
      setMethod('POST');
      setEndpointPath('');
      setDescription('');
      setAuthentication('None');
      setTags([]);
      setTagInput('');
      setVersion('v1');
      setErrors({});
    }
  }, [open]);

  // Compute form validity (must be before the early return to respect Rules of Hooks)
  const isFormValid = React.useMemo(() => {
    const trimmedService = serviceName.trim();
    const trimmedApi = apiName.trim();
    const trimmedPath = endpointPath.trim();

    if (!trimmedService || !trimmedApi || !trimmedPath) return false;
    if (!trimmedPath.startsWith('/')) return false;

    const isDuplicate = existingApis.some(
      (api) =>
        api.method === method &&
        api.endpointPath.toLowerCase() === trimmedPath.toLowerCase()
    );
    return !isDuplicate;
  }, [serviceName, apiName, endpointPath, method, existingApis]);

  // Filter existing services based on search (must be before the early return to respect Rules of Hooks)
  const filteredServices = React.useMemo(() => {
    const term = serviceSearch.trim().toLowerCase();
    if (!term) return existingServiceNames;
    return existingServiceNames.filter((name) => name.toLowerCase().includes(term));
  }, [serviceSearch, existingServiceNames]);

  if (!open) return null;

  // Validation
  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    const trimmedService = serviceName.trim();
    const trimmedApi = apiName.trim();
    const trimmedPath = endpointPath.trim();

    if (!trimmedService) {
      newErrors.serviceName = 'Service Name is required';
    }

    if (!trimmedApi) {
      newErrors.apiName = 'API Name is required';
    }

    if (!trimmedPath) {
      newErrors.endpointPath = 'Endpoint Path is required';
    } else if (!trimmedPath.startsWith('/')) {
      newErrors.endpointPath = 'Endpoint Path must begin with "/"';
    }

    // Check for duplicate method + path combination
    if (trimmedPath && trimmedPath.startsWith('/')) {
      const isDuplicate = existingApis.some(
        (api) =>
          api.method === method &&
          api.endpointPath.toLowerCase() === trimmedPath.toLowerCase()
      );
      if (isDuplicate) {
        newErrors.duplicate = `An API with ${method} ${trimmedPath} already exists in this project`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleServiceSelect = (name: string) => {
    setServiceName(name);
    setServiceSearch(name);
    setServiceDropdownOpen(false);
    if (errors.serviceName) setErrors((prev) => ({ ...prev, serviceName: undefined }));
  };

  const handleCreateNewService = () => {
    const trimmed = serviceSearch.trim();
    if (trimmed) {
      setServiceName(trimmed);
      setServiceDropdownOpen(false);
      if (errors.serviceName) setErrors((prev) => ({ ...prev, serviceName: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onCreate({
        serviceName: serviceName.trim(),
        apiName: apiName.trim(),
        method,
        endpointPath: endpointPath.trim(),
        description: description.trim(),
        authentication,
        tags,
        version: version.trim() || 'v1',
      });
    }
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
      onClick={onClose}
    >
      <Card className='mx-4 flex max-h-[90vh] w-full max-w-lg flex-col' onClick={(e) => e.stopPropagation()}>
        <CardHeader className='flex-shrink-0'>
          <div className='flex items-center justify-between'>
            <CardTitle>Create New API</CardTitle>
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
        <form onSubmit={handleSubmit} className='flex min-h-0 flex-1 flex-col'>
          <CardContent className='min-h-0 flex-1 space-y-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            {/* Service Information */}
            <div className='space-y-2'>
              <h3 className='text-sm font-semibold text-text border-b border-border pb-1'>Service Information</h3>
              <div>
                <label className='mb-1.5 block text-sm font-medium text-text'>Service Name</label>
                <div className='relative'>
                  <input
                    type='text'
                    value={serviceSearch}
                    onChange={(e) => {
                      setServiceSearch(e.target.value);
                      setServiceName(e.target.value);
                      setServiceDropdownOpen(true);
                      if (errors.serviceName) setErrors((prev) => ({ ...prev, serviceName: undefined }));
                    }}
                    onFocus={() => setServiceDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setServiceDropdownOpen(false), 150)}
                    placeholder='Search or type a service name...'
                    className='flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1'
                  />
                  {serviceDropdownOpen && (
                    <div className='absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-lg'>
                      {filteredServices.length > 0 && (
                        <>
                          {filteredServices.map((name) => (
                            <button
                              key={name}
                              type='button'
                              onMouseDown={() => handleServiceSelect(name)}
                              className='flex w-full items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface'
                            >
                              {name}
                            </button>
                          ))}
                          <div className='my-1 border-t border-border' />
                        </>
                      )}
                      <button
                        type='button'
                        onMouseDown={handleCreateNewService}
                        className='flex w-full items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-surface'
                      >
                        <Plus className='h-4 w-4' />
                        Create New Service
                      </button>
                    </div>
                  )}
                </div>
                {errors.serviceName && (
                  <p className='mt-1 text-sm text-error' role='alert'>{errors.serviceName}</p>
                )}
              </div>
            </div>

            {/* API Information */}
            <div className='space-y-2'>
              <h3 className='text-sm font-semibold text-text border-b border-border pb-1'>API Information</h3>
              <TextInput
                label='API Name'
                value={apiName}
                onChange={(e) => {
                  setApiName(e.target.value);
                  if (errors.apiName) setErrors((prev) => ({ ...prev, apiName: undefined }));
                }}
                placeholder='User Login'
                error={errors.apiName}
                required
              />
              <Select
                label='HTTP Method'
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                options={methodOptions}
              />
              <TextInput
                label='Endpoint Path'
                value={endpointPath}
                onChange={(e) => {
                  setEndpointPath(e.target.value);
                  if (errors.endpointPath || errors.duplicate) {
                    setErrors((prev) => ({ ...prev, endpointPath: undefined, duplicate: undefined }));
                  }
                }}
                placeholder='/auth/login'
                error={errors.endpointPath || errors.duplicate}
                required
              />
              <TextArea
                label='Description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Briefly describe what this API does...'
                rows={2}
              />
            </div>

            {/* Authentication */}
            <div className='space-y-2'>
              <h3 className='text-sm font-semibold text-text border-b border-border pb-1'>Authentication</h3>
              <Select
                label='Authentication Type'
                value={authentication}
                onChange={(e) => setAuthentication(e.target.value as AuthType)}
                options={authOptions}
              />
            </div>

            {/* Tags */}
            <div className='space-y-2'>
              <h3 className='text-sm font-semibold text-text border-b border-border pb-1'>Tags</h3>
              <div>
                <label className='mb-1.5 block text-sm font-medium text-text'>Tags</label>
                <div className='flex flex-wrap gap-2 rounded-lg border border-border bg-background p-2 min-h-10'>
                  {tags.map((tag) => (
                    <Badge key={tag} variant='secondary' className='flex items-center gap-1'>
                      {tag}
                      <button
                        type='button'
                        onClick={() => handleRemoveTag(tag)}
                        className='ml-1 text-text-secondary hover:text-text'
                      >
                        <X className='h-3 w-3' />
                      </button>
                    </Badge>
                  ))}
                  <input
                    type='text'
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? 'Type and press Enter to add tags...' : ''}
                    className='flex-1 min-w-32 bg-transparent text-sm text-text placeholder:text-text-secondary/50 focus:outline-none'
                  />
                </div>
                {tags.length > 0 && (
                  <p className='mt-1 text-xs text-text-secondary'>Press Enter to add a tag</p>
                )}
              </div>
            </div>

            {/* Version */}
            <div className='space-y-2'>
              <h3 className='text-sm font-semibold text-text border-b border-border pb-1'>Version</h3>
              <TextInput
                label='Version (Optional)'
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder='v1'
              />
            </div>
          </CardContent>
          <CardFooter className='flex-shrink-0 justify-end gap-2'>
            <Button type='button' variant='outline' onClick={onClose}>
              Cancel
            </Button>
            <Button type='submit' disabled={!isFormValid}>
              Create API
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default AddApiModal;