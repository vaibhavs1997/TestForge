import React from 'react';
import { TextInput } from '../forms/TextInput';
import { TextArea } from '../forms/TextArea';
import { Select } from '../forms/Select';

export interface FormField {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  error?: string;
  value?: string | number | boolean;
  onChange?: (value: any) => void;
  disabled?: boolean;
}

export interface EntityFormProps {
  fields: FormField[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  errors: Record<string, string | undefined>;
  onFieldError?: (name: string, error: string) => void;
}

export function EntityForm({
  fields,
  values,
  onChange,
  errors,
  onFieldError,
}: EntityFormProps) {
  const handleChange = (name: string, value: any) => {
    onChange(name, value);
    if (onFieldError && errors[name]) {
      onFieldError(name, '');
    }
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const value = values[field.name] ?? '';
        const error = errors[field.name];

        if (field.type === 'checkbox') {
          return (
            <div key={field.name} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => handleChange(field.name, e.target.checked)}
                className="h-4 w-4 rounded border-border"
                id={field.name}
                disabled={field.disabled}
              />
              <label htmlFor={field.name} className="text-sm text-text">
                {field.label}
                {field.required && <span className="ml-1 text-error">*</span>}
              </label>
            </div>
          );
        }

        if (field.type === 'textarea') {
          return (
            <div key={field.name}>
              <TextArea
                label={field.label}
                value={String(value)}
                onChange={(e) => handleChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                error={error}
                required={field.required}
                disabled={field.disabled}
              />
            </div>
          );
        }

        if (field.type === 'select') {
          return (
            <div key={field.name}>
              <Select
                label={field.label}
                value={String(value)}
                onChange={(e) => handleChange(field.name, e.target.value)}
                options={field.options || []}
                required={field.required}
                disabled={field.disabled}
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>
          );
        }

        return (
          <div key={field.name}>
            <TextInput
              label={field.label}
              type={field.type || 'text'}
              value={String(value)}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              error={error}
              required={field.required}
              disabled={field.disabled}
            />
          </div>
        );
      })}
    </div>
  );
}
