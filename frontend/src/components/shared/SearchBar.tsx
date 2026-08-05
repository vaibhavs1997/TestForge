// Reusable SearchBar component.
import React, { useCallback, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SearchBarProps {
  /** Current search value */
  value: string;
  /** Called when the search value changes (debounced) */
  onChange: (value: string) => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Additional CSS class names */
  className?: string;
  /** Debounce delay in ms (default 300) */
  debounceMs?: number;
}

/**
 * Accessible search input with an icon prefix and optional debounce.
 */
export const SearchBar = ({ value, onChange, placeholder = 'Search...', className, debounceMs = 300 }: SearchBarProps) => {
  const [localValue, setLocalValue] = React.useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Keep local state in sync when parent value changes externally
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChangeRef.current(next);
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className={cn('relative', className)}>
      <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary' />
      <input
        type='text'
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className='h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1'
      />
    </div>
  );
};

export default SearchBar;
