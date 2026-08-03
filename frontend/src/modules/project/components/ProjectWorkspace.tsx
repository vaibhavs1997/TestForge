import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ProjectApiTab } from './ProjectApiTab';
import { ProjectEnvironmentTab } from './ProjectEnvironmentTab';
import { ProjectTestDataTab } from './ProjectTestDataTab';
import { ProjectKnowledgeTab } from './ProjectKnowledgeTab';
import { ProjectRequirementsTab } from './ProjectRequirementsTab';
import { ProjectExecutionTab } from './ProjectExecutionTab';
import { ProjectReportsTab } from './ProjectReportsTab';
import { ProjectOverviewTab } from './ProjectOverviewTab';

interface ProjectWorkspaceProps {
  projectId: string;
  projectName?: string;
}

const TAB_KEYS = [
  'overview',
  'apis',
  'environment',
  'testdata',
  'knowledge',
  'requirements',
  'execution',
  'reports',
] as const;

const TAB_LABELS: Record<string, string> = {
  overview: 'Overview',
  apis: 'APIs',
  environment: 'Environment',
  testdata: 'Test Data',
  knowledge: 'Knowledge',
  requirements: 'Requirements',
  execution: 'Execution',
  reports: 'Reports',
};

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ projectId, projectName }) => {
  const navigate = useNavigate();
  const params = useParams();
  const wildcardTab = params['*'] || '';
  const tab = wildcardTab.split('/')[0] || 'overview';

  const validTab = TAB_KEYS as readonly string[];
  const activeTab = validTab.includes(tab) ? tab : 'overview';

  const handleTabChange = (tabKey: string) => {
    navigate(`/projects/${projectId}/${tabKey}`);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <ProjectOverviewTab projectId={projectId} projectName={projectName} />;
      case 'apis':
        return <ProjectApiTab projectId={projectId} />;
      case 'environment':
        return <ProjectEnvironmentTab projectId={projectId} />;
      case 'testdata':
        return <ProjectTestDataTab projectId={projectId} />;
      case 'knowledge':
        return <ProjectKnowledgeTab projectId={projectId} />;
      case 'requirements':
        return <ProjectRequirementsTab projectId={projectId} />;
      case 'execution':
        return <ProjectExecutionTab projectId={projectId} />;
      case 'reports':
        return <ProjectReportsTab projectId={projectId} />;
      default:
        return <ProjectOverviewTab projectId={projectId} projectName={projectName} />;
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-surface">
        <nav className="flex overflow-x-auto">
          {TAB_KEYS.map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => handleTabChange(tabKey)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${
                activeTab === tabKey
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:border-border hover:text-text'
              }`}
            >
              {TAB_LABELS[tabKey]}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ProjectWorkspace;