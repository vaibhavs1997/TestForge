import React from 'react';
import { ApiRoutes } from '../../api';

interface ProjectApiTabProps {
  projectId: string;
}

export const ProjectApiTab: React.FC<ProjectApiTabProps> = ({ projectId }) => {
  return <ApiRoutes />;
};

export default ProjectApiTab;
