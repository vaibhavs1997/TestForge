import React from 'react';

export interface AdminPageIntroProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

/** Consistent header for Administration / global utility pages. */
export const AdminPageIntro: React.FC<AdminPageIntroProps> = ({ title, description, children }) => (
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h1 className="text-2xl font-bold text-text">{title}</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-secondary">{description}</p>
    </div>
    {children ? <div className="flex shrink-0 flex-wrap gap-2">{children}</div> : null}
  </div>
);

export default AdminPageIntro;
