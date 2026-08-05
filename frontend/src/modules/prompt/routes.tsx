// External libraries
import React from 'react';
import { Route, Routes, useParams } from 'react-router-dom';

// Components
import { PromptBuilderPage } from './pages';

const PromptBuilderRoute: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) {
    return <div className='p-6 text-text-secondary'>No project selected.</div>;
  }
  return <PromptBuilderPage projectId={projectId} />;
};

export const PromptRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<PromptBuilderRoute />} />
    </Routes>
  );
};

export default PromptRoutes;
