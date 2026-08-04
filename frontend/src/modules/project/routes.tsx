// External libraries
import React from 'react';
import { Route, Routes, useParams } from 'react-router-dom';

// Project pages
import { ProjectsHomePage } from './pages';

// Project workspace components (tabbed workspaces that reuse existing modules)
import { RequirementsWorkspace } from './components/RequirementsWorkspace';
import { ExecutionWorkspace } from './components/ExecutionWorkspace';
import { TestDataWorkspace } from './components/TestDataWorkspace';

// Existing module pages reused directly inside the workspace
import { ApiRoutes } from '../api';
import { EnvironmentPage } from '../environment/pages/EnvironmentPage';
import { KnowledgePage } from '../knowledge/pages/KnowledgePage';
import { ReportPage } from '../report/pages/ReportPage';
import { RecommendationsPage } from '../recommendation/pages/RecommendationsPage';
import { PipelinePage } from '../pipeline/pages/PipelinePage';
import { NotificationPage } from '../notification/pages';
import { VersionHistoryPage } from '../versioning/pages';
import { AuditLogPage } from '../audit/pages';
import { PluginManagementPage } from '../plugin/pages';
import { AIProviderManagementPage } from '../ai-provider/pages';
import { ProjectContextPage } from '../context/pages';
import { PromptBuilderPage } from '../prompt/pages';

// Project store
import { projectStore } from '../../store/projectStore';

// Project overview dashboard (existing component)
import { PipelineDashboard } from './components/PipelineDashboard';

/**
 * Single Project Workspace.
 *
 * Every project route renders through this component. It mounts the existing
 * module routes/pages directly - no wrappers, no placeholders, no duplicates.
 */
const ProjectWorkspace: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const setSelectedProjectId = projectStore((state) => state.setSelectedProjectId);

  React.useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId, setSelectedProjectId]);

  if (!projectId) return <ProjectsHomePage />;

  // Wrapper components that pass projectId as a prop to pages that use useParams
  const ProjectEnvironmentPage = () => <EnvironmentPage />;
  const ProjectKnowledgePage = () => <KnowledgePage />;
  const ProjectReportPage = () => <ReportPage />;
  const ProjectRecommendationsPage = () => <RecommendationsPage />;
  const ProjectNotificationPage = () => <NotificationPage />;
  const ProjectVersionHistoryPage = () => <VersionHistoryPage />;
  const ProjectAuditLogPage = () => <AuditLogPage />;
  const ProjectPluginManagementPage = () => <PluginManagementPage />;

  return (
    <Routes>
      {/* Primary workflow */}
      <Route path='overview' element={<PipelineDashboard projectId={projectId} />} />
      <Route path='apis' element={<ApiRoutes />} />
      <Route path='environment' element={<ProjectEnvironmentPage />} />
      <Route path='testdata/*' element={<TestDataWorkspace projectId={projectId} />} />
      <Route path='knowledge' element={<ProjectKnowledgePage />} />
      <Route path='requirements/*' element={<RequirementsWorkspace projectId={projectId} />} />
      <Route path='execution/*' element={<ExecutionWorkspace projectId={projectId} />} />
      <Route path='reports/*' element={<ProjectReportPage />} />

      {/* Administration */}
      <Route path='recommendations' element={<ProjectRecommendationsPage />} />
      <Route path='pipeline' element={<PipelinePage projectId={projectId} />} />
      <Route path='notifications' element={<ProjectNotificationPage />} />
      <Route path='versions' element={<ProjectVersionHistoryPage />} />
      <Route path='audit' element={<ProjectAuditLogPage />} />
      <Route path='plugins' element={<ProjectPluginManagementPage />} />
      <Route path='ai-providers' element={<AIProviderManagementPage projectId={projectId} />} />

      {/* Developer Tools */}
      <Route path='context' element={<ProjectContextPage projectId={projectId} />} />
      <Route path='prompts' element={<PromptBuilderPage projectId={projectId} />} />

      {/* Default to overview */}
      <Route index element={<PipelineDashboard projectId={projectId} />} />
    </Routes>
  );
};

export const ProjectRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path='/' element={<ProjectsHomePage />} />
      <Route path=':projectId/*' element={<ProjectWorkspace />} />
    </Routes>
  );
};

export default ProjectRoutes;