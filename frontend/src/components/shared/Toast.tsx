// Simple toast notification component.
import React from 'react';
import { CheckCircle, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ToastProps {
  message: string;
  open: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast = ({ message, open, onClose, duration = 3000 }: ToastProps) => {
  React.useEffect(() => {
    if (open && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div className='fixed bottom-4 right-4 z-[60] animate-in fade-in slide-in-from-bottom-2'>
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-lg'
        )}
      >
        <CheckCircle className='h-5 w-5 text-green-600' />
        <p className='text-sm font-medium text-text'>{message}</p>
        <button
          onClick={onClose}
          className='ml-2 text-text-secondary hover:text-text'
          aria-label='Close toast'
        >
          <X className='h-4 w-4' />
        </button>
      </div>
    </div>
  );
};

export default Toast;