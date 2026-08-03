// External libraries
import React from 'react';
import { Route, Routes, useParams } from 'react-router-dom';

// Shared constants

// Shared types

// Hooks

// Services

// Components
import { ProjectsHomePage } from './pages';
import { projectStore } from '../../store/projectStore';
import { ProjectWorkspace } from './components/ProjectWorkspace';

// Styles

export const ProjectRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<ProjectsHomePage />} />
      <Route path=':projectId/*' element={<ProjectWorkspaceWrapper />} />
    </Routes>
  );
};

const ProjectWorkspaceWrapper: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const setSelectedProjectId = projectStore((state) => state.setSelectedProjectId);

  React.useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId, setSelectedProjectId]);

  if (!projectId) return <ProjectsHomePage />;

  return <ProjectWorkspace projectId={projectId} />;
};

export default ProjectRoutes;
