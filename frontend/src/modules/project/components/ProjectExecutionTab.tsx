import React from 'react';
import { ExecutionRoutes } from '../../execution';

interface ProjectExecutionTabProps {
  projectId: string;
}

export const ProjectExecutionTab: React.FC<ProjectExecutionTabProps> = ({ projectId }) => {
  return <ExecutionRoutes />;
};

export default ProjectExecutionTab;
