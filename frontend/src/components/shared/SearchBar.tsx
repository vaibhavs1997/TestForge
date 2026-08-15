// Reusable SearchBar component.
import React, { useCallback, useEffect, useId, useRef } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../utils/cn';
import { HelperText } from '../forms/HelperText';
import { describedByIds } from '../../utils/a11y';
import { fieldControlBaseClass } from '../forms/fieldStyles';

export interface SearchBarProps {
  /** Current search value */
  value: string;
  /** Called when the search value changes (debounced) */
  onChange: (value: string) => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Accessible name when the placeholder alone is not sufficient */
  ariaLabel?: string;
  /** Hint shown below the field */
  helperText?: string;
  /** Additional CSS class names */
  className?: string;
  /** Debounce delay in ms (default 300) */
  debounceMs?: number;
}

/**
 * Accessible search input with an icon prefix and optional debounce.
 */
export const SearchBar = ({
  value,
  onChange,
  placeholder = 'Search...',
  ariaLabel,
  helperText,
  className,
  debounceMs = 300,
}: SearchBarProps) => {
  const [localValue, setLocalValue] = React.useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const inputId = useId().replace(/:/g, '');
  const helperId = `${inputId}-helper`;

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setLocalValue(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChangeRef.current(next);
      }, debounceMs);
    },
    [debounceMs],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const label = ariaLabel ?? placeholder;

  return (
    <div className={cn('relative', className)}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" aria-hidden />
      <input
        id={inputId}
        type="search"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={label}
        aria-describedby={describedByIds(helperText && helperId)}
        autoComplete="off"
        className={cn(fieldControlBaseClass, 'pl-10')}
      />
      {helperText ? (
        <HelperText id={helperId} className="mt-1 text-xs">
          {helperText}
        </HelperText>
      ) : null}
    </div>
  );
};

export default SearchBar;
