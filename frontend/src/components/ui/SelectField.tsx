import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectFieldOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  value: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hideSelectedOption?: boolean;
  className?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  hideSelectedOption = false,
  className,
}) => {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  React.useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type='button'
        disabled={disabled}
        aria-haspopup='listbox'
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className='flex min-h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-text shadow-sm outline-none transition hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60'
      >
        <span className={selected ? 'text-text' : 'text-text-secondary'}>{selected?.label || placeholder}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-text-secondary transition-transform', open && 'rotate-180')} />
      </button>
      {open && !disabled && (
        <div className='theme-select-menu absolute left-0 top-full z-40 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface p-1 shadow-xl' role='listbox'>
          {options.filter((option) => !hideSelectedOption || option.value !== value).map((option) => (
            <button
              key={option.value}
              type='button'
              role='option'
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                'theme-select-option block w-full rounded-md px-3 py-2 text-left text-sm text-text transition-colors hover:bg-background',
                option.value === value && 'bg-primary/15 text-primary',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SelectField;
