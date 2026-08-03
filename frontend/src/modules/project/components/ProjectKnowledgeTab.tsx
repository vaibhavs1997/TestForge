import React from 'react';
import { KnowledgeRoutes } from '../../knowledge';

interface ProjectKnowledgeTabProps {
  projectId: string;
}

export const ProjectKnowledgeTab: React.FC<ProjectKnowledgeTabProps> = ({ projectId }) => {
  return <KnowledgeRoutes />;
};

export default ProjectKnowledgeTab;
