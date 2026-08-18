// External libraries
import React, { Suspense, lazy } from 'react';
import { Route, Routes, useParams } from 'react-router-dom';

// Project pages
import { ProjectsHomePage } from './pages';

// Project workspace components (tabbed workspaces that reuse existing modules)
import { RequirementsWorkspace } from './components/RequirementsWorkspace';
import { ExecutionWorkspace } from './components/ExecutionWorkspace';
import { TestDataWorkspace } from './components/TestDataWorkspace';

// Existing module pages reused directly inside the workspace
import { ApiExecutionPage } from '../api-execution';
import { EnvironmentPage } from '../environment/pages/EnvironmentPage';
import { KnowledgePage } from '../knowledge/pages/KnowledgePage';
import { ReportRoutes } from '../report/routes';

// Lazy load Administration and Developer Tools modules
const RecommendationsPage = lazy(() => import('../recommendation/pages/RecommendationsPage').then(m => ({ default: m.RecommendationsPage })));
const PipelinePage = lazy(() => import('../pipeline/pages/PipelinePage').then(m => ({ default: m.PipelinePage })));
const NotificationPage = lazy(() => import('../notification/pages').then(m => ({ default: m.NotificationPage })));
const VersionHistoryPage = lazy(() => import('../versioning/pages').then(m => ({ default: m.VersionHistoryPage })));
const AuditLogPage = lazy(() => import('../audit/pages').then(m => ({ default: m.AuditLogPage })));
const PluginManagementPage = lazy(() => import('../plugin/pages').then(m => ({ default: m.PluginManagementPage })));
const AIProviderManagementPage = lazy(() => import('../ai-provider/pages').then(m => ({ default: m.AIProviderManagementPage })));
const ProjectContextPage = lazy(() => import('../context/pages').then(m => ({ default: m.ProjectContextPage })));
const PromptBuilderPage = lazy(() => import('../prompt/pages').then(m => ({ default: m.PromptBuilderPage })));

// Project store
import { projectStore } from '../../store/projectStore';

// Project overview dashboard (existing component)
import { PipelineDashboard } from './components/PipelineDashboard';
import { projectModules } from '../../routes/paths';

// Simple loading fallback for lazy routes
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="text-lg">Loading...</div>
  </div>
);

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
  const ProjectReportPage = () => <ReportRoutes />;
  const ProjectRecommendationsPage = () => <RecommendationsPage />;
  const ProjectNotificationPage = () => <NotificationPage />;
  const ProjectVersionHistoryPage = () => <VersionHistoryPage />;
  const ProjectAuditLogPage = () => <AuditLogPage />;
  const ProjectPluginManagementPage = () => <PluginManagementPage />;

  return (
    <Routes>
      {/* Primary workflow */}
      <Route path={projectModules.overview} element={<PipelineDashboard projectId={projectId} />} />
      <Route path={projectModules.apis} element={<ApiExecutionPage />} />
      <Route path={projectModules.apiExecution} element={<ApiExecutionPage />} />
      <Route path={projectModules.environment} element={<ProjectEnvironmentPage />} />
      <Route path={`${projectModules.testData}/*`} element={<TestDataWorkspace projectId={projectId} />} />
      <Route path={projectModules.knowledge} element={<ProjectKnowledgePage />} />
      <Route path={`${projectModules.requirements}/*`} element={<RequirementsWorkspace projectId={projectId} />} />
      <Route path={`${projectModules.execution}/*`} element={<ExecutionWorkspace projectId={projectId} />} />
      <Route path={`${projectModules.reports}/*`} element={<ProjectReportPage />} />

      {/* Administration */}
      <Route path={projectModules.recommendations} element={<ProjectRecommendationsPage />} />
      <Route path={projectModules.pipeline} element={<PipelinePage projectId={projectId} />} />
      <Route path={projectModules.notifications} element={<ProjectNotificationPage />} />
      <Route path={projectModules.versions} element={<ProjectVersionHistoryPage />} />
      <Route path={projectModules.audit} element={<ProjectAuditLogPage />} />
      <Route path={projectModules.plugins} element={<ProjectPluginManagementPage />} />
      <Route path={projectModules.aiProviders} element={<AIProviderManagementPage projectId={projectId} />} />

      {/* Developer Tools */}
      <Route path={projectModules.context} element={<ProjectContextPage projectId={projectId} />} />
      <Route path={projectModules.prompts} element={<PromptBuilderPage projectId={projectId} />} />

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
