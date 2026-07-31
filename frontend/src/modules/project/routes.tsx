// External libraries
import React from 'react';
import { Route, Routes, useParams } from 'react-router-dom';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { ProjectsHomePage, ProjectDashboardPage } from './pages';
import { projectStore } from '../../store/projectStore';

// Styles

export const ProjectRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<ProjectsHomePage />} />
      <Route path=':projectId/dashboard' element={<ProjectDashboardPageWrapper />} />
    </Routes>
  );
};

const ProjectDashboardPageWrapper: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const setSelectedProjectId = projectStore((state) => state.setSelectedProjectId);

  React.useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId, setSelectedProjectId]);

  return <ProjectDashboardPage projectId={projectId} />;
};

export default ProjectRoutes;
