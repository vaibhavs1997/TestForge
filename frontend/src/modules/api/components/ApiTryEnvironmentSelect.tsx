import React from 'react';
import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { Select } from '../../../components/forms/Select';
import type { EnvironmentDto } from '../../environment/services/environmentService';

/** Shown as the selected option when no environment is chosen. */
export const API_TRY_ENV_EMPTY_LABEL =
  'Select environment for Try It / execution';

const HELP_SELECTED = 'Try It and future runs will use this environment’s base URL.';

export interface ApiTryEnvironmentSelectProps {
  projectId: string;
  environments: EnvironmentDto[];
  value: string;
  onChange: (environmentId: string) => void;
  isLoading?: boolean;
  /** Compact layout for the operation toolbar */
  compact?: boolean;
  className?: string;
}

export const ApiTryEnvironmentSelect: React.FC<ApiTryEnvironmentSelectProps> = ({
  projectId,
  environments,
  value,
  onChange,
  isLoading,
  compact,
  className,
}) => {
  const envPath = `/projects/${projectId}/environment`;

  const handleChange = (next: string) => {
    if (next === '' || next === 'none') {
      onChange('');
      return;
    }
    onChange(next);
  };

  if (!isLoading && environments.length === 0) {
    return (
      <div className={className}>
        <p className='text-xs text-text-secondary'>
          <Globe className='mr-1 inline h-3.5 w-3.5' />
          No environments.{' '}
          <Link to={envPath} className='text-primary underline-offset-2 hover:underline'>
            Create or import
          </Link>
        </p>
      </div>
    );
  }

  const selectValue = value || '';

  return (
    <div className={className}>
      <Select
        label={compact ? undefined : 'Execution environment'}
        value={selectValue}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isLoading || environments.length === 0}
        options={[
          {
            value: '',
            label: compact ? 'Select environment…' : API_TRY_ENV_EMPTY_LABEL,
          },
          ...environments.map((env) => ({
            value: env.id,
            label: env.name,
          })),
          {
            value: 'none',
            label: 'None',
          },
        ]}
        helperText={!compact && value ? HELP_SELECTED : undefined}
        className={compact ? 'h-9 min-w-[11rem] max-w-[16rem] text-sm' : undefined}
        aria-label='Execution environment'
      />
    </div>
  );
};

export default ApiTryEnvironmentSelect;
