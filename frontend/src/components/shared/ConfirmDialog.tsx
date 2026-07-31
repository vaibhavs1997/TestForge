import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { cn } from '../../utils/cn';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'default', onConfirm, onCancel }: ConfirmDialogProps) => {
  if (!open) return null;
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <Card className='mx-4 w-full max-w-md'>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <AlertTriangle className={cn('h-5 w-5', variant === 'destructive' ? 'text-error' : 'text-primary')} />
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-text-secondary'>{message}</p>
        </CardContent>
        <CardFooter className='justify-end gap-2'>
          <Button variant='outline' onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={variant === 'destructive' ? 'destructive' : 'default'} onClick={onConfirm}>{confirmLabel}</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ConfirmDialog;
