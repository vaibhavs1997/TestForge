import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ApiMappingBannerProps {
  message: string;
  lowConfidence?: boolean;
}

export const ApiMappingBanner: React.FC<ApiMappingBannerProps> = ({ message, lowConfidence }) => {
  if (!lowConfidence && !message) return null;

  return (
    <div
      className='mb-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100'
      role='status'
    >
      <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden />
      <p>{message}</p>
    </div>
  );
};

export default ApiMappingBanner;
