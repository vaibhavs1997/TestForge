// Reusable SearchBar component.
import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SearchBarProps {
  /** Current search value */
  value: string;
  /** Called when the search value changes */
  onChange: (value: string) => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Accessible search input with an icon prefix.
 */
export const SearchBar = ({ value, onChange, placeholder = 'Search...', className }: SearchBarProps) => {
  return (
    <div className={cn('relative', className)}>
      <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary' />
      <input
        type='text'
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className='h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm text-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1'
      />
    </div>
  );
};

export default SearchBar;
