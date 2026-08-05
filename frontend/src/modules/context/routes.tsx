// External libraries
import React from 'react';
import { Route, Routes, useParams } from 'react-router-dom';

// Components
import { ProjectContextPage } from './pages';

const ProjectContextRoute: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) {
    return <div className='p-6 text-text-secondary'>No project selected.</div>;
  }
  return <ProjectContextPage projectId={projectId} />;
};

export const ContextRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<ProjectContextRoute />} />
    </Routes>
  );
};

export default ContextRoutes;