import React from 'react';
import { ReportRoutes } from '../../report';

interface ProjectReportsTabProps {
  projectId: string;
}

export const ProjectReportsTab: React.FC<ProjectReportsTabProps> = ({ projectId }) => {
  return <ReportRoutes />;
};

export default ProjectReportsTab;
