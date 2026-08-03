import React from 'react';
import { TestDataRoutes } from '../../test-data';

interface ProjectTestDataTabProps {
  projectId: string;
}

export const ProjectTestDataTab: React.FC<ProjectTestDataTabProps> = ({ projectId }) => {
  return <TestDataRoutes />;
};

export default ProjectTestDataTab;
