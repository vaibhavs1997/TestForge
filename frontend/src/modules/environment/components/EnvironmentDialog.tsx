// Environment Editor Dialog for creating and editing environments
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { EntityDialog } from '../../../components/dialogs/EntityDialog';
import { TextInput } from '../../../components/forms/TextInput';
import { Select } from '../../../components/forms/Select';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { validateUrl, isPositiveNumber, FormErrors } from '../../../utils/validation';

export interface EnvironmentDialogData {
  id?: string;
  projectId: string;
  name: string;
  baseUrl: string;
  description: string;
  authentication?: {
    type: 'None' | '******' | 'Basic Authentication' | 'API Key' | 'OAuth 2.0';
    token?: string;
    headerName?: string;
    keyValue?: string;
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
    scope?: string;
  };
  variables: Record<string, string>;
  timeout: number;
}

export interface EnvironmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: EnvironmentDialogData) => void;
  environment?: EnvironmentDialogData;
  isSubmitting?: boolean;
}

const authTypeOptions = [
  { value: 'None', label: 'None' },
  { value: '******', label: '******' },
  { value: 'Basic Authentication', label: 'Basic Authentication' },
  { value: 'API Key', label: 'API Key' },
  { value: 'OAuth 2.0', label: 'OAuth 2.0' },
];

