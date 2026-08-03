import React from 'react';
import { EnvironmentRoutes } from '../../environment';

interface ProjectEnvironmentTabProps {
  projectId: string;
}

export const ProjectEnvironmentTab: React.FC<ProjectEnvironmentTabProps> = ({ projectId }) => {
  return <EnvironmentRoutes />;
};

export default ProjectEnvironmentTab;
