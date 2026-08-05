// External libraries
import React from 'react';
import { Route, Routes, useParams } from 'react-router-dom';

// Components
import { AIProviderManagementPage } from './pages';

const ProjectAIProviderRoute: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) {
    return <div className='p-6 text-text-secondary'>No project selected.</div>;
  }
  return <AIProviderManagementPage projectId={projectId} />;
};

export const AIProviderRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<ProjectAIProviderRoute />} />
    </Routes>
  );
};

export default AIProviderRoutes;