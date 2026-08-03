import React from 'react';
import { RequirementsRoutes } from '../../requirements';

interface ProjectRequirementsTabProps {
  projectId: string;
}

export const ProjectRequirementsTab: React.FC<ProjectRequirementsTabProps> = ({ projectId }) => {
  return <RequirementsRoutes />;
};

export default ProjectRequirementsTab;
