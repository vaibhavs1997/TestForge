import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';

export interface EntityDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  description?: string;
  submitLabel?: string;
  isLoading?: boolean;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  scrollable?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function EntityDialog({
  open,
  onClose,
  onSubmit,
  title,
  description,
  submitLabel = 'Save',
  isLoading = false,
  children,
  size = 'lg',
  scrollable = false,
}: EntityDialogProps) {
  const titleId = React.useId().replace(/:/g, '');
  const descId = description ? `${titleId}-desc` : undefined;

  if (!open) return null;

  return (
    <div
      className="app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
      role="presentation"
    >
      <Card
        className={`mx-4 w-full ${sizeClasses[size]} ${scrollable ? 'max-h-[90vh] overflow-y-auto scrollbar-none' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle id={titleId}>{title}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onClose}
              aria-label="Close"
              type="button"
              disabled={isLoading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {description ? (
            <p id={descId} className="mt-2 text-sm text-text-secondary">
              {description}
            </p>
          ) : null}
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent>{children}</CardContent>
          <CardFooter className="justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : submitLabel}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