export const EnvironmentDialog = ({ open, onClose, onSubmit, environment, isSubmitting }: EnvironmentDialogProps) => {
  const [name, setName] = React.useState('');
  const [baseUrl, setBaseUrl] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [authType, setAuthType] = React.useState<string>('None');
  const [authToken, setAuthToken] = React.useState('');
  const [headerName, setHeaderName] = React.useState('X-API-Key');
  const [keyValue, setKeyValue] = React.useState('');
  const [clientId, setClientId] = React.useState('');
  const [clientSecret, setClientSecret] = React.useState('');
  const [tokenUrl, setTokenUrl] = React.useState('');
  const [scope, setScope] = React.useState('');
  const [timeout, setTimeout] = React.useState(30000);
  const [variables, setVariables] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      if (environment) {
        setName(environment.name);
        setBaseUrl(environment.baseUrl);
        setDescription(environment.description);
        setAuthType(environment.authentication?.type || 'None');
        setAuthToken(environment.authentication?.token || '');
        setHeaderName(environment.authentication?.headerName || 'X-API-Key');
        setKeyValue(environment.authentication?.keyValue || '');
        setClientId(environment.authentication?.clientId || '');
        setClientSecret(environment.authentication?.clientSecret || '');
        setTokenUrl(environment.authentication?.tokenUrl || '');
        setScope(environment.authentication?.scope || '');
        setTimeout(environment.timeout);
        setVariables(environment.variables || {});
      } else {
        setName('');
        setBaseUrl('');
        setDescription('');
        setAuthType('None');
        setAuthToken('');
        setHeaderName('X-API-Key');
        setKeyValue('');
        setClientId('');
        setClientSecret('');
        setTokenUrl('');
        setScope('');
        setTimeout(30000);
        setVariables({});
      }
    }
  }, [open, environment]);

  const handleAddVariable = () => {
    setVariables(prev => ({ ...prev, '': '' }));
  };

  const handleRemoveVariable = (key: string) => {
    setVariables(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleVariableChange = (oldKey: string, newKey: string, value: string) => {
    setVariables(prev => {
      const next = { ...prev };
      if (oldKey !== newKey) {
        delete next[oldKey];
      }
      next[newKey] = value;
      return next;
    });
  };

  const validate = React.useCallback((): FormErrors => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    const urlResult = validateUrl(baseUrl, 'Base URL');
    if (!urlResult.valid) {
      newErrors.baseUrl = urlResult.message;
    }

    if (!isPositiveNumber(timeout)) {
      newErrors.timeout = 'Timeout must be greater than 0';
    }

    // Check for duplicate variable keys
    const varKeys = Object.keys(variables).filter(k => k.trim() !== '');
    const uniqueKeys = new Set(varKeys);
    if (uniqueKeys.size !== varKeys.length) {
      newErrors.variables = 'Variable keys must be unique';
    }

    return newErrors;
  }, [name, baseUrl, timeout, variables]);

  const { errors, validateForm, clearError } = useFormValidation({ validate });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const auth: EnvironmentDialogData['authentication'] = {
      type: authType as any,
    };

    if (authType === '******') {
      auth.token = authToken;
    } else if (authType === 'API Key') {
      auth.headerName = headerName;
      auth.keyValue = keyValue;
    } else if (authType === 'OAuth 2.0') {
      auth.clientId = clientId;
      auth.clientSecret = clientSecret;
      auth.tokenUrl = tokenUrl;
      auth.scope = scope;
    }

    // Clean up empty variable keys
    const cleanedVariables = Object.entries(variables).reduce((acc, [key, value]) => {
      if (key.trim() !== '') {
        acc[key.trim()] = value;
      }
      return acc;
    }, {} as Record<string, string>);

    onSubmit({
      id: environment?.id,
      projectId: environment?.projectId || '',
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      description: description.trim(),
      authentication: authType === 'None' ? undefined : auth,
      variables: cleanedVariables,
      timeout,
    });
  };

  if (!open) return null;

  return (
    <EntityDialog
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={environment ? 'Edit Environment' : 'Create Environment'}
      submitLabel={environment ? 'Update' : 'Create'}
      isLoading={isSubmitting}
      size="xl"
      scrollable
    >
      <div className="space-y-6">
        {/* General Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-text">General</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label="Environment Name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearError('name');
              }}
              placeholder="e.g., Development, QA, Production"
              error={errors.name}
              required
            />
            <TextInput
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
        </div>

        {/* Connection Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-text">Connection</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label="Base URL"
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                clearError('baseUrl');
              }}
              placeholder="https://api.example.com"
              error={errors.baseUrl}
              required
            />
            <div>
              <TextInput
                label="Timeout (ms)"
                type="number"
                value={String(timeout)}
                onChange={(e) => {
                  setTimeout(Number(e.target.value));
                  clearError('timeout');
                }}
                error={errors.timeout}
              />
              <p className="mt-1 text-xs text-text-secondary">
                Timeout must be greater than 0
              </p>
            </div>
          </div>
        </div>

        {/* Authentication Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-text">Authentication</h3>
          <Select
            label="Authentication Type"
            value={authType}
            onChange={(e) => setAuthType(e.target.value)}
            options={authTypeOptions}
          />

          {authType === '******' && (
            <TextInput
              label="Token"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="****** value"
              type="password"
            />
          )}

          {authType === 'Basic Authentication' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                label="Username"
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Username"
              />
              <TextInput
                label="Password"
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder="Password"
                type="password"
              />
            </div>
          )}

          {authType === 'API Key' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput
                label="Header Name"
                value={headerName}
                onChange={(e) => setHeaderName(e.target.value)}
                placeholder="X-API-Key"
              />
              <TextInput
                label="Key Value"
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                placeholder="API key value"
                type="password"
              />
            </div>
          )}

          {authType === 'OAuth 2.0' && (
            <div className="space-y-4">
              <TextInput
                label="Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="OAuth client ID"
              />
              <TextInput
                label="Client Secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="OAuth client secret"
                type="password"
              />
              <TextInput
                label="Token URL"
                value={tokenUrl}
                onChange={(e) => setTokenUrl(e.target.value)}
                placeholder="https://auth.example.com/token"
              />
              <TextInput
                label="Scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="Optional scope"
              />
            </div>
          )}
        </div>

        {/* Variables Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text">Variables</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddVariable}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Variable
            </Button>
          </div>
          {errors.variables && (
            <p className="text-sm text-error">{errors.variables}</p>
          )}
          <div className="space-y-2">
            {Object.entries(variables).map(([key, value], idx) => (
              <div key={idx} className="flex gap-2">
                <TextInput
                  label=""
                  value={key}
                  onChange={(e) => handleVariableChange(key, e.target.value, value)}
                  placeholder="Variable name"
                  className="flex-1"
                />
                <TextInput
                  label=""
                  value={value}
                  onChange={(e) => handleVariableChange(key, key, e.target.value)}
                  placeholder="Value"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveVariable(key)}
                  className="mt-6"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </EntityDialog>
  );
};

export default EnvironmentDialog;
