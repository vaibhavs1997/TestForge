import React from 'react';
import { useParams } from 'react-router-dom';
import { ProjectApiTab } from './ProjectApiTab';
import { ProjectEnvironmentTab } from './ProjectEnvironmentTab';
import { ProjectTestDataTab } from './ProjectTestDataTab';
import { ProjectKnowledgeTab } from './ProjectKnowledgeTab';
import { ProjectRequirementsTab } from './ProjectRequirementsTab';
import { ProjectExecutionTab } from './ProjectExecutionTab';
import { ProjectReportsTab } from './ProjectReportsTab';
import { ProjectOverviewTab } from './ProjectOverviewTab';
import { RecommendationsPage } from '../../recommendation/pages/RecommendationsPage';
import { SuiteRoutes } from '../../suite';
import { AnalysisRoutes } from '../../analysis';
import { PipelineRoutes } from '../../pipeline';
import { SchedulerRoutes } from '../../scheduler';
import { NotificationRoutes } from '../../notification';
import { VersioningRoutes } from '../../versioning';
import { AuditRoutes } from '../../audit';
import { ContextRoutes } from '../../context';
import { PromptRoutes } from '../../prompt';
import { AIProviderRoutes } from '../../ai-provider';

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
  'recommendations',
  'suites',
  'analysis',
  'pipeline',
  'scheduler',
  'notifications',
  'versions',
  'audit',
  'context',
  'prompts',
  'ai-providers',
] as const;

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ projectId, projectName }) => {
  const params = useParams();
  const wildcardTab = params['*'] || '';
  const tab = wildcardTab.split('/')[0] || 'overview';

  const validTab = TAB_KEYS as readonly string[];
  const activeTab = validTab.includes(tab) ? tab : 'overview';

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
      case 'recommendations':
        return <RecommendationsPage />;
      case 'suites':
        return <SuiteRoutes />;
      case 'analysis':
        return <AnalysisRoutes />;
      case 'pipeline':
        return <PipelineRoutes />;
      case 'scheduler':
        return <SchedulerRoutes />;
      case 'notifications':
        return <NotificationRoutes />;
      case 'versions':
        return <VersioningRoutes />;
      case 'audit':
        return <AuditRoutes />;
      case 'context':
        return <ContextRoutes />;
      case 'prompts':
        return <PromptRoutes />;
      case 'ai-providers':
        return <AIProviderRoutes />;
      default:
        return <ProjectOverviewTab projectId={projectId} projectName={projectName} />;
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ProjectWorkspace;