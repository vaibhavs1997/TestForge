// External libraries
import React from 'react';
import { Routes, Route, useParams } from 'react-router-dom';

// Components
import { ServiceListPage } from './pages/ServiceListPage';

/**
 * APIs module routes inside a project workspace (`/projects/:projectId/apis/...`).
 * The workspace `projectId` must drive imports and data — never a hardcoded default.
 */
export const ApiRoutes: React.FC = () => {
  const { projectId: workspaceProjectId } = useParams<{ projectId: string }>();

  return (
    <Routes>
      <Route path='/' element={<ServiceListPage projectId={workspaceProjectId} />} />
      {/* Legacy top-level shape: /apis/:projectId */}
      <Route path=':legacyProjectId' element={<ServiceListPage />} />
    </Routes>
  );
};

export default ApiRoutes;
