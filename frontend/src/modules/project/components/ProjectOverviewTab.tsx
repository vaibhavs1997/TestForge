import React from 'react';
import { PipelineDashboard } from './PipelineDashboard';

interface ProjectOverviewTabProps {
  projectId?: string;
  projectName?: string;
}

export const ProjectOverviewTab: React.FC<ProjectOverviewTabProps> = ({ projectId, projectName }) => {
  if (!projectId) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Project Overview</h2>
        <p className="text-sm text-text-secondary">Select a project to view its pipeline dashboard.</p>
      </div>
    );
  }

  return <PipelineDashboard projectId={projectId} projectName={projectName} />;
};

export default ProjectOverviewTab;