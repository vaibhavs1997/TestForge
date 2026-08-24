import React from 'react';
import { FolderKanban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../ui/EmptyState';

/** A recoverable state for project-scoped routes reached without a project id. */
export const ProjectContextMissing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className='flex min-h-[45vh] items-center justify-center p-6'>
      <EmptyState
        icon={<FolderKanban className='h-12 w-12' />}
        title='Project context is missing'
        description='Select a project to continue. No project data has been loaded.'
        action={{ label: 'Go to Projects', onClick: () => navigate('/projects') }}
      />
    </div>
  );
};

