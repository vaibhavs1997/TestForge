import React from 'react';
import { Spinner } from '../ui/Spinner';

export interface LoadingOverlayProps {
  loading: boolean;
  message?: string;
}

export const LoadingOverlay = ({ loading, message = 'Loading...' }: LoadingOverlayProps) => {
  if (!loading) return null;
  return (
    <div className='app-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/30'>
      <div className='app-modal-panel flex flex-col items-center gap-2 rounded-lg p-6 shadow-lg'>
        <Spinner size='lg' />
        <p className='text-sm text-text-secondary'>{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
